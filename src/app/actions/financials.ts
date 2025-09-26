'use server';

import {
  generateFinancialSummary,
  type GenerateFinancialSummaryInput,
  type GenerateFinancialSummaryOutput,
} from '@/ai/flows/generate-financial-summary';

export type {
  GenerateFinancialSummaryInput,
  GenerateFinancialSummaryOutput,
} from '@/ai/flows/generate-financial-summary';

export async function handleGenerateFinancialSummary(
  input: GenerateFinancialSummaryInput
): Promise<GenerateFinancialSummaryOutput> {
  try {
    const output = await generateFinancialSummary(input);
    return output;
  } catch (error) {
    console.error('Error in handleGenerateFinancialSummary:', error);
    throw new Error('Failed to generate financial summary.');
  }
}
