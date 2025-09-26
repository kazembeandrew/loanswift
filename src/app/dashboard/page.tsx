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
import type { Customer, Loan, Payment } from '@/types';
import { format, subMonths, getMonth, isAfter, subDays } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import CustomerList from './customers/components/customer-list';
import { getCustomers } from '@/services/customer-service';
import { getLoans } from '@/services/loan-service';
import { getPayments } from '@/services/payment-service';


const monthlyCollectionsChartConfig = {
  collected: {
    label: 'Collected',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;


export default function DashboardPage() {
  const [isAddCustomerOpen, setAddCustomerOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  const fetchData = useCallback(async () => {
    const [customersData, loansData, paymentsData] = await Promise.all([
      getCustomers(),
      getLoans(),
      getPayments(),
    ]);
    setCustomers(customersData);
    setLoans(loansData);
    setPayments(paymentsData);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const getCustomerById = (id: string): Customer | undefined => {
    return customers.find((customer) => customer.id === id);
  }

  const overdueLoans = loans.filter(loan => loan.status === 'Overdue');
  const overdueLoansCount = overdueLoans.length;
  const overdueLoansValue = overdueLoans.reduce((sum, l) => sum + l.principal, 0);
  const totalCollected = payments.reduce((acc, payment) => acc + payment.amount, 0);

  const thirtyDaysAgo = subDays(new Date(), 30);
  const newCustomersCount = customers.filter(c => isAfter(new Date(c.joinDate), thirtyDaysAgo)).length;
  
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
        showAddCustomerButton 
        onAddCustomerClick={() => setAddCustomerOpen(true)}
      />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Collected
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">MWK {totalCollected.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +10.1% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Loans</CardTitle>
              <FileX2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overdueLoansCount}</div>
               <p className="text-xs text-muted-foreground">
                Total value at risk
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{newCustomersCount}</div>
              <p className="text-xs text-muted-foreground">
                in the last 30 days
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Advances</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">MWK 0</div>
              <p className="text-xs text-muted-foreground">
                Total outstanding advances
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Monthly Collections</CardTitle>
              <CardDescription>
                Showing collections for the last 6 months.
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
           <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-headline">Portfolio at Risk</CardTitle>
              <CardDescription>
                Total value of all overdue loans.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[240px]">
                <TrendingDown className="w-16 h-16 text-destructive" />
                <div className="text-4xl font-bold text-destructive mt-4">
                  MWK {overdueLoansValue.toLocaleString()}
                </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-8">
               {recentPayments.length > 0 ? (
                recentPayments.map(payment => {
                  const loan = loans.find(l => l.id === payment.loanId);
                  if (!loan) return null;
                  const customer = getCustomerById(loan.customerId);
                  const avatarFallback = customer?.name.split(' ').map(n => n[0]).join('') || 'N/A';
                  if (!customer) return null;
                  
                  return (
                    <div className="flex items-center" key={payment.id}>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`https://picsum.photos/seed/${customer.id}/100/100`} alt="Avatar" data-ai-hint="user avatar" />
                        <AvatarFallback>{avatarFallback}</AvatarFallback>
                      </Avatar>
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Paid for Loan {payment.loanId}
                        </p>
                      </div>
                      <div className="ml-auto font-medium">
                         +MWK {payment.amount.toLocaleString()}
                      </div>
                    </div>
                  )
                })
               ) : (
                <p className="text-sm text-muted-foreground">No recent payments.</p>
               )}
              </div>
          </CardContent>
        </Card>
        <div className="hidden">
           <CustomerList isAddCustomerOpen={isAddCustomerOpen} setAddCustomerOpen={setAddCustomerOpen} />
        </div>
      </main>
    </div>
  );
}
