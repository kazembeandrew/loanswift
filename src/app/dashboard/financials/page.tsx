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
import { Loader2, Sparkles, AlertTriangle, LandPlot, TrendingDown, Scale, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleGenerateFinancialSummary } from '@/app/actions/financials';
import type { Loan, Payment, Capital, Income, Expense, Drawing } from '@/types';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { getCapitalContributions } from '@/services/capital-service';
import { getIncomeRecords } from '@/services/income-service';
import { getExpenseRecords } from '@/services/expense-service';
import { getDrawingRecords } from '@/services/drawing-service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, getMonth, getYear } from 'date-fns';

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
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  const [capital, setCapital] = useState<Capital[]>([]);
  const [miscIncome, setMiscIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const [loansData, paymentsData, capitalData, incomeData, expenseData, drawingData] = await Promise.all([
      getLoans(),
      getAllPayments(),
      getCapitalContributions(),
      getIncomeRecords(),
      getExpenseRecords(),
      getDrawingRecords(),
    ]);
    setLoans(loansData);
    setPayments(paymentsData);
    setCapital(capitalData);
    setMiscIncome(incomeData);
    setExpenses(expenseData);
    setDrawings(drawingData);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getLoanBalance = (loan: Loan) => {
    const totalPaid = payments
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    return totalOwed - totalPaid;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setSummary(null);

    const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal, 0);
    const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    const activeLoans = loans.filter(loan => getLoanBalance(loan) > 0);
    const overdueLoansValue = activeLoans.reduce((sum, loan) => sum + getLoanBalance(loan), 0);
    
    const totalCapital = capital.reduce((sum, item) => sum + item.amount, 0);
    const totalMiscIncome = miscIncome.filter(i => i.source !== 'interest').reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalDrawings = drawings.reduce((sum, item) => sum + item.amount, 0);


    try {
      const input = {
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

  const activeLoans = loans.filter(loan => getLoanBalance(loan) > 0);
  const overdueLoansValue = activeLoans.reduce((sum, loan) => {
    return sum + getLoanBalance(loan);
  }, 0);

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    return { 
        name: format(d, 'MMM'),
        month: getMonth(d),
        year: getYear(d),
        deployed: 0,
        collected: 0,
    };
  });

  loans.forEach(loan => {
    const loanDate = new Date(loan.startDate);
    const record = monthlyData.find(m => m.month === getMonth(loanDate) && m.year === getYear(loanDate));
    if (record) {
        record.deployed += loan.principal;
    }
  });

  payments.forEach(payment => {
    const paymentDate = new Date(payment.date);
    const record = monthlyData.find(m => m.month === getMonth(paymentDate) && m.year === getYear(paymentDate));
    if (record) {
        record.collected += payment.amount;
    }
  });


  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Financials" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Capital Deployed</CardTitle>
                    <LandPlot className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">MWK {totalPrincipal.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total principal of all loans.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">MWK {totalCollected.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total from all customer payments.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Portfolio at Risk</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">MWK {overdueLoansValue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total outstanding on active loans.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Loans Overview</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold">{loans.length} <span className="text-base font-normal text-muted-foreground">Total Loans</span></div>
                    <div className="text-xl font-bold text-destructive">{activeLoans.length} <span className="text-base font-normal text-muted-foreground">Active</span></div>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Capital deployed vs. capital collected over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `K${Number(value) / 1000}k`} />
                        <Tooltip formatter={(value: number) => `MWK ${value.toLocaleString()}`} />
                        <Legend />
                        <Bar dataKey="deployed" fill="hsl(var(--muted-foreground))" name="Capital Deployed" />
                        <Bar dataKey="collected" fill="hsl(var(--primary))" name="Capital Collected" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Financial Analysis</CardTitle>
            <CardDescription>
              Generate a comprehensive analysis of your business's financial health based on your complete loan and payment data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
             {loans.length > 0 ? (
                <Button onClick={handleSubmit} disabled={isLoading} size="lg">
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
