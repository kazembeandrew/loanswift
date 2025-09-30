'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Briefcase, TrendingDown } from "lucide-react";
import type { Borrower, Loan, Payment } from '@/types';

type DashboardMetricsProps = {
    borrowers: Borrower[];
    loans: Loan[];
    payments: (Payment & { loanId: string })[];
};

export default function DashboardMetrics({ borrowers, loans, payments }: DashboardMetricsProps) {
    const getLoanBalance = (loan: Loan) => {
        const totalPaid = payments
          .filter(p => p.loanId === loan.id)
          .reduce((sum, p) => sum + p.amount, 0);
        const totalOwed = loan.principal * (1 + loan.interestRate / 100);
        return totalOwed - totalPaid;
    };

    const totalPortfolio = loans.reduce((sum, loan) => sum + loan.principal, 0);
    
    const portfolioAtRisk = loans
        .filter(loan => getLoanBalance(loan) > 0)
        .reduce((sum, loan) => sum + getLoanBalance(loan), 0);

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">My Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{borrowers.length}</div>
                    <p className="text-xs text-muted-foreground">Total active clients assigned.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">My Portfolio Principal</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">MWK {totalPortfolio.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total principal disbursed to your clients.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">My Portfolio at Risk</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">MWK {portfolioAtRisk.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total outstanding from your clients.</p>
                </CardContent>
            </Card>
        </div>
    )
}
