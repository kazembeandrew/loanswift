'use server';

import { generateReceipt, type GenerateReceiptInput, type GenerateReceiptOutput } from '@/ai/flows/generate-receipt';
import { generateReceiptImage, type GenerateReceiptImageInput, type GenerateReceiptImageOutput } from '@/ai/flows/generate-receipt-image';


export async function handleGenerateReceipt(input: GenerateReceiptInput): Promise<GenerateReceiptOutput> {
  try {
    const output = await generateReceipt(input);
    return output;
  } catch (error) {
    console.error('Error in handleGenerateReceipt:', error);
    throw new Error('Failed to generate receipt text.');
  }
}

export async function handleGenerateReceiptImage(input: GenerateReceiptImageInput): Promise<GenerateReceiptImageOutput> {
  try {
    const output = await generateReceiptImage(input);
    return output;
  } catch (error) {
    console.error('Error in handleGenerateReceiptImage:', error);
    throw new Error('Failed to generate receipt image.');
  }
}
