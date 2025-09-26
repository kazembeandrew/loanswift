'use server';

/**
 * @fileOverview Generates payment receipts using generative AI.
 *
 * - generateReceipt - A function that generates a payment receipt.
 * - GenerateReceiptInput - The input type for the generateReceipt function.
 * - GenerateReceiptOutput - The return type for the generateReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReceiptInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  loanId: z.string().describe('The ID of the loan.'),
  paymentAmount: z.number().describe('The amount of the payment.'),
  paymentDate: z.string().describe('The date of the payment (ISO format).'),
  staffName: z.string().describe('The name of the staff member recording the payment.'),
  receiptId: z.string().describe('The unique ID of the receipt.'),
  businessName: z.string().describe('The name of the business.'),
  businessAddress: z.string().describe('The address of the business.'),
  balance: z.number().describe('The outstanding balance, if any.'),
  businessLogoDataUri: z
    .string()
    .describe(
      "A photo of the business logo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    )
    .optional(),
});

export type GenerateReceiptInput = z.infer<typeof GenerateReceiptInputSchema>;

const GenerateReceiptOutputSchema = z.object({
  receiptText: z.string().describe('The text content of the receipt.'),
});

export type GenerateReceiptOutput = z.infer<typeof GenerateReceiptOutputSchema>;

export async function generateReceipt(input: GenerateReceiptInput): Promise<GenerateReceiptOutput> {
  return generateReceiptFlow(input);
}

const generateReceiptPrompt = ai.definePrompt({
  name: 'generateReceiptPrompt',
  input: {schema: GenerateReceiptInputSchema},
  output: {schema: GenerateReceiptOutputSchema},
  prompt: `You are an AI assistant specialized in generating professional-looking payment receipts based on a template. You will generate the receipt in plain text format, using the fields provided.
{{#if businessLogoDataUri}}
You should incorporate the business logo into the receipt. Here is the logo:
{{media url=businessLogoDataUri}}
{{/if}}

The output should be structured exactly like this, with the placeholders filled in:

Received from: {{{customerName}}}
The sum of: {{{paymentAmount}}}
Balance if any: {{{balance}}}
Received by: {{{staffName}}}

Do not include any other fields or text.
  `,
});

const generateReceiptFlow = ai.defineFlow(
  {
    name: 'generateReceiptFlow',
    inputSchema: GenerateReceiptInputSchema,
    outputSchema: GenerateReceiptOutputSchema,
  },
  async input => {
    const {output} = await generateReceiptPrompt(input);
    return output!;
  }
);
