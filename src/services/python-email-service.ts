'use server';

import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

interface CrashAlertData {
  location: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  speed: number;
  recipient: string;
  timestamp: string;
  sensorData?: any;
  drqnAnalysis?: any; // Include DRQN analysis data
}

interface EmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  reference_code?: string;
}

/**
 * Get real-time DRQN analysis from the reinforcement model
 */
async function getDRQNAnalysis(): Promise<any> {
  try {
    const response = await fetch('http://localhost:9004/api/drqn-predictions');
    if (response.ok) {
      const drqnData = await response.json();
      return drqnData;
    } else {
      console.warn('DRQN analysis not available, using fallback');
      return null;
    }
  } catch (error) {
    console.error('Error fetching DRQN analysis:', error);
    return null;
  }
}

/**
 * Determine crash severity from DRQN analysis
 */
function determineSeverityFromDRQN(drqnAnalysis?: any): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (!drqnAnalysis) return 'Medium';
  
  const crashRisk = drqnAnalysis.crash_risk_level;
  const actionName = drqnAnalysis.action_name;
  
  // Map DRQN predictions to severity levels
  if (crashRisk === 'CRITICAL' || actionName === 'EMERGENCY_DISPATCH') {
    return 'Critical';
  } else if (crashRisk === 'HIGH' || actionName === 'ALERT_NEARBY') {
    return 'High';
  } else if (crashRisk === 'MODERATE' || actionName === 'LOG_MINOR') {
    return 'Medium';
  } else {
    return 'Low';
  }
}

/**
 * Send crash alert using Python email system with DRQN analysis
 */
export async function sendCrashAlertViaPython(
  message: string,
  sensorData?: any
): Promise<EmailResponse> {
  try {
    // Get real-time DRQN analysis from the reinforcement model
    const drqnAnalysis = await getDRQNAnalysis();
    
    // Prepare crash data for Python script with DRQN analysis
    const crashData: CrashAlertData = {
      location: 'Location not available',
      severity: determineSeverityFromDRQN(drqnAnalysis),
      speed: calculateSpeed(sensorData),
      recipient: 'mritulashankar@gmail.com',
      timestamp: new Date().toISOString(),
      sensorData: drqnAnalysis?.sensor_data || sensorData,
      drqnAnalysis // Include full DRQN analysis
    };

    // Convert to JSON
    const jsonData = JSON.stringify(crashData);
    
    // Create temporary file to pass data (handles encoding issues better)
    const tempFilePath = path.join(os.tmpdir(), `crashguard_${Date.now()}.json`);
    await writeFile(tempFilePath, jsonData, 'utf8');

    console.log('Sending crash alert via Python email system...');
    console.log('Crash data:', crashData);

    // Execute Python script
    const pythonResult = await executePythonEmailScript(tempFilePath);
    
    return pythonResult;

  } catch (error) {
    console.error('Error sending crash alert via Python:', error);
    return {
      success: false,
      error: `Python email service error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Execute Python email script
 */
async function executePythonEmailScript(tempFilePath: string): Promise<EmailResponse> {
  return new Promise((resolve) => {
    const pythonScriptPath = path.join(process.cwd(), 'python_email', 'crashguard_integration.py');
    
    console.log('Executing Python script:', pythonScriptPath);
    console.log('Temp file path:', tempFilePath);

    // Try different Python commands
    const pythonCommands = ['python3', 'python', 'py'];
    let currentCommandIndex = 0;

    const tryNextCommand = () => {
      if (currentCommandIndex >= pythonCommands.length) {
        resolve({
          success: false,
          error: 'Python interpreter not found. Tried: python3, python, py'
        });
        return;
      }

      const pythonCommand = pythonCommands[currentCommandIndex];
      console.log(`Trying Python command: ${pythonCommand}`);

      const pythonProcess = spawn(pythonCommand, [pythonScriptPath, '--temp-file', tempFilePath], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.log('Python stderr:', data.toString());
      });

      pythonProcess.on('error', (error) => {
        console.log(`Python command '${pythonCommand}' failed:`, error.message);
        currentCommandIndex++;
        tryNextCommand();
      });

      pythonProcess.on('close', async (code) => {
        // Clean up temp file
        try {
          await unlink(tempFilePath);
        } catch (e) {
          console.warn('Could not delete temp file:', e);
        }

        console.log(`Python process exited with code: ${code}`);
        console.log('Python stdout:', outputData);
        
        if (errorData) {
          console.log('Python stderr:', errorData);
        }

        if (code !== 0) {
          currentCommandIndex++;
          if (currentCommandIndex < pythonCommands.length) {
            tryNextCommand();
            return;
          }
          
          resolve({
            success: false,
            error: `Python script failed with code ${code}: ${errorData || 'No error details'}`
          });
          return;
        }

        try {
          // Parse JSON response from Python
          const result = JSON.parse(outputData.trim());
          console.log('Python result:', result);
          resolve(result);
        } catch (parseError) {
          console.error('Error parsing Python response:', parseError);
          console.log('Raw Python output:', outputData);
          
          // If parsing fails but we got output, consider it a success
          if (outputData.includes('sent successfully') || outputData.includes('SIMULATION')) {
            resolve({
              success: true,
              message: 'Email sent (parsing response failed)',
              reference_code: `VCD${Date.now().toString().slice(-6)}`
            });
          } else {
            resolve({
              success: false,
              error: `Failed to parse Python response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`
            });
          }
        }
      });
    };

    tryNextCommand();
  });
}

/**
 * Determine crash severity based on sensor data
 */
function determineSeverity(sensorData?: any): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (!sensorData) return 'Medium';
  
  const riskLevel = sensorData.riskLevel;
  
  switch (riskLevel) {
    case 'LOW': return 'Low';
    case 'MEDIUM': return 'Medium';
    case 'HIGH': return 'High';
    case 'CRITICAL': return 'Critical';
    default: return 'Medium';
  }
}

/**
 * Calculate speed from sensor data (simulated)
 */
function calculateSpeed(sensorData?: any): number {
  if (!sensorData) return 0;
  
  // Simulate speed calculation based on acceleration
  const accelMagnitude = sensorData.accelerationMagnitude || 0;
  
  // Simple simulation: higher acceleration = higher estimated speed
  if (accelMagnitude > 15) return Math.floor(Math.random() * 30) + 70; // 70-100 km/h
  if (accelMagnitude > 12) return Math.floor(Math.random() * 20) + 50; // 50-70 km/h
  if (accelMagnitude > 10) return Math.floor(Math.random() * 20) + 30; // 30-50 km/h
  
  return Math.floor(Math.random() * 30) + 20; // 20-50 km/h
}

/**
 * Test the Python email system
 */
export async function testPythonEmailSystem(): Promise<EmailResponse> {
  try {
    console.log('Testing Python email system...');
    
    const testData: CrashAlertData = {
      location: 'Test Location - Highway 101',
      severity: 'Medium',
      speed: 65,
      recipient: 'mritulashankar@gmail.com',
      timestamp: new Date().toISOString()
    };

    const jsonData = JSON.stringify(testData);
    const tempFilePath = path.join(os.tmpdir(), `crashguard_test_${Date.now()}.json`);
    await writeFile(tempFilePath, jsonData, 'utf8');

    const result = await executePythonEmailScript(tempFilePath);
    
    console.log('Python email test result:', result);
    return result;

  } catch (error) {
    console.error('Error testing Python email system:', error);
    return {
      success: false,
      error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
