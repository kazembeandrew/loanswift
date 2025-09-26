'use server';
import { summarizeArrears, type SummarizeArrearsOutput } from '@/ai/flows/summarize-arrears';

export async function handleSummarizeArrears(excelDataUri: string): Promise<SummarizeArrearsOutput> {
  try {
    const output = await summarizeArrears({ excelData: excelDataUri });
    return output;
  } catch (error) {
    console.error('Error in handleSummarizeArrears:', error);
    throw new Error('Failed to summarize arrears.');
  }
}
