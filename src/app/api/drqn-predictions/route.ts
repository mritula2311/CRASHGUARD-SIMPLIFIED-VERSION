import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Cache for the latest prediction to avoid calling Python service too frequently
let cachedPrediction: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 2000; // 2 seconds cache

async function callPythonDRQNService(): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'thingspeak_drqn_service.py');
    const python = spawn('python', [pythonScript, '--single', '--quiet'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'ignore'] // Ignore stderr to prevent any logging leakage
    });

    let stdout = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          // Only try to parse if we have output
          const trimmedOutput = stdout.trim();
          if (!trimmedOutput) {
            reject(new Error('No output from Python script'));
            return;
          }
          
          // Try to parse the entire output as JSON first
          try {
            const jsonData = JSON.parse(trimmedOutput);
            resolve(jsonData);
            return;
          } catch (e) {
            // If that fails, look for JSON lines
            const lines = trimmedOutput.split('\n');
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
                try {
                  const jsonData = JSON.parse(trimmedLine);
                  resolve(jsonData);
                  return;
                } catch (e2) {
                  continue;
                }
              }
            }
            reject(new Error('No valid JSON found in Python output'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error}`));
        }
      } else {
        reject(new Error(`Python script failed with code ${code}`));
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });
  });
}

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    
    // Use cached prediction if available and recent
    if (cachedPrediction && (now - lastFetchTime) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cachedPrediction,
        source: 'drqn_model_cached',
        cached: true,
        model_info: {
          name: 'DRQN (LSTM-DQN)',
          version: 'drqn_v0.1',
          training_data: 'ThingSpeak Live Data',
          epochs: 40,
          input_features: 10,
          actions: 4
        }
      });
    }

    // Try to get fresh prediction from Python service
    try {
      const prediction = await callPythonDRQNService();
      
      // Update cache
      cachedPrediction = prediction;
      lastFetchTime = now;

      return NextResponse.json({
        success: true,
        data: prediction,
        source: 'drqn_model_live',
        cached: false,
        model_info: {
          name: 'DRQN (LSTM-DQN)',
          version: 'drqn_v0.1',
          training_data: 'ThingSpeak Live Data',
          epochs: 40,
          input_features: 10,
          actions: 4
        }
      });

    } catch (pythonError) {
      console.error('Python DRQN service failed:', pythonError);
      
      return NextResponse.json({
        success: false,
        error: 'DRQN service unavailable',
        details: 'ThingSpeak DRQN service is not responding',
        message: 'Please check ThingSpeak connection and model service',
        service_status: 'offline',
        model_info: {
          name: 'DRQN (LSTM-DQN)',
          version: 'drqn_v0.1',
          training_data: 'ThingSpeak Live Data',
          epochs: 40,
          input_features: 10,
          actions: 4
        }
      }, { status: 503 });
    }

  } catch (error) {
    console.error('DRQN prediction API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get DRQN predictions',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
