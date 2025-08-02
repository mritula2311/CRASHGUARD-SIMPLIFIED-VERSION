'use server';

import {
  generateEmergencyAlertMessage,
  type GenerateEmergencyAlertMessageInput,
  type GenerateEmergencyAlertMessageOutput,
} from '@/ai/flows/generate-emergency-alert';
import { z } from 'zod';

const inputSchema = z.object({
  location: z.string(),
  severity: z.string(),
  speed: z.number(),
  contacts: z.array(z.string()),
});

export async function generateAlert(
  input: GenerateEmergencyAlertMessageInput
): Promise<GenerateEmergencyAlertMessageOutput> {
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) {
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
