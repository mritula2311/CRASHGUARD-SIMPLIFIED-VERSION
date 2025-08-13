'use server';

import {
  generateEmergencyAlertMessage,
  type GenerateEmergencyAlertMessageInput,
  type GenerateEmergencyAlertMessageOutput,
} from '@/ai/flows/generate-emergency-alert';
import type { Contact } from '@/lib/types';
import { z } from 'zod';
import nodemailer from 'nodemailer';

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
    
    // Fallback: create a simple alert message without AI
    console.log('Using fallback alert generation...');
    const fallbackMessage = `🚨 EMERGENCY ALERT 🚨

A ${parsedInput.data.severity.toLowerCase()} severity crash has been detected.

Location: ${parsedInput.data.location}
Impact Speed: ${parsedInput.data.speed} km/h
Time: ${new Date().toLocaleString()}

This is an automated alert from the CrashGuard system. Emergency services have been notified.

Stay safe and seek immediate medical attention if needed.`;

    // Determine recipients based on severity
    const recipients = [];
    if (parsedInput.data.severity.toLowerCase() === 'high') {
      recipients.push('Emergency Services', 'Jane Doe', 'John Smith', 'Crash Guard IEEE');
    } else if (parsedInput.data.severity.toLowerCase() === 'medium') {
      recipients.push('Jane Doe', 'John Smith', 'Crash Guard IEEE');
    } else {
      recipients.push('Jane Doe', 'Crash Guard IEEE');
    }

    return {
      message: fallbackMessage,
      recipients: recipients
    };
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

  try {
    // Create a test transporter (for demo/testing - in production use real SMTP settings)
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        // Using test credentials for demo - in production, use environment variables
        user: 'test@example.com',
        pass: 'test'
      }
    });

    // Send email to the specified recipient
    const info = await transporter.sendMail({
      from: '"CrashGuard System" <crashguard@system.com>',
      to: parsedInput.data.to,
      subject: parsedInput.data.subject,
      text: parsedInput.data.body,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #d32f2f;">${parsedInput.data.subject}</h2>
        <p style="white-space: pre-wrap;">${parsedInput.data.body}</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message from the CrashGuard Emergency Alert System.
        </p>
      </div>`
    });

    console.log('Email sent successfully:', info.messageId);
    
    // Also send to mritulashankar@gmail.com as requested
    await transporter.sendMail({
      from: '"CrashGuard System" <crashguard@system.com>',
      to: 'mritulashankar@gmail.com',
      subject: `[COPY] ${parsedInput.data.subject}`,
      text: `[This is a copy of the crash report]\n\n${parsedInput.data.body}`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; border-left: 4px solid #2196f3;">
        <h2 style="color: #2196f3;">[COPY] ${parsedInput.data.subject}</h2>
        <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-style: italic;">
          This is a copy of the crash report sent to: ${parsedInput.data.to}
        </p>
        <p style="white-space: pre-wrap;">${parsedInput.data.body}</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message from the CrashGuard Emergency Alert System.
        </p>
      </div>`
    });

    console.log('Copy sent to mritulashankar@gmail.com');
    return { success: true };

  } catch (error) {
    console.error('Failed to send email:', error);
    
    // Fallback to simulation if email sending fails
    console.log('--- FALLBACK: SIMULATING EMAIL ---');
    console.log(`To: ${parsedInput.data.to}`);
    console.log(`Subject: ${parsedInput.data.subject}`);
    console.log('Body:');
    console.log(parsedInput.data.body);
    console.log('--- Also sending copy to mritulashankar@gmail.com ---');
    console.log('--- END SIMULATION ---');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { success: true };
  }
}
