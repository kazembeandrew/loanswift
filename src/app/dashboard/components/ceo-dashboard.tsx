'use client';
import {
  CircleDollarSign,
  Users,
  Briefcase,
  TrendingDown,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  ResponsiveContainer,
} from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Borrower, Loan, Payment, Account, BusinessSettings } from '@/types';
import { format, subMonths, getMonth, getYear, differenceInDays } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import BorrowerList from '../borrowers/components/borrower-list';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { getAccounts } from '@/services/account-service';
import { getSettings } from '@/services/settings-service';
import { useDB } from '@/lib/firebase-provider';
import FinancialAnalysis from './financial-analysis';


const monthlyCollectionsChartConfig = {
  collected: {
    label: 'Collected',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

type CeoDashboardProps = {
    isAddBorrowerOpen: boolean;
    setAddBorrowerOpen: (isOpen: boolean) => void;
};

export default function CeoDashboard({ isAddBorrowerOpen, setAddBorrowerOpen }: CeoDashboardProps) {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const db = useDB();

  
  const fetchData = useCallback(async () => {
    const [borrowersData, loansData, paymentsData, accountsData, settingsData] = await Promise.all([
      getBorrowers(db),
      getLoans(db),
      getAllPayments(db),
      getAccounts(db),
      getSettings(db),
    ]);
    setBorrowers(borrowersData);
    setLoans(loansData);
    setPayments(paymentsData);
    setAccounts(accountsData);
    setSettings(settingsData);
  }, [db]);

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
  
  const totalRevenue = accounts
    .filter(a => a.type === 'income')
    .reduce((sum, a) => sum + a.balance, 0);
  
  const totalExpenses = accounts
    .filter(a => a.type === 'expense')
    .reduce((sum, a) => sum + a.balance, 0);
    
  const profitLoss = totalRevenue - totalExpenses;

  const cashAccount = accounts.find(a => a.name === 'Cash on Hand');
  const cashBalance = cashAccount ? cashAccount.balance : 0;
  
  const availableForLending = cashBalance - (settings?.reserveAmount || 0);

  const recentPayments = payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  
  const now = new Date();
  const monthlyCollectionsData = Array.from({ length: 6 }, (_, i) => {
    const monthDate = subMonths(now, 5 - i);
    return {
      month: format(monthDate, 'MMM'),
      collected: 0,
      monthIndex: getMonth(monthDate),
      year: getYear(monthDate)
    };
  });

  payments.forEach(payment => {
    const paymentDate = new Date(payment.date);
    const paymentMonthIndex = getMonth(paymentDate);
    const paymentYear = getYear(paymentDate);
    const collectionMonth = monthlyCollectionsData.find(m => m.monthIndex === paymentMonthIndex && m.year === paymentYear);
    if (collectionMonth) {
      collectionMonth.collected += payment.amount;
    }
  });

  // PAR Calculation
  const par = { thirty: 0, sixty: 0, ninety: 0 };
  activeLoans.forEach(loan => {
    const loanBalance = getLoanBalance(loan);
    if (loanBalance <= 0 || !loan.repaymentSchedule) return;

    const totalPaid = payments
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);

    let cumulativeDue = 0;
    for (const installment of loan.repaymentSchedule) {
      cumulativeDue += installment.amountDue;
      if (totalPaid < cumulativeDue) {
        const daysOverdue = differenceInDays(now, new Date(installment.dueDate));
        if (daysOverdue > 90) {
          par.ninety += loanBalance;
        } else if (daysOverdue > 60) {
          par.sixty += loanBalance;
        } else if (daysOverdue > 30) {
          par.thirty += loanBalance;
        }
        // Once the first overdue installment is found, we categorize the whole loan and stop.
        return;
      }
    }
  });


  return (
    <>
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
                Sum of all income accounts.
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
                Total Revenue minus Total Expenses.
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available for Lending</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">MWK {availableForLending.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Cash on Hand, less reserves.</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{activeLoans.length}</div>
                <p className="text-xs text-muted-foreground">Total loans with an outstanding balance.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/> Portfolio at Risk (PAR)</CardTitle>
                  <CardDescription>Outstanding balance of loans with payments overdue by more than 30, 60, or 90 days.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-destructive/10 p-4">
                      <p className="text-sm font-medium text-destructive">PAR &gt;30 Days</p>
                      <p className="text-2xl font-bold text-destructive">MWK {par.thirty.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-destructive/20 p-4">
                      <p className="text-sm font-medium text-destructive">PAR &gt;60 Days</p>
                      <p className="text-2xl font-bold text-destructive">MWK {par.sixty.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-destructive/30 p-4">
                      <p className="text-sm font-medium text-destructive">PAR &gt;90 Days</p>
                      <p className="text-2xl font-bold text-destructive">MWK {par.ninety.toLocaleString()}</p>
                  </div>
              </CardContent>
          </Card>
        </div>
        
        <FinancialAnalysis
          loans={loans}
          payments={payments}
          accounts={accounts}
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Monthly Collections</CardTitle>
              <CardDescription>
                Showing loan payment collections for the last 6 months.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartContainer config={monthlyCollectionsChartConfig} className="min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
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
                      tickFormatter={(value) => `K${Number(value) / 1000}K`}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent 
                          formatter={(value: any) => `MWK ${value.toLocaleString()}`}
                          indicator='dot'
                      />}
                    />
                    <Bar dataKey="collected" fill="var(--color-collected)" radius={8} />
                  </BarChart>
                </ResponsiveContainer>
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
        
        <BorrowerList 
            isAddBorrowerOpen={isAddBorrowerOpen} 
            setAddBorrowerOpen={setAddBorrowerOpen}
            borrowers={borrowers}
            loans={loans}
            payments={payments}
            fetchData={fetchData}
        />
    </>
  );
}
