'use server';

/**
 * @fileOverview Generates arrears reports and portfolio summaries from imported Excel data using generative AI.
 *
 * - summarizeArrears - A function that handles the arrears summarization process.
 * - SummarizeArrearsInput - The input type for the summarizeArrears function.
 * - SummarizeArrearsOutput - The return type for the summarizeArrears function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeArrearsInputSchema = z.object({
  excelData: z
    .string()
    .describe("The Excel data to process, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type SummarizeArrearsInput = z.infer<typeof SummarizeArrearsInputSchema>;

const SummarizeArrearsOutputSchema = z.object({
  summary: z.string().describe('A summary of the arrears and portfolio based on the provided Excel data.'),
});
export type SummarizeArrearsOutput = z.infer<typeof SummarizeArrearsOutputSchema>;

export async function summarizeArrears(input: SummarizeArrearsInput): Promise<SummarizeArrearsOutput> {
  return summarizeArrearsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeArrearsPrompt',
  input: {schema: SummarizeArrearsInputSchema},
  output: {schema: SummarizeArrearsOutputSchema},
  prompt: `You are an expert financial analyst specializing in loan portfolio management.

You will analyze the provided loan portfolio data from an Excel file and generate a summary of the arrears and overall portfolio health. Identify key trends, risks, and opportunities.

Use the following Excel data to generate the summary:

Excel Data: {{media url=excelData}}
`,
});

const summarizeArrearsFlow = ai.defineFlow(
  {
    name: 'summarizeArrearsFlow',
    inputSchema: SummarizeArrearsInputSchema,
    outputSchema: SummarizeArrearsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
