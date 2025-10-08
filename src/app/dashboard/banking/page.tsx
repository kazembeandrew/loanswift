'use client';

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
import type { JournalEntry, Account } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { useMemo } from 'react';

type CashTransaction = {
  date: string;
  description: string;
  amount: number;
  type: 'inflow' | 'outflow';
  category: string; // From journal entry description
};

export default function BankingPage() {
  const { user } = useAuth();
  const { journalEntries, accounts, loading: isLoading } = useRealtimeData(user);

  const cashAccount = accounts.find(a => a.name === 'Cash on Hand');
  const cashBalance = cashAccount ? cashAccount.balance : 0;

  const transactions: CashTransaction[] = useMemo(() => {
    const cashTransactions: CashTransaction[] = [];
    journalEntries.forEach(j => {
      const cashLine = j.lines.find(line => line.accountName === 'Cash on Hand');
      
      if (cashLine) {
        const otherLine = j.lines.find(line => line.accountName !== 'Cash on Hand');
        const category = otherLine ? otherLine.accountName : 'Journal Entry';

        cashTransactions.push({
          date: j.date,
          description: j.description,
          amount: cashLine.amount,
          type: cashLine.type === 'debit' ? 'inflow' : 'outflow',
          category: category,
        });
      }
    });
    return cashTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [journalEntries]);


  const totalInflows = transactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);
  const totalOutflows = transactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);

  if (isLoading) {
    return (
      <>
        <Header title="Banking" />
        <main className="flex flex-1 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Banking" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cash on Hand</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", cashBalance >= 0 ? "text-primary" : "text-destructive")}>
                        MWK {cashBalance.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Official balance from your Chart of Accounts.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Inflows (Debits)</CardTitle>
                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">MWK {totalInflows.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">All money debited to the cash account.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Outflows (Credits)</CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">MWK {totalOutflows.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">All money credited from the cash account.</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Cash Transaction History</CardTitle>
                <CardDescription>A log of all journal entries affecting your cash account.</CardDescription>
            </CardHeader>
            <CardContent>
                 {transactions.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Counterparty Account</TableHead>
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
                            <h3 className="font-headline text-2xl font-bold tracking-tight">No cash transactions recorded</h3>
                            <p className="text-sm text-muted-foreground">Journal entries affecting "Cash on Hand" will appear here.</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </>
  );
}
