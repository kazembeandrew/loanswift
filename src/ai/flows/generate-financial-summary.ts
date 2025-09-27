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
  totalCollected: z.number().describe('The total amount collected from loan payments.'),
  loanCount: z.number().describe('The total number of loans.'),
  paymentCount: z.number().describe('The total number of payments.'),
  overdueLoanCount: z.number().describe('The number of loans that are overdue.'),
  overdueLoansValue: z.number().describe('The total outstanding value of overdue loans (portfolio at risk).'),
  totalCapital: z.number().describe('Total capital invested in the business.'),
  totalMiscIncome: z.number().describe('Total income from miscellaneous sources like fees and penalties.'),
  totalExpenses: z.number().describe('Total operational expenses.'),
  totalDrawings: z.number().describe('Total funds withdrawn by the owner.'),
});
export type GenerateFinancialSummaryInput = z.infer<typeof GenerateFinancialSummaryInputSchema>;

const GenerateFinancialSummaryOutputSchema = z.object({
  capitalAnalysis: z.string().describe('An analysis of the capital deployed and its return. Discuss the efficiency of capital usage and available funds.'),
  businessStanding: z.string().describe('An assessment of the overall business standing based on the provided metrics. Mention portfolio health and profitability.'),
  financialSituation: z.string().describe('A summary of the current financial situation, considering profitability, cash flow, and overall financial health.'),
  expenditureAnalysis: z.string().describe("An analysis of expenditures versus income. Discuss operational efficiency and cost management."),
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

  **Loan Portfolio Data:**
  - Total Capital Deployed (Loan Principals): MWK {{{totalPrincipal}}}
  - Total Collected from Loan Payments: MWK {{{totalCollected}}}
  - Total Number of Loans: {{{loanCount}}}
  - Total Number of Payments: {{{paymentCount}}}
  - Number of Overdue Loans: {{{overdueLoanCount}}}
  - Portfolio at Risk (Value of Overdue Loans): MWK {{{overdueLoansValue}}}

  **Business Financials Data:**
  - Total Capital Invested: MWK {{{totalCapital}}}
  - Total Miscellaneous Income (Fees, etc.): MWK {{{totalMiscIncome}}}
  - Total Operational Expenses: MWK {{{totalExpenses}}}
  - Total Owner Drawings: MWK {{{totalDrawings}}}

  Based on this data, generate a detailed analysis covering the following sections. Be concise, insightful, and provide practical advice.

  1.  **Capital Analysis:** Analyze the relationship between total capital invested, capital deployed as loans, and the cash flow (collections vs. disbursements, expenses, drawings). Discuss the efficiency of capital usage and the state of available funds.
  2.  **Business Standing:** Assess the overall health and stability of the business. Evaluate profitability by comparing total revenue (loan collections + misc. income) against total outflows (expenses + drawings). Discuss portfolio health based on the Portfolio at Risk.
  3.  **Financial Situation:** Describe the current financial state. Synthesize the loan portfolio performance with the overall business financials to give a complete picture.
  4.  **Expenditure Analysis:** Frame the loan principals as the primary business investment. Analyze operational expenses and owner drawings in relation to the income generated. Discuss operational efficiency.
  5.  **Forecast:** Project performance for the next quarter, considering current loan performance, income trends, and expense levels.
  6.  **Suggestions:** Provide actionable recommendations to improve profitability, manage portfolio risk, optimize cash flow, and ensure sustainable growth.
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
