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
import type { Loan, Payment } from '@/types';
import { getLoans } from '@/services/loan-service';
import { getPayments } from '@/services/payment-service';

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
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const [loansData, paymentsData] = await Promise.all([
      getLoans(),
      getPayments(),
    ]);
    setLoans(loansData);
    setPayments(paymentsData);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setSummary(null);

    const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal, 0);
    const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const overdueLoans = loans.filter(loan => loan.status === 'Overdue');
    const overdueLoansValue = overdueLoans.reduce((sum, loan) => {
        const totalPaid = payments.filter(p => p.loanId === loan.id).reduce((s, p) => s + p.amount, 0);
        const totalOwed = loan.principal * (1 + loan.interestRate / 100);
        return sum + (totalOwed - totalPaid);
    }, 0);

    try {
      const input = {
        totalPrincipal,
        totalCollected,
        loanCount: loans.length,
        paymentCount: payments.length,
        overdueLoanCount: overdueLoans.length,
        overdueLoansValue,
      };
      const result = await handleGenerateFinancialSummary(input);
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
  
  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal, 0);
  const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Financials" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Financial Analysis</CardTitle>
            <CardDescription>
              Generate a comprehensive analysis of your business's financial health based on your loan and payment data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Capital Deployed</p>
                  <p className="text-2xl font-bold">MWK {totalPrincipal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Collected</p>
                  <p className="text-2xl font-bold">MWK {totalCollected.toLocaleString()}</p>
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={isLoading || loans.length === 0}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Analysis
              </Button>
            </div>
             {loans.length === 0 && !isLoading && (
                <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
                    <AlertTriangle className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">No loan data available to generate an analysis.</p>
                    <p className="text-sm text-muted-foreground">Add some loans and payments first.</p>
                </div>
             )}
          </CardContent>
        </Card>

        {isLoading && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed p-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Analyzing your financial data...</p>
            <p className="text-sm text-muted-foreground">This may take a moment.</p>
          </div>
        )}

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
