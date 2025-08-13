'use server';

import {
  generateEmergencyAlertMessage,
  type GenerateEmergencyAlertMessageInput,
  type GenerateEmergencyAlertMessageOutput,
} from '@/ai/flows/generate-emergency-alert';
import type { Contact } from '@/lib/types';
import { z } from 'zod';

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

export async function sendEmail(input: EmailInput): Promise<{ success: boolean }> {
  const parsedInput = emailSchema.safeParse(input);
  if (!parsedInput.success) {
    console.error('Invalid input for sending email:', parsedInput.error);
    throw new Error('Invalid input for sending email.');
  }

  // In a real application, you would use an email sending service like SendGrid, Nodemailer, etc.
  // For this simulation, we'll just log the email to the console.
  console.log('--- SIMULATING EMAIL ---');
  console.log(`To: ${parsedInput.data.to}`);
  console.log(`Subject: ${parsedInput.data.subject}`);
  console.log('Body:');
  console.log(parsedInput.data.body);
  console.log('--- END SIMULATING EMAIL ---');
  
  // Simulate network delay for sending email
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { success: true };
}
