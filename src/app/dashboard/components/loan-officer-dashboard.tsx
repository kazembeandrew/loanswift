'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import type { Borrower, Loan, Payment } from '@/types';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import DashboardMetrics from './dashboard-metrics';
import BorrowerList from '../borrowers/components/borrower-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { subDays, isAfter, format } from 'date-fns';

type LoanOfficerDashboardProps = {
    isAddBorrowerOpen: boolean;
    setAddBorrowerOpen: (isOpen: boolean) => void;
};

export default function LoanOfficerDashboard({ isAddBorrowerOpen, setAddBorrowerOpen }: LoanOfficerDashboardProps) {
  const { user, userProfile } = useAuth();
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);

  // TODO: Implement logic to assign borrowers to loan officers.
  // For now, we will show all borrowers to all loan officers.
  const myBorrowers = borrowers;
  const myLoanIds = loans.filter(l => myBorrowers.some(b => b.id === l.borrowerId)).map(l => l.id);
  const myLoans = loans.filter(l => myLoanIds.includes(l.id));

  const fetchData = useCallback(async () => {
    const [borrowersData, loansData, paymentsData] = await Promise.all([
      getBorrowers(),
      getLoans(),
      getAllPayments(),
    ]);
    setBorrowers(borrowersData);
    setLoans(loansData);
    setPayments(paymentsData);
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
  
  const upcomingPayments = myLoans.map(loan => {
    const lastPayment = payments.filter(p => p.loanId === loan.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const balance = getLoanBalance(loan);
    if (balance <= 0) return null;

    const lastPaymentDate = lastPayment ? new Date(lastPayment.date) : new Date(loan.startDate);
    const dueDate = new Date(lastPaymentDate.setMonth(lastPaymentDate.getMonth() + 1));
    const borrower = myBorrowers.find(b => b.id === loan.borrowerId);

    return {
        loanId: loan.id,
        borrowerName: borrower?.name || 'Unknown',
        amountDue: loan.principal / loan.repaymentPeriod, // simplified
        dueDate: dueDate,
        balance: balance,
    }
  }).filter(p => p !== null && isAfter(p.dueDate, subDays(new Date(), 7)))
    .sort((a,b) => a!.dueDate.getTime() - b!.dueDate.getTime())
    .slice(0, 5);


  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-semibold">
        Welcome, {userProfile?.email.split('@')[0]}
      </h1>

      <DashboardMetrics loans={myLoans} payments={payments} borrowers={myBorrowers} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <BorrowerList isAddBorrowerOpen={isAddBorrowerOpen} setAddBorrowerOpen={setAddBorrowerOpen} />
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Payments</CardTitle>
            <CardDescription>Next 5 payments due for your clients.</CardDescription>
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
                                <TableCell className="text-right">MWK {p.amountDue.toLocaleString()}</TableCell>
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
  );
}
