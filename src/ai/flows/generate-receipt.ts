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
  prompt: `You are an AI assistant specialized in generating professional-looking payment receipts based on a template. Your output should be plain text, with each field on a new line.

Generate a receipt with the following information, formatted exactly as shown below:

Received from: {{{customerName}}}
The sum of: MWK {{{paymentAmount}}}
For Loan: {{{loanId}}}
Balance if any: MWK {{{balance}}}
Received by: {{{staffName}}}

Do not add any extra text, formatting, or labels.
  `,
});

const generateReceiptFlow = ai.defineFlow(
  {
    name: 'generateReceiptFlow',
    inputSchema: GenerateReceiptInputSchema,
    outputSchema: GenerateReceiptOutputSchema,
  },
  async input => {
    // The balance is now passed directly from the client, which has the most up-to-date view.
    // This simplifies the logic and ensures accuracy.
    const promptInput = {
      ...input,
      balance: input.balance > 0 ? input.balance : 0, // Ensure balance is not negative
    };

    const {output} = await generateReceiptPrompt(promptInput);
    return output!;
  }
);
