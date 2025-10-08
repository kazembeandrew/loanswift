'use client';

import { useAuth } from '@/context/auth-context';
import type { Borrower, Loan, Payment, SituationReport } from '@/types';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { getAllSituationReports } from '@/services/situation-report-service';
import DashboardMetrics from './dashboard-metrics';
import BorrowerList from '../borrowers/components/borrower-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useDB } from '@/lib/firebase-client-provider';
import MyTasks from './my-tasks';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';


type UpcomingPayment = {
    loanId: string;
    borrowerName: string;
    amountDue: number;
    dueDate: Date;
    balance: number;
};

export default function LoanOfficerDashboard() {
  const { userProfile } = useAuth();
  const db = useDB();

  const { data: borrowers = [], isLoading: isLoadingBorrowers } = useQuery({
      queryKey: ['borrowers', userProfile?.uid],
      queryFn: () => getBorrowers(db, userProfile?.uid),
      enabled: !!userProfile,
  });

  const myBorrowerIds = borrowers.map(b => b.id);
  
  const { data: allLoans = [], isLoading: isLoadingLoans } = useQuery({
      queryKey: ['loans'],
      queryFn: () => getLoans(db),
  });

  const loans = allLoans.filter(l => myBorrowerIds.includes(l.borrowerId));

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
      queryKey: ['allPayments'],
      queryFn: () => getAllPayments(db),
  });

  const { data: situationReports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ['situationReports', myBorrowerIds],
    queryFn: () => getAllSituationReports(db, myBorrowerIds),
    enabled: myBorrowerIds.length > 0,
  });

  const isLoading = isLoadingBorrowers || isLoadingLoans || isLoadingPayments || isLoadingReports;

  if (isLoading) {
    return (
        <div className="flex h-[80vh] w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }


  const getLoanBalance = (loan: Loan) => {
    const totalPaid = payments
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    return totalOwed - totalPaid;
  };
  
  const getUpcomingPayments = (): UpcomingPayment[] => {
    const upcoming: UpcomingPayment[] = [];

    loans.forEach(loan => {
        const balance = getLoanBalance(loan);
        if (balance <= 0 || !loan.repaymentSchedule) return;

        const totalPaid = payments
            .filter(p => p.loanId === loan.id)
            .reduce((sum, p) => sum + p.amount, 0);

        let cumulativeDue = 0;
        for (const installment of loan.repaymentSchedule) {
            cumulativeDue += installment.amountDue;
            if (totalPaid < cumulativeDue) {
                const borrower = borrowers.find(b => b.id === loan.borrowerId);
                upcoming.push({
                    loanId: loan.id,
                    borrowerName: borrower?.name || 'Unknown',
                    amountDue: installment.amountDue,
                    dueDate: new Date(installment.dueDate),
                    balance: balance,
                });
                return; 
            }
        }
    });

    return upcoming
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .slice(0, 5);
  };
  
  const upcomingPayments = getUpcomingPayments();


  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-semibold">
        Welcome, {userProfile?.displayName || userProfile?.email.split('@')[0]}
      </h1>

      <DashboardMetrics loans={loans} payments={payments} borrowers={borrowers} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardContent className="p-0">
            <BorrowerList 
                borrowers={borrowers}
                loans={loans}
                payments={payments}
            />
          </CardContent>
        </Card>
        <div className="lg:col-span-3 space-y-6">
            <MyTasks 
                loans={loans}
                borrowers={borrowers}
                payments={payments}
                situationReports={situationReports}
            />
            <Card>
            <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
                <CardDescription>Next 5 scheduled payments due from your clients.</CardDescription>
            </CardHeader>
            <CardContent>
                {upcomingPayments.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Borrower</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead className="text-right">Amount Due</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {upcomingPayments.map(p => p && (
                                <TableRow key={p.loanId}>
                                    <TableCell>{p.borrowerName}</TableCell>
                                    <TableCell>{format(p.dueDate, 'PPP')}</TableCell>
                                    <TableCell className="text-right">MWK {p.amountDue.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex items-center justify-center h-40 text-center">
                        <p className="text-muted-foreground">No upcoming payments for your clients.</p>
                    </div>
                )}
            </CardContent>
            </Card>
        </div>
      </div>

    </div>
  );
}
