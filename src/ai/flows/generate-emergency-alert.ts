'use server';

/**
 * @fileOverview Generates an emergency alert message with crash details.
 *
 * - generateEmergencyAlertMessage - A function that generates the emergency alert message.
 * - GenerateEmergencyAlertMessageInput - The input type for the generateEmergencyAlertMessage function.
 * - GenerateEmergencyAlertMessageOutput - The return type for the generateEmergencyAlertMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContactSchema = z.object({
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  relation: z.string(),
});

const GenerateEmergencyAlertMessageInputSchema = z.object({
  location: z.string().describe('The GPS coordinates of the crash location.'),
  severity: z
    .string()
    .describe('The severity of the crash (e.g., low, medium, high).'),
  speed: z
    .number()
    .describe('The speed of the vehicle at the time of the crash (in km/h).'),
  contacts: z
    .array(ContactSchema)
    .describe('List of emergency contacts with their details.'),
});
export type GenerateEmergencyAlertMessageInput = z.infer<
  typeof GenerateEmergencyAlertMessageInputSchema
>;

const GenerateEmergencyAlertMessageOutputSchema = z.object({
  message: z.string().describe('The generated emergency alert message.'),
  recipients: z
    .array(z.string())
    .describe(
      'List of names of recipients for the alert message. This should be a subset of the names from the input contacts.'
    ),
});
export type GenerateEmergencyAlertMessageOutput = z.infer<
  typeof GenerateEmergencyAlertMessageOutputSchema
>;

export async function generateEmergencyAlertMessage(
  input: GenerateEmergencyAlertMessageInput
): Promise<GenerateEmergencyAlertMessageOutput> {
  return generateEmergencyAlertMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEmergencyAlertMessagePrompt',
  input: {schema: GenerateEmergencyAlertMessageInputSchema},
  output: {schema: GenerateEmergencyAlertMessageOutputSchema},
  prompt: `You are an AI assistant that generates emergency alert messages based on crash details.

  Given the following crash details:
  - Location: {{{location}}}
  - Severity: {{{severity}}}
  - Speed: {{{speed}}} km/h

  And the following emergency contacts:
  {{#each contacts}}
  - Name: {{name}}, Phone: {{phone}}, Email: {{email}}, Relation: {{relation}}
  {{/each}}

  Generate a concise emergency alert message that includes the location, severity, and speed of the crash.  Based on the severity of the crash, choose which contacts from the list of available contacts should receive the message. Always include the location.
  For high severity, alert emergency services and all other contacts. For medium severity, alert family and close friends. For low severity, alert only the primary contact (e.g., spouse or father). If a contact has the relation 'Test Contact', always include them in the recipients for any severity level.

  Respond with the generated message and the list of recipients' names who should receive the message.

  Ensure that the location is included in the message, as it is critical for emergency responders.
  Do not include any personally identifiable information in the message other than the location.

  Ensure that the recipients field contains a subset of the names of the contacts from the input.
  `,
});

const generateEmergencyAlertMessageFlow = ai.defineFlow(
  {
    name: 'generateEmergencyAlertMessageFlow',
    inputSchema: GenerateEmergencyAlertMessageInputSchema,
    outputSchema: GenerateEmergencyAlertMessageOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
