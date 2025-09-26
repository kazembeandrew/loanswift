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
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { loans as initialLoans, customers as initialCustomers, payments as initialPayments } from '@/lib/data';
import type { Customer, Loan, Payment } from '@/types';
import { format, subMonths, getMonth, isAfter, subDays } from 'date-fns';


const monthlyCollectionsChartConfig = {
  collected: {
    label: 'Collected',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const getCustomerById = (id: string): Customer | undefined => {
    return initialCustomers.find((customer) => customer.id === id);
}

export default function DashboardPage() {

  const overdueLoans = initialLoans.filter(loan => loan.status === 'Overdue');
  const overdueLoansCount = overdueLoans.length;
  const totalCollected = initialPayments.reduce((acc, payment) => acc + payment.amount, 0);

  const thirtyDaysAgo = subDays(new Date(), 30);
  const newCustomersCount = initialCustomers.filter(c => isAfter(new Date(c.joinDate), thirtyDaysAgo)).length;
  
  const recentPayments = initialPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);


  const loanStatusCounts = initialLoans.reduce((acc, loan) => {
    acc[loan.status] = (acc[loan.status] || 0) + 1;
    return acc;
  }, {} as Record<Loan['status'], number>);

  const loanStatusData = [
    { status: 'Active', count: loanStatusCounts.Active || 0, fill: 'var(--color-active)' },
    { status: 'Overdue', count: loanStatusCounts.Overdue || 0, fill: 'var(--color-overdue)' },
    { status: 'Paid', count: loanStatusCounts.Paid || 0, fill: 'var(--color-paid)' },
    { status: 'Pending', count: loanStatusCounts.Pending || 0, fill: 'var(--color-pending)' },
  ];

  const loanStatusChartConfig = {
    count: {
      label: 'Count',
    },
    Active: {
      label: 'Active',
      color: 'hsl(var(--chart-1))',
    },
    Overdue: {
      label: 'Overdue',
      color: 'hsl(var(--destructive))',
    },
    Paid: {
      label: 'Paid',
      color: 'hsl(var(--chart-2))',
    },
    Pending: {
      label: 'Pending',
      color: 'hsl(var(--chart-4))',
    },
  } satisfies ChartConfig;
  
  const now = new Date();
  const monthlyCollectionsData = Array.from({ length: 6 }, (_, i) => {
    const monthDate = subMonths(now, 5 - i);
    return {
      month: format(monthDate, 'MMM'),
      collected: 0,
      monthIndex: getMonth(monthDate),
    };
  });

  initialPayments.forEach(payment => {
    const paymentMonthIndex = getMonth(new Date(payment.date));
    const collectionMonth = monthlyCollectionsData.find(m => m.monthIndex === paymentMonthIndex);
    if (collectionMonth) {
      collectionMonth.collected += payment.amount;
    }
  });


  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Dashboard" />
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
                Total value: MWK {overdueLoans.reduce((sum, l) => sum + l.principal, 0).toLocaleString()}
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
          <Card className="lg:col-span-4">
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
                    tickFormatter={(value) => `K${value / 1000}K`}
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
              <CardTitle>Loan Status Overview</CardTitle>
              <CardDescription>
                Distribution of all loans by status.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ChartContainer
                config={loanStatusChartConfig}
                className="h-[300px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={loanStatusData}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {loanStatusData.map((entry) => (
                      <Cell key={entry.status} fill={`var(--color-${entry.status.toLowerCase()})`} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="status" />}
                    className="-mt-4"
                  />
                </PieChart>
              </ChartContainer>
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
                  const loan = initialLoans.find(l => l.id === payment.loanId);
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
      </main>
    </div>
  );
}
