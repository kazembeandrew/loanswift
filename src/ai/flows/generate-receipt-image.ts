'use server';

/**
 * @fileOverview Generates payment receipt images using generative AI.
 *
 * - generateReceiptImage - A function that generates a payment receipt image.
 * - GenerateReceiptImageInput - The input type for the generateReceiptImage function.
 * - GenerateReceiptImageOutput - The return type for the generateReceiptImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReceiptImageInputSchema = z.object({
  receiptText: z.string().describe('The text content of the receipt.'),
  receiptId: z.string().describe('The unique ID of the receipt.'),
  paymentDate: z.string().describe('The date of the payment.'),
  paymentAmount: z.number().describe('The amount of the payment.'),
  businessName: z.string().describe('The name of the business.'),
  businessAddress: z.string().describe('The address of the business.'),
  businessPhone: z.string().describe('The phone number of the business.'),
});
export type GenerateReceiptImageInput = z.infer<typeof GenerateReceiptImageInputSchema>;

const GenerateReceiptImageOutputSchema = z.object({
  imageUrl: z.string().describe("URL of the generated receipt image, as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'"),
});
export type GenerateReceiptImageOutput = z.infer<typeof GenerateReceiptImageOutputSchema>;


export async function generateReceiptImage(input: GenerateReceiptImageInput): Promise<GenerateReceiptImageOutput> {
  return generateReceiptImageFlow(input);
}


const generateReceiptImageFlow = ai.defineFlow(
  {
    name: 'generateReceiptImageFlow',
    inputSchema: GenerateReceiptImageInputSchema,
    outputSchema: GenerateReceiptImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `Generate a professional, clean, and modern-looking payment receipt image.

        **Do not include any logos or icons.**

        The receipt should contain the following information, clearly laid out:
        
        - Business Name: "${input.businessName}"
        - Business Address: "${input.businessAddress}"
        - Business Phone: "${input.businessPhone}"
        - Receipt ID: "${input.receiptId}"
        - Payment Date: "${new Date(input.paymentDate).toLocaleDateString()}"
        - Payment Amount: "MWK ${input.paymentAmount.toLocaleString()}"
        
        The receipt text content should be:
        ---
        ${input.receiptText}
        ---
        
        Design it with a simple color scheme, focusing on readability. Use a clean, sans-serif font. The layout should be balanced and professional.
        Ensure there's a space for a signature.
        `,
    });

    if (!media.url) {
        throw new Error('Image generation failed: no media URL returned.');
    }

    return { imageUrl: media.url };
  }
);
