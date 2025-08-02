'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting alert recipients based on crash severity.
 *
 * The flow takes crash severity as input and returns a list of suggested recipients.
 * - suggestAlertRecipients - A function that suggests alert recipients based on crash severity.
 * - SuggestAlertRecipientsInput - The input type for the suggestAlertRecipients function.
 * - SuggestAlertRecipientsOutput - The return type for the suggestAlertRecipients function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAlertRecipientsInputSchema = z.object({
  crashSeverity: z
    .string()
    .describe("The severity of the crash (e.g., 'minor', 'moderate', 'severe')."),
});
export type SuggestAlertRecipientsInput = z.infer<typeof SuggestAlertRecipientsInputSchema>;

const SuggestAlertRecipientsOutputSchema = z.object({
  suggestedRecipients: z
    .array(z.string())
    .describe('A list of suggested recipients for the emergency alert.'),
});
export type SuggestAlertRecipientsOutput = z.infer<typeof SuggestAlertRecipientsOutputSchema>;

export async function suggestAlertRecipients(
  input: SuggestAlertRecipientsInput
): Promise<SuggestAlertRecipientsOutput> {
  return suggestAlertRecipientsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAlertRecipientsPrompt',
  input: {schema: SuggestAlertRecipientsInputSchema},
  output: {schema: SuggestAlertRecipientsOutputSchema},
  prompt: `Based on the crash severity of {{{crashSeverity}}}, suggest appropriate recipients for an emergency alert.  Consider the following:

*   If the severity is 'minor', suggest immediate family members.
*   If the severity is 'moderate', suggest immediate family members and close friends.
*   If the severity is 'severe', suggest immediate family members, close friends, and emergency services.

Respond with a list of suggested recipients.

{
  "suggestedRecipients": ["Recipient 1", "Recipient 2", ...]
}
`,
});

const suggestAlertRecipientsFlow = ai.defineFlow(
  {
    name: 'suggestAlertRecipientsFlow',
    inputSchema: SuggestAlertRecipientsInputSchema,
    outputSchema: SuggestAlertRecipientsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
