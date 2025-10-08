'use client';
import {
  CircleDollarSign,
  Users,
  Briefcase,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Loader2,
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
import BorrowerList from '../borrowers/components/borrower-list';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { getAccounts } from '@/services/account-service';
import { getSettings } from '@/services/settings-service';
import { useDB } from '@/lib/firebase-client-provider';
import FinancialAnalysis from './financial-analysis';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

function CeoDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-32 mt-2" /></CardHeader><CardContent><Skeleton className="h-7 w-36" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-40 mt-2" /></CardHeader><CardContent><Skeleton className="h-7 w-32" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-44 mt-2" /></CardHeader><CardContent><Skeleton className="h-7 w-32" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-48 mt-2" /></CardHeader><CardContent><Skeleton className="h-7 w-12" /></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
            <CardHeader><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-full mt-2" /></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-6 w-36" /></CardHeader>
          <CardContent className="space-y-4">
              <div className="flex items-center gap-4"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-40" /></div><Skeleton className="h-5 w-20 ml-auto" /></div>
              <div className="flex items-center gap-4"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-44" /></div><Skeleton className="h-5 w-20 ml-auto" /></div>
              <div className="flex items-center gap-4"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-36" /></div><Skeleton className="h-5 w-16 ml-auto" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-96 mt-2" /></CardHeader>
        <CardContent><Skeleton className="h-10 w-40" /></CardContent>
      </Card>
      
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-64 mt-2" /></CardHeader>
          <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const monthlyCollectionsChartConfig = {
  collected: {
    label: 'Collected',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;


export default function CeoDashboard() {
  const db = useDB();

  const { data: borrowers = [], isLoading: isLoadingBorrowers } = useQuery({
    queryKey: ['borrowers'],
    queryFn: () => getBorrowers(db),
  });
  const { data: loans = [], isLoading: isLoadingLoans } = useQuery({
    queryKey: ['loans'],
    queryFn: () => getLoans(db),
  });
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['allPayments'],
    queryFn: () => getAllPayments(db),
  });
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(db),
  });
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(db),
  });
  
  const isLoading = isLoadingBorrowers || isLoadingLoans || isLoadingPayments || isLoadingAccounts || isLoadingSettings;

  if (isLoading) {
    return <CeoDashboardSkeleton />;
  }
  
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
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
        <Card>
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

      <FinancialAnalysis
        loans={loans}
        payments={payments}
        accounts={accounts}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
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
        <div className="lg:col-span-1">
            <BorrowerList 
                borrowers={borrowers}
                loans={loans}
                payments={payments}
            />
        </div>
      </div>
    </>
  );
}
