'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { getAccounts } from '@/services/account-service';
import type { Account } from '@/types';
import { useAuth } from '@/context/auth-context';

export default function IncomeStatement() {
  const [incomeAccounts, setIncomeAccounts] = useState<Account[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userProfile } = useAuth();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const allAccounts = await getAccounts();
    setIncomeAccounts(allAccounts.filter(a => a.type === 'income'));
    setExpenseAccounts(allAccounts.filter(a => a.type === 'expense'));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (userProfile?.role === 'admin' || userProfile?.role === 'ceo') {
      fetchData();
    }
  }, [fetchData, userProfile]);

  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'ceo')) {
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
