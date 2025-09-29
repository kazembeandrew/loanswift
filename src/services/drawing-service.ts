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
import type { Loan, Payment, Capital, Borrower, JournalEntry } from '@/types';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { getCapitalContributions } from '@/services/capital-service';
import { getJournalEntries } from '@/services/journal-service';
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
      journalEntriesData,
      borrowersData,
    ] = await Promise.all([
      getLoans(),
      getAllPayments(),
      getCapitalContributions(),
      getJournalEntries(),
      getBorrowers(),
    ]);

    const getBorrowerName = (borrowerId: string) => {
        return borrowersData.find(b => b.id === borrowerId)?.name || 'Unknown';
    }

    const allTransactions: Transaction[] = [];

    // Inflows
    capitalData.forEach(c => allTransactions.push({ date: c.date, description: `Capital Contribution`, amount: c.amount, type: 'inflow', category: 'Capital' }));
    paymentsData.forEach(p => {
        const loan = loansData.find(l => l.id === p.loanId);
        const borrowerName = loan ? getBorrowerName(loan.borrowerId) : 'Unknown';
        allTransactions.push({ date: p.date, description: `Payment from ${borrowerName} for Loan ${p.loanId}`, amount: p.amount, type: 'inflow', category: 'Payment' })
    });
    // Journal Entries that are Inflows (e.g. Misc Income credited to an income account, cash debited)
    journalEntriesData.forEach(j => {
        j.lines.forEach(line => {
            if (line.accountName === 'Cash on Hand' && line.type === 'debit') {
                 allTransactions.push({ date: j.date, description: j.description, amount: line.amount, type: 'inflow', category: 'Journal' });
            }
            // Simplified: Add other misc income here if needed
        });
    });


    // Outflows
    loansData.forEach(l => allTransactions.push({ date: l.startDate, description: `Loan Disbursement to ${getBorrowerName(l.borrowerId)} (${l.id})`, amount: l.principal, type: 'outflow', category: 'Lending' }));
    // Journal Entries that are Outflows (e.g. Expenses, Drawings where cash is credited)
    journalEntriesData.forEach(j => {
        j.lines.forEach(line => {
            if (line.accountName === 'Cash on Hand' && line.type === 'credit') {
                allTransactions.push({ date: j.date, description: j.description, amount: line.amount, type: 'outflow', category: 'Journal' });
            }
        });
    });

    const sortedTransactions = allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Recalculate balance based on sorted transactions
    const finalBalance = sortedTransactions.reduce((acc, t) => {
        return acc + (t.type === 'inflow' ? t.amount : -t.amount);
    }, 0);
    
    // Note: The balance calculation here is a simple cash flow summary.
    // The "official" balance should come from the Chart of Accounts ('Cash on Hand').
    // This is for display purposes on this page.

    setTransactions(sortedTransactions);
    setBalance(finalBalance);

  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalInflows = transactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);
  const totalOutflows = transactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = totalInflows - totalOutflows;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Banking" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", currentBalance >= 0 ? "text-primary" : "text-destructive")}>
                        MWK {currentBalance.toLocaleString()}
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
                <CardDescription>A complete log of all financial activities affecting cash.</CardDescription>
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