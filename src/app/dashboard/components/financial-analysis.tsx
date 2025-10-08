'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleGenerateFinancialSummary } from '@/app/actions/financials';
import type { GenerateFinancialSummaryOutput, GenerateFinancialSummaryInput } from '@/app/actions/financials';
import type { Loan, Payment, Account } from '@/types';

type FinancialAnalysisProps = {
    loans: Loan[];
    payments: (Payment & { loanId: string })[];
    accounts: Account[];
}

// Simple function to strip HTML tags from a string.
const sanitizeHTML = (str: string) => str.replace(/<[^>]*>?/gm, '');

export default function FinancialAnalysis({ loans, payments, accounts }: FinancialAnalysisProps) {
  const [summary, setSummary] = useState<GenerateFinancialSummaryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisInput, setAnalysisInput] = useState<GenerateFinancialSummaryInput | null>(null);
  const { toast } = useToast();

  const hasData = loans.length > 0 || payments.length > 0;

  const prepareAnalysisData = useCallback(() => {
    if (!hasData) return;

    const getLoanBalance = (loan: Loan) => {
        const totalPaid = payments
          .filter(p => p.loanId === loan.id)
          .reduce((sum, p) => sum + p.amount, 0);
        const totalOwed = loan.principal * (1 + loan.interestRate / 100);
        return totalOwed - totalPaid;
    };

    const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal, 0);
    const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    const activeLoans = loans.filter(loan => getLoanBalance(loan) > 0);
    const overdueLoansValue = activeLoans.reduce((sum, loan) => sum + getLoanBalance(loan), 0);
    
    const totalCapital = accounts.filter(a => a.type === 'equity').reduce((sum, item) => sum + item.balance, 0);
    const totalMiscIncome = accounts.filter(a => a.type === 'income' && a.name !== 'Interest Income').reduce((sum, item) => sum + item.balance, 0);
    const totalExpenses = accounts.filter(a => a.type === 'expense').reduce((sum, item) => sum + item.balance, 0);
    const totalDrawings = 0; 
    
    setAnalysisInput({
        totalPrincipal,
        totalCollected,
        loanCount: loans.length,
        paymentCount: payments.length,
        overdueLoanCount: activeLoans.length,
        overdueLoansValue,
        totalCapital,
        totalMiscIncome,
        totalExpenses,
        totalDrawings,
      });

  }, [loans, payments, accounts, hasData]);

  useEffect(() => {
    prepareAnalysisData();
  }, [prepareAnalysisData]);

  const handleSubmit = async () => {
    if (!analysisInput) {
        toast({ title: "Data not ready", description: "Financial data is still loading, please wait.", variant: "destructive"});
        return;
    };
    setIsLoading(true);
    setSummary(null);

    try {
      const result = await handleGenerateFinancialSummary(analysisInput);
      setSummary(result);
      toast({
        title: 'Analysis Complete',
        description: 'Your financial summary has been generated.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Generating Summary',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-Powered Financial Analysis</CardTitle>
        <CardDescription>
          Generate a comprehensive analysis of your business's financial health based on your complete loan and payment data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasData ? (
          <Button onClick={handleSubmit} disabled={isLoading || !analysisInput}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Analysis
          </Button>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No loan data available to generate an analysis.</p>
          </div>
        )}
        
        {isLoading && (
            <div className="flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <p>This may take a moment...</p>
            </div>
        )}

        {summary && (
          <div className="grid gap-6 mt-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Capital Analysis</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{sanitizeHTML(summary.capitalAnalysis)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Business Standing</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{sanitizeHTML(summary.businessStanding)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Financial Situation</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{sanitizeHTML(summary.financialSituation)}</p></CardContent>
            </Card>
             <Card>
              <CardHeader><CardTitle>Expenditure Analysis</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{sanitizeHTML(summary.expenditureAnalysis)}</p></CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Forecast</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{sanitizeHTML(summary.forecast)}</p></CardContent>
            </Card>
            <Card className="md:col-span-2 bg-primary/5 border-primary/20">
              <CardHeader><CardTitle>AI Suggestions</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-primary/90">{sanitizeHTML(summary.suggestions)}</p></CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
