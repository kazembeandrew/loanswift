'use client';
import {
  ArrowDown,
  ArrowUp,
  CircleDollarSign,
  Landmark,
  Users,
  Wallet,
  FileX2,
  Briefcase,
  TrendingDown,
  Banknote,
  PiggyBank,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Header } from '@/components/header';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { Borrower, Loan, Payment, Capital, Income, Expense, Drawing } from '@/types';
import { format, subMonths, getMonth, isAfter, subDays } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import BorrowerList from './borrowers/components/borrower-list';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { getCapitalContributions } from '@/services/capital-service';
import { getIncomeRecords } from '@/services/income-service';
import { getExpenseRecords } from '@/services/expense-service';
import { getDrawingRecords } from '@/services/drawing-service';
import { getBorrowerAvatar } from '@/lib/placeholder-images';


const monthlyCollectionsChartConfig = {
  collected: {
    label: 'Collected',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;


export default function DashboardPage() {
  const [isAddBorrowerOpen, setAddBorrowerOpen] = useState(false);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  const [capital, setCapital] = useState<Capital[]>([]);
  const [miscIncome, setMiscIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);

  
  const fetchData = useCallback(async () => {
    const [borrowersData, loansData, paymentsData, capitalData, incomeData, expenseData, drawingData] = await Promise.all([
      getBorrowers(),
      getLoans(),
      getAllPayments(),
      getCapitalContributions(),
      getIncomeRecords(),
      getExpenseRecords(),
      getDrawingRecords(),
    ]);
    setBorrowers(borrowersData);
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
  
  const getBorrowerById = (id: string): Borrower | undefined => {
    return borrowers.find((borrower) => borrower.id === id);
  }

  const getLoanBalance = (loan: Loan) => {
    const totalPaid = payments
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    return totalOwed - totalPaid;
  };
  
  const activeLoans = loans.filter(loan => getLoanBalance(loan) > 0);

  const overdueLoansValue = activeLoans.reduce((sum, l) => sum + getLoanBalance(l), 0);
  
  const totalIncome = miscIncome.reduce((acc, income) => acc + income.amount, 0);
  const totalRevenue = totalIncome;
  
  const totalExpenses = expenses.reduce((acc, expense) => acc + expense.amount, 0);
  const totalDrawings = drawings.reduce((acc, drawing) => acc + drawing.amount, 0);
  const profitLoss = totalRevenue - totalExpenses - totalDrawings;

  const totalCapital = capital.reduce((acc, cap) => acc + cap.amount, 0);
  const totalPrincipalDisbursed = loans.reduce((acc, loan) => acc + loan.principal, 0);
  
  const totalPrincipalRepaid = payments.reduce((sum, p) => {
      const loan = loans.find(l => l.id === p.loanId);
      if (!loan) return sum;
      
      const totalOwed = loan.principal * (1 + loan.interestRate / 100);
      const interestOwed = totalOwed - loan.principal;

      const interestIncomeForLoan = miscIncome
          .filter(i => i.loanId === loan.id && i.source === 'interest')
          .reduce((s, i) => s + i.amount, 0);
      
      const principalPortion = p.amount - Math.max(0, Math.min(p.amount, interestOwed - interestIncomeForLoan));

      return sum + principalPortion;
  }, 0);


  const availableFunds = totalCapital + totalPrincipalRepaid - totalPrincipalDisbursed - totalExpenses - totalDrawings;

  const recentPayments = payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  
  const now = new Date();
  const monthlyCollectionsData = Array.from({ length: 6 }, (_, i) => {
    const monthDate = subMonths(now, 5 - i);
    return {
      month: format(monthDate, 'MMM'),
      collected: 0,
      monthIndex: getMonth(monthDate),
    };
  });

  payments.forEach(payment => {
    const paymentMonthIndex = getMonth(new Date(payment.date));
    const collectionMonth = monthlyCollectionsData.find(m => m.monthIndex === paymentMonthIndex);
    if (collectionMonth) {
      collectionMonth.collected += payment.amount;
    }
  });


  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header 
        title="Dashboard" 
        showAddBorrowerButton 
        onAddBorrowerClick={() => setAddBorrowerOpen(true)}
      />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">MWK {totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Interest + Miscellaneous income.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit / Loss</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-destructive'}`}>MWK {profitLoss.toLocaleString()}</div>
               <p className="text-xs text-muted-foreground">
                Revenue - (Expenses + Drawings)
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Funds</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">MWK {availableFunds.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Cash available for new loans.</p>
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
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Monthly Collections</CardTitle>
              <CardDescription>
                Showing loan payment collections for the last 6 months.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartContainer
                config={monthlyCollectionsChartConfig}
                className="h-[300px] w-full"
              >
                <BarChart data={monthlyCollectionsData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={(value) => `K${Number(value) / 1000}K`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="collected" fill="var(--color-collected)" radius={8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
           <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                {recentPayments.length > 0 ? (
                    recentPayments.map(payment => {
                    const loan = loans.find(l => l.id === payment.loanId);
                    if (!loan) return null;
                    const borrower = getBorrowerById(loan.borrowerId);
                    const avatarFallback = borrower?.name.split(' ').map(n => n[0]).join('') || 'N/A';
                    if (!borrower) return null;
                    
                    return (
                        <div className="flex items-center" key={payment.id}>
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={getBorrowerAvatar(borrower.id)} alt="Avatar" data-ai-hint="user avatar" />
                            <AvatarFallback>{avatarFallback}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">{borrower.name}</p>
                            <p className="text-sm text-muted-foreground">
                             Paid on {new Date(payment.date).toLocaleDateString()} for Loan {payment.loanId}
                            </p>
                        </div>
                        <div className="ml-auto font-medium">
                            +MWK {payment.amount.toLocaleString()}
                        </div>
                        </div>
                    )
                    })
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-10">No recent payments.</p>
                )}
                </div>
            </CardContent>
            </Card>
        </div>
        
        <BorrowerList isAddBorrowerOpen={isAddBorrowerOpen} setAddBorrowerOpen={setAddBorrowerOpen} />

      </main>
    </div>
  );
}
