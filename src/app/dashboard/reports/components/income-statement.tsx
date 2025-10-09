
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import type { Account } from '@/types';
import { useAuth } from '@/context/auth-context';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { useMemo } from 'react';

export default function IncomeStatement() {
  const { userProfile, user } = useAuth();
  const { accounts, loading: isLoading } = useRealtimeData(user);

  const showFinancialReports = userProfile?.role === 'admin' || userProfile?.role === 'ceo' || userProfile?.role === 'cfo';

  const { incomeAccounts, expenseAccounts } = useMemo(() => {
    return {
      incomeAccounts: accounts.filter(a => a.type === 'income'),
      expenseAccounts: accounts.filter(a => a.type === 'expense'),
    }
  }, [accounts]);

  if (!showFinancialReports) {
    return null; 
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income Statement</CardTitle>
          <CardDescription>For the period to date.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = incomeAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const netIncome = totalRevenue - totalExpenses;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Statement</CardTitle>
        <CardDescription>A summary of revenues and expenses for the period to date.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            <TableRow className="font-semibold">
              <TableCell>Operating Revenue</TableCell>
              <TableCell></TableCell>
            </TableRow>
            {incomeAccounts.map(acc => (
              <TableRow key={acc.id}>
                <TableCell className="pl-6">{acc.name}</TableCell>
                <TableCell className="text-right">MWK {acc.balance.toLocaleString()}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold border-t">
              <TableCell>Total Revenue</TableCell>
              <TableCell className="text-right">MWK {totalRevenue.toLocaleString()}</TableCell>
            </TableRow>
            
            <TableRow className="font-semibold pt-4">
              <TableCell>Operating Expenses</TableCell>
              <TableCell></TableCell>
            </TableRow>
            {expenseAccounts.map(acc => (
              <TableRow key={acc.id}>
                <TableCell className="pl-6">{acc.name}</TableCell>
                <TableCell className="text-right">MWK {acc.balance.toLocaleString()}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold border-t">
              <TableCell>Total Expenses</TableCell>
              <TableCell className="text-right">MWK {totalExpenses.toLocaleString()}</TableCell>
            </TableRow>

            <TableRow className="font-bold text-lg border-t-2 border-primary">
              <TableCell>Net Income</TableCell>
              <TableCell className="text-right">MWK {netIncome.toLocaleString()}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
