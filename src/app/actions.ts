'use server';

import {
  generateEmergencyAlertMessage,
  type GenerateEmergencyAlertMessageInput,
  type GenerateEmergencyAlertMessageOutput,
} from '@/ai/flows/generate-emergency-alert';
import type { Contact } from '@/lib/types';
import { z } from 'zod';
import { sendCrashAlertViaPython, testPythonEmailSystem } from '@/services/python-email-service';

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

export async function sendEmail(input: EmailInput, crashDataContext?: any): Promise<{ success: boolean }> {
  const parsedInput = emailSchema.safeParse(input);
  if (!parsedInput.success) {
    console.error('Invalid input for sending email:', parsedInput.error);
    throw new Error('Invalid input for sending email.');
  }

  // Use the enhanced Python email service with DRQN analysis
  console.log('Sending crash alert with DRQN analysis via Python service...');
  try {
    const result = await sendCrashAlertViaPython(
      parsedInput.data.body,
      crashDataContext?.location ? {
        latitude: 0, 
        longitude: 0, 
        accuracy: 100,
        timestamp: new Date().toISOString()
      } : undefined,
      crashDataContext
    );
    
    if (result.success) {
      console.log('Professional crash alert with DRQN analysis sent successfully!');
      console.log('Reference Code:', result.reference_code);
      return { success: true };
    } else {
      console.error('Enhanced Python email service failed:', result.error);
      return { success: false };
    }
  } catch (error) {
    console.error('Enhanced Python email service error:', error);
    return { success: false };
  }
}

/**
 * Test Python email system action
 */
export async function testPythonEmail(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    console.log('Testing enhanced Python email system with DRQN analysis...');
    
    const result = await testPythonEmailSystem();
    
    return result;
    
  } catch (error) {
    console.error('Error testing enhanced Python email system:', error);
    return {
      success: false,
      error: `Enhanced test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}