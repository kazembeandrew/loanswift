
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
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
import type { Loan, Payment, Account } from '@/types';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { getAccounts } from '@/services/account-service';

type FinancialSummary = {
    capitalAnalysis: string;
    businessStanding: string;
    financialSituation: string;
    expenditureAnalysis: string;
    forecast: string;
    suggestions: string;
};

export default function FinancialsPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [analysisInput, setAnalysisInput] = useState<any>(null);

  const { toast } = useToast();

  const prepareAnalysisData = useCallback(async () => {
    const [loans, payments, accounts] = await Promise.all([
      getLoans(),
      getAllPayments(),
      getAccounts(),
    ]);

    if (loans.length === 0 && payments.length === 0) {
        setHasData(false);
        return;
    }

    setHasData(true);

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

  }, []);

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
    <div className="flex min-h-screen w-full flex-col">
      <Header title="AI Financial Analysis" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Financial Analysis</CardTitle>
            <CardDescription>
              Generate a comprehensive analysis of your business's financial health based on your complete loan and payment data. The AI will assess capital efficiency, business standing, profitability, and more.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4">
             {hasData ? (
                <Button onClick={handleSubmit} disabled={isLoading || !analysisInput} size="lg">
                    {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate Analysis
                </Button>
             ) : (
                <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center w-full">
                    <AlertTriangle className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">No loan data available to generate an analysis.</p>
                    <p className="text-sm text-muted-foreground">Add some loans and payments first.</p>
                </div>
             )}
             {isLoading && (
                <div className="text-center text-muted-foreground">
                    <p>This may take a moment...</p>
                </div>
            )}
          </CardContent>
        </Card>

        {summary && (
          <div className="grid gap-6 mt-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Capital Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{summary.capitalAnalysis}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Business Standing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{summary.businessStanding}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Financial Situation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{summary.financialSituation}</p>
              </CardContent>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle>Expenditure Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{summary.expenditureAnalysis}</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{summary.forecast}</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>AI Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{summary.suggestions}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
