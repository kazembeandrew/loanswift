'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import type { Borrower, Loan, Payment, RepaymentScheduleItem } from '@/types';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import DashboardMetrics from './dashboard-metrics';
import BorrowerList from '../borrowers/components/borrower-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isAfter, format } from 'date-fns';
import { useDB } from '@/lib/firebase-provider';

type LoanOfficerDashboardProps = {
    isAddBorrowerOpen: boolean;
    setAddBorrowerOpen: (isOpen: boolean) => void;
};

type UpcomingPayment = {
    loanId: string;
    borrowerName: string;
    amountDue: number;
    dueDate: Date;
    balance: number;
};

export default function LoanOfficerDashboard({ isAddBorrowerOpen, setAddBorrowerOpen }: LoanOfficerDashboardProps) {
  const { user, userProfile } = useAuth();
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  const db = useDB();

  const fetchData = useCallback(async () => {
    // Admins/CEOs see all data, Loan Officers only see their own.
    const isAdminOrCeo = userProfile?.role === 'admin' || userProfile?.role === 'ceo' || userProfile?.role === 'cfo';
    
    const [allBorrowers, allLoans, allPayments] = await Promise.all([
      getBorrowers(db),
      getLoans(db),
      getAllPayments(db),
    ]);

    if (isAdminOrCeo) {
        setBorrowers(allBorrowers);
        setLoans(allLoans);
    } else if (userProfile) {
        const myBorrowers = allBorrowers.filter(b => b.loanOfficerId === userProfile.uid);
        const myLoanIds = allLoans.filter(l => myBorrowers.some(b => b.id === l.borrowerId)).map(l => l.id);
        setBorrowers(myBorrowers);
        setLoans(allLoans.filter(l => myLoanIds.includes(l.id)));
    }
    setPayments(allPayments);
  }, [userProfile, db]);

  useEffect(() => {
    if(userProfile) {
        fetchData();
    }
  }, [fetchData, userProfile]);

  const getLoanBalance = (loan: Loan) => {
    const totalPaid = payments
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    return totalOwed - totalPaid;
  };
  
  const getUpcomingPayments = (): UpcomingPayment[] => {
    const upcoming: UpcomingPayment[] = [];
    const now = new Date();

    loans.forEach(loan => {
        const balance = getLoanBalance(loan);
        if (balance <= 0 || !loan.repaymentSchedule) return;

        const totalPaid = payments
            .filter(p => p.loanId === loan.id)
            .reduce((sum, p) => sum + p.amount, 0);

        let cumulativeDue = 0;
        for (const installment of loan.repaymentSchedule) {
            cumulativeDue += installment.amountDue;
            // Find the first installment where the amount paid is less than the cumulative amount due
            if (totalPaid < cumulativeDue) {
                const borrower = borrowers.find(b => b.id === loan.borrowerId);
                upcoming.push({
                    loanId: loan.id,
                    borrowerName: borrower?.name || 'Unknown',
                    amountDue: installment.amountDue,
                    dueDate: new Date(installment.dueDate),
                    balance: balance,
                });
                // We only want the very next upcoming payment for each loan
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
        Welcome, {userProfile?.email.split('@')[0]}
      </h1>

      <DashboardMetrics loans={loans} payments={payments} borrowers={borrowers} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardContent className="p-0">
            <BorrowerList 
                isAddBorrowerOpen={isAddBorrowerOpen} 
                setAddBorrowerOpen={setAddBorrowerOpen}
                borrowers={borrowers}
                loans={loans}
                payments={payments}
                fetchData={fetchData}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
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
  );
}
