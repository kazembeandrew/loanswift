'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Flag, CheckCircle, ListTodo } from 'lucide-react';
import type { Borrower, Loan, Payment, SituationReport } from '@/types';
import { differenceInDays, isAfter, subDays, format } from 'date-fns';

type Task = {
    type: 'overdue' | 'report' | 'follow-up';
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
};

type MyTasksProps = {
    borrowers: Borrower[];
    loans: Loan[];
    payments: (Payment & { loanId: string })[];
    situationReports: SituationReport[];
};

export default function MyTasks({ borrowers, loans, payments, situationReports }: MyTasksProps) {
    const tasks = useMemo<Task[]>(() => {
        const allTasks: Task[] = [];
        const now = new Date();

        // Task Type 1: Overdue Loans
        loans.forEach(loan => {
            const totalPaid = payments
                .filter(p => p.loanId === loan.id)
                .reduce((sum, p) => sum + p.amount, 0);
            
            const totalOwed = loan.principal * (1 + loan.interestRate / 100);
            if (totalPaid >= totalOwed) return; // Loan is fully paid

            let cumulativeDue = 0;
            for (const installment of loan.repaymentSchedule) {
                cumulativeDue += installment.amountDue;
                if (totalPaid < cumulativeDue) {
                    const dueDate = new Date(installment.dueDate);
                    if (isAfter(now, subDays(dueDate, -7))) {
                        const borrower = borrowers.find(b => b.id === loan.borrowerId);
                        allTasks.push({
                            type: 'overdue',
                            title: `Overdue: ${borrower?.name || 'Unknown'}`,
                            description: `Payment due on ${format(dueDate, 'PPP')} for loan ${loan.id}.`,
                            href: `/dashboard/borrowers/${loan.borrowerId}`,
                            icon: <AlertTriangle className="h-4 w-4 text-destructive" />
                        });
                    }
                    break; // Found the first missed payment for this loan
                }
            }
        });

        // Task Type 2: Open Situation Reports
        situationReports
            .filter(report => report.status === 'Open')
            .forEach(report => {
                const borrower = borrowers.find(b => b.id === report.borrowerId);
                allTasks.push({
                    type: 'report',
                    title: `Review Report: ${borrower?.name || 'Unknown'}`,
                    description: `Report on "${report.summary}" needs review.`,
                    href: `/dashboard/borrowers/${report.borrowerId}`,
                    icon: <Flag className="h-4 w-4 text-blue-500" />
                });
            });

        // Task Type 3: Loans Nearing Completion
        loans.forEach(loan => {
             const totalPaid = payments
                .filter(p => p.loanId === loan.id)
                .reduce((sum, p) => sum + p.amount, 0);
            const totalOwed = loan.principal * (1 + loan.interestRate / 100);

            if (totalOwed > 0 && totalPaid > 0 && totalPaid < totalOwed) {
                const percentagePaid = (totalPaid / totalOwed) * 100;
                if (percentagePaid >= 90) {
                     const borrower = borrowers.find(b => b.id === loan.borrowerId);
                     allTasks.push({
                        type: 'follow-up',
                        title: `Follow-up: ${borrower?.name || 'Unknown'}`,
                        description: `Loan ${loan.id} is ${Math.floor(percentagePaid)}% paid. Prepare for closure.`,
                        href: `/dashboard/borrowers/${loan.borrowerId}`,
                        icon: <CheckCircle className="h-4 w-4 text-green-500" />
                    });
                }
            }
        });


        return allTasks;
    }, [borrowers, loans, payments, situationReports]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5" />
                    My Tasks
                </CardTitle>
                <CardDescription>Actionable items that require your attention.</CardDescription>
            </CardHeader>
            <CardContent>
                {tasks.length > 0 ? (
                    <div className="space-y-3">
                        {tasks.slice(0, 5).map((task, index) => (
                            <div key={index} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                                <div className="mt-1">{task.icon}</div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium leading-none">{task.title}</p>
                                    <p className="text-xs text-muted-foreground">{task.description}</p>
                                </div>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={task.href}>View</Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-24 text-center">
                        <p className="text-muted-foreground">No urgent tasks right now.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}