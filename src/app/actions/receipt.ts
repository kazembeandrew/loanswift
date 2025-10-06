'use server';

import { generateReceipt, type GenerateReceiptInput, type GenerateReceiptOutput } from '@/ai/flows/generate-receipt';


export async function handleGenerateReceipt(input: GenerateReceiptInput): Promise<GenerateReceiptOutput> {
  try {
    const output = await generateReceipt(input);
    return output;
  } catch (error) {
    throw new Error('Failed to generate receipt text.');
  }
}
