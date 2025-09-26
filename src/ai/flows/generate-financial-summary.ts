'use server';

/**
 * @fileOverview Generates a financial summary for the business.
 *
 * - generateFinancialSummary - A function that generates a financial analysis.
 * - GenerateFinancialSummaryInput - The input type for the generateFinancialSummary function.
 * - GenerateFinancialSummaryOutput - The return type for the generateFinancialSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateFinancialSummaryInputSchema = z.object({
  totalPrincipal: z.number().describe('The total principal amount of all loans disbursed.'),
  totalCollected: z.number().describe('The total amount collected from payments.'),
  loanCount: z.number().describe('The total number of loans.'),
  paymentCount: z.number().describe('The total number of payments.'),
  overdueLoanCount: z.number().describe('The number of loans that are overdue.'),
  overdueLoansValue: z.number().describe('The total outstanding value of overdue loans (portfolio at risk).'),
});
export type GenerateFinancialSummaryInput = z.infer<typeof GenerateFinancialSummaryInputSchema>;

const GenerateFinancialSummaryOutputSchema = z.object({
  capitalAnalysis: z.string().describe('An analysis of the capital deployed and its return. Discuss the efficiency of capital usage.'),
  businessStanding: z.string().describe('An assessment of the overall business standing based on the provided metrics. Mention portfolio health.'),
  financialSituation: z.string().describe('A summary of the current financial situation, considering collections vs. deployed capital.'),
  expenditureAnalysis: z.string().describe("An analysis of expenditures. Since explicit expenditures aren't tracked, infer this from the principal deployed as the main business cost."),
  forecast: z.string().describe('A simple financial forecast for the next quarter based on current trends.'),
  suggestions: z.string().describe('Actionable suggestions to improve the financial health of the business, manage risks, and capitalize on opportunities.'),
});
export type GenerateFinancialSummaryOutput = z.infer<typeof GenerateFinancialSummaryOutputSchema>;

export async function generateFinancialSummary(
  input: GenerateFinancialSummaryInput
): Promise<GenerateFinancialSummaryOutput> {
  return generateFinancialSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFinancialSummaryPrompt',
  input: { schema: GenerateFinancialSummaryInputSchema },
  output: { schema: GenerateFinancialSummaryOutputSchema },
  prompt: `You are an expert financial analyst for a micro-lending business. Your task is to provide a comprehensive financial summary based on the following data. The currency is Malawian Kwacha (MWK).

  Data:
  - Total Capital Deployed (Loan Principals): MWK {{{totalPrincipal}}}
  - Total Collected from Payments: MWK {{{totalCollected}}}
  - Total Number of Loans: {{{loanCount}}}
  - Total Number of Payments: {{{paymentCount}}}
  - Number of Overdue Loans: {{{overdueLoanCount}}}
  - Portfolio at Risk (Value of Overdue Loans): MWK {{{overdueLoansValue}}}

  Based on this data, generate a detailed analysis covering the following sections. Be concise, insightful, and provide practical advice.

  1.  **Capital Analysis:** Analyze the relationship between capital deployed and capital collected.
  2.  **Business Standing:** Assess the overall health and stability of the business.
  3.  **Financial Situation:** Describe the current financial state.
  4.  **Expenditure Analysis:** Frame the loan principals as the primary business expenditure (investment) and analyze its performance.
  5.  **Forecast:** Project performance for the next quarter.
  6.  **Suggestions:** Provide actionable recommendations.
  `,
});

const generateFinancialSummaryFlow = ai.defineFlow(
  {
    name: 'generateFinancialSummaryFlow',
    inputSchema: GenerateFinancialSummaryInputSchema,
    outputSchema: GenerateFinancialSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
