'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import type { Borrower, Loan, Payment, RepaymentScheduleItem, SituationReport } from '@/types';
import { getBorrowersByLoanOfficer } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { getAllSituationReports } from '@/services/situation-report-service';
import DashboardMetrics from './dashboard-metrics';
import BorrowerList from '../borrowers/components/borrower-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isAfter } from 'date-fns';
import { useDB } from '@/lib/firebase-client-provider';
import MyTasks from './my-tasks';

type LoanOfficerDashboardProps = {
    
};

type UpcomingPayment = {
    loanId: string;
    borrowerName: string;
    amountDue: number;
    dueDate: Date;
    balance: number;
};

export default function LoanOfficerDashboard({}: LoanOfficerDashboardProps) {
  const { userProfile } = useAuth();
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  const [situationReports, setSituationReports] = useState<SituationReport[]>([]);
  const db = useDB();

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    
    // Loan officers only see their own data.
    const myBorrowers = await getBorrowersByLoanOfficer(db, userProfile.uid);
    const myBorrowerIds = myBorrowers.map(b => b.id);
    
    // Fetch all loans and payments, then filter client-side. This is less secure but simpler
    // for this iteration. A more secure implementation would use security rules and specific queries.
    const [allLoans, allPayments, allReports] = await Promise.all([
      getLoans(db),
      getAllPayments(db),
      getAllSituationReports(db),
    ]);

    const myLoans = allLoans.filter(l => myBorrowerIds.includes(l.borrowerId));
    
    setBorrowers(myBorrowers);
    setLoans(myLoans);
    setPayments(allPayments); // Payments are filtered within components where needed
    setSituationReports(allReports.filter(r => myBorrowerIds.includes(r.borrowerId)));

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
                fetchData={fetchData}
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
