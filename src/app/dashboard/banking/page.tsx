'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';
import type { Loan, Payment, Capital, Income, Expense, Drawing, Borrower } from '@/types';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { getCapitalContributions } from '@/services/capital-service';
import { getIncomeRecords } from '@/services/income-service';
import { getExpenseRecords } from '@/services/expense-service';
import { getDrawingRecords } from '@/services/drawing-service';
import { getBorrowers } from '@/services/borrower-service';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Transaction = {
  date: string;
  description: string;
  amount: number;
  type: 'inflow' | 'outflow';
  category: string;
};

export default function BankingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);

  const fetchData = useCallback(async () => {
    const [
      loansData,
      paymentsData,
      capitalData,
      incomeData,
      expenseData,
      drawingData,
      borrowersData,
    ] = await Promise.all([
      getLoans(),
      getAllPayments(),
      getCapitalContributions(),
      getIncomeRecords(),
      getExpenseRecords(),
      getDrawingRecords(),
      getBorrowers(),
    ]);

    const getBorrowerName = (borrowerId: string) => {
        return borrowersData.find(b => b.id === borrowerId)?.name || 'Unknown';
    }

    const allTransactions: Transaction[] = [];

    // Inflows
    capitalData.forEach(c => allTransactions.push({ date: c.date, description: `Capital Contribution`, amount: c.amount, type: 'inflow', category: 'Capital' }));
    incomeData.forEach(i => allTransactions.push({ date: i.date, description: `Misc. Income: ${i.source}`, amount: i.amount, type: 'inflow', category: 'Income' }));
    paymentsData.forEach(p => {
        const loan = loansData.find(l => l.id === p.loanId);
        const borrowerName = loan ? getBorrowerName(loan.borrowerId) : 'Unknown';
        allTransactions.push({ date: p.date, description: `Payment from ${borrowerName} for Loan ${p.loanId}`, amount: p.amount, type: 'inflow', category: 'Payment' })
    });

    // Outflows
    loansData.forEach(l => allTransactions.push({ date: l.startDate, description: `Loan Disbursement to ${getBorrowerName(l.borrowerId)} (${l.id})`, amount: l.principal, type: 'outflow', category: 'Lending' }));
    expenseData.forEach(e => allTransactions.push({ date: e.date, description: `Expense: ${e.description || e.category}`, amount: e.amount, type: 'outflow', category: 'Expense' }));
    drawingData.forEach(d => allTransactions.push({ date: d.date, description: `Owner Drawing: ${d.description || 'N/A'}`, amount: d.amount, type: 'outflow', category: 'Drawing' }));

    const sortedTransactions = allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let runningBalance = 0;
    sortedTransactions.forEach(t => {
        runningBalance += t.type === 'inflow' ? t.amount : -t.amount;
    });

    setTransactions(sortedTransactions);
    setBalance(runningBalance);

  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalInflows = transactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);
  const totalOutflows = transactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Banking" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", balance >= 0 ? "text-primary" : "text-destructive")}>
                        MWK {balance.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Total inflows minus total outflows.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Inflows</CardTitle>
                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">MWK {totalInflows.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">All money coming into the business.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Outflows</CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">MWK {totalOutflows.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">All money leaving the business.</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>A complete log of all financial activities.</CardDescription>
            </CardHeader>
            <CardContent>
                 {transactions.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                                    <TableCell className={cn("text-right font-medium", item.type === 'inflow' ? 'text-green-600' : 'text-red-600')}>
                                        {item.type === 'inflow' ? '+' : '-'} MWK {item.amount.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-10">
                        <div className="flex flex-col items-center gap-1 text-center">
                            <h3 className="font-headline text-2xl font-bold tracking-tight">No transactions recorded</h3>
                            <p className="text-sm text-muted-foreground">Your financial history will appear here.</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
