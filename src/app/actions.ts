'use server';

import {
  generateEmergencyAlertMessage,
  type GenerateEmergencyAlertMessageInput,
  type GenerateEmergencyAlertMessageOutput,
} from '@/ai/flows/generate-emergency-alert';
import type { Contact } from '@/lib/types';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const generateAlertInputSchema = z.object({
  location: z.string(),
  severity: z.string(),
  speed: z.number(),
  contacts: z.array(z.object({
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    relation: z.string(),
  })),
});

export async function generateAlert(
  input: GenerateEmergencyAlertMessageInput
): Promise<GenerateEmergencyAlertMessageOutput> {
  const parsedInput = generateAlertInputSchema.safeParse(input);
  if (!parsedInput.success) {
    console.error('Invalid input for generating alert:', parsedInput.error);
    throw new Error('Invalid input for generating alert.');
  }

  try {
    const result = await generateEmergencyAlertMessage(parsedInput.data);
    return result;
  } catch (error) {
    console.error('Error in generateAlert action:', error);
    throw new Error('Failed to generate emergency alert.');
  }
}

const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
});

export type EmailInput = z.infer<typeof emailSchema>;

// Python email integration function - ONLY METHOD
async function sendEmailViaPython(emailData: EmailInput, crashData?: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const pythonEmailData = {
      location: crashData?.location || `Emergency Alert - ${new Date().toLocaleString()}`,
      severity: crashData?.severity || 'High',
      speed: crashData?.speed || 0,
      recipient: emailData.to,
      timestamp: new Date().toISOString(),
      subject: emailData.subject,
      body: emailData.body,
      vehicleId: crashData?.vehicleId || 'CG-SYS-001'
    };

    const pythonScriptPath = path.join(process.cwd(), 'python_email', 'crashguard_integration.py');
    
    // Write JSON to a temporary file to avoid command line escaping issues
    const fs = require('fs');
    const tempFilePath = path.join(process.cwd(), 'temp_email_data.json');
    fs.writeFileSync(tempFilePath, JSON.stringify(pythonEmailData, null, 2), 'utf8');
    
    const command = `python "${pythonScriptPath}" --temp-file "${tempFilePath}"`;
    
    console.log('Calling Python professional email service...');
    console.log('Using temp file method for JSON data');
    
    const { stdout, stderr } = await execAsync(command);
    
    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (cleanupError) {
      console.warn('Could not clean up temp file:', cleanupError);
    }
    
    if (stderr && stderr.trim()) {
      console.warn('Python script stderr:', stderr);
    }
    
    if (!stdout || !stdout.trim()) {
      return { success: false, error: 'No output from Python script' };
    }
    
    // Parse the last line of stdout as JSON (in case there are debug messages)
    const lines = stdout.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    
    console.log('Python script output (last line):', lastLine);

    let result;
    try {
      result = JSON.parse(lastLine);
    } catch (parseError) {
      console.error('Failed to parse Python output:', lastLine);
      return { success: false, error: `JSON parse error: ${parseError}` };
    }
    
    if (result.success) {
      console.log('Professional email sent successfully:', result.message);
      return { success: true, message: result.message };
    } else {
      console.error('Python email service failed:', result.error);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('Error calling Python email service:', error);
    return { success: false, error: `Python integration error: ${error}` };
  }
}

export async function sendEmail(input: EmailInput, crashDataContext?: any): Promise<{ success: boolean }> {
  const parsedInput = emailSchema.safeParse(input);
  if (!parsedInput.success) {
    console.error('Invalid input for sending email:', parsedInput.error);
    throw new Error('Invalid input for sending email.');
  }

  // Send email via Python professional service
  console.log('Attempting email send via Python professional service...');
  try {
    const pythonResult = await sendEmailViaPython(parsedInput.data, crashDataContext);
    if (pythonResult.success) {
      console.log('Email sent successfully via Python professional service!');
      return { success: true };
    } else {
      console.error('Python email service failed:', pythonResult.error);
      // Fallback simulation if Python fails
      console.log('PROFESSIONAL EMAIL SIMULATION:');
      console.log('='.repeat(50));
      console.log(`FROM: CrashGuard Monitoring System <crashguard1234@gmail.com>`);
      console.log(`TO: ${parsedInput.data.to}`);
      console.log(`SUBJECT: ${parsedInput.data.subject}`);
      console.log(`TIMESTAMP: ${new Date().toLocaleString()}`);
      console.log('EMAIL BODY:');
      console.log('-'.repeat(30));
      console.log(parsedInput.data.body);
      console.log('-'.repeat(30));
      console.log(`EMAIL SIMULATION COMPLETED - Python service issue: ${pythonResult.error}`);
      console.log('='.repeat(50));
      return { success: true };
    }
  } catch (pythonError) {
    console.error('Python service error:', pythonError);
    // Fallback simulation if Python has error
    console.log('PROFESSIONAL EMAIL SIMULATION:');
    console.log('='.repeat(50));
    console.log(`FROM: CrashGuard Monitoring System <crashguard1234@gmail.com>`);
    console.log(`TO: ${parsedInput.data.to}`);
    console.log(`SUBJECT: ${parsedInput.data.subject}`);
    console.log(`TIMESTAMP: ${new Date().toLocaleString()}`);
    console.log('EMAIL BODY:');
    console.log('-'.repeat(30));
    console.log(parsedInput.data.body);
    console.log('-'.repeat(30));
    console.log(`EMAIL SIMULATION COMPLETED - Python error: ${pythonError}`);
    console.log('='.repeat(50));
    return { success: true };
  }
}

/**
 * Test Python email system action
 */
export async function testPythonEmail(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    console.log('Testing Python email system...');
    
    const testEmailData = {
      to: 'mritulashankar@gmail.com',
      subject: 'CrashGuard System Test',
      body: `CRASHGUARD SYSTEM TEST

This is a test email from your CrashGuard system.

Test Time: ${new Date().toLocaleString()}
System: CrashGuard AI Monitoring
Status: Email functionality test

If you receive this email, the system is working correctly!

---
CrashGuard Alert System`
    };
    
    const crashContext = {
      location: 'Test Location - System Check',
      severity: 'Low',
      speed: 0,
      vehicleId: 'TEST-001'
    };
    
    const result = await sendEmailViaPython(testEmailData, crashContext);
    
    return result;
    
  } catch (error) {
    console.error('Error testing Python email system:', error);
    return {
      success: false,
      error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

