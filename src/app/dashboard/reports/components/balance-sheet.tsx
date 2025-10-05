
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle } from 'lucide-react';
import { getAccounts } from '@/services/account-service';
import type { Account } from '@/types';
import { useAuth } from '@/context/auth-context';

export default function BalanceSheet() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userProfile } = useAuth();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const allAccounts = await getAccounts();
    setAccounts(allAccounts);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (userProfile?.role === 'admin' || userProfile?.role === 'ceo' || userProfile?.role === 'cfo') {
      fetchData();
    }
  }, [fetchData, userProfile]);

  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'ceo' && userProfile.role !== 'cfo')) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Sheet</CardTitle>
          <CardDescription>As of today.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  
  const assets = accounts.filter(a => a.type === 'asset');
  const liabilities = accounts.filter(a => a.type === 'liability');
  const equity = accounts.filter(a => a.type === 'equity');

  const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
  const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  
  const balanceDifference = totalAssets - totalLiabilitiesAndEquity;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Sheet</CardTitle>
        <CardDescription>A snapshot of the company's financial position.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
            <div>
                <h3 className="font-semibold mb-2">Assets</h3>
                <Table>
                    <TableBody>
                        {assets.map(acc => (
                            <TableRow key={acc.id}>
                                <TableCell>{acc.name}</TableCell>
                                <TableCell className="text-right">MWK {acc.balance.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                         <TableRow className="font-bold border-t-2">
                            <TableCell>Total Assets</TableCell>
                            <TableCell className="text-right">MWK {totalAssets.toLocaleString()}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
            <div>
                 <h3 className="font-semibold mb-2">Liabilities &amp; Equity</h3>
                 <Table>
                    <TableBody>
                        {liabilities.length > 0 && <TableRow className="font-semibold"><TableCell colSpan={2}>Liabilities</TableCell></TableRow>}
                        {liabilities.map(acc => (
                            <TableRow key={acc.id}>
                                <TableCell className="pl-6">{acc.name}</TableCell>
                                <TableCell className="text-right">MWK {acc.balance.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                         <TableRow className="font-semibold border-t">
                            <TableCell>Total Liabilities</TableCell>
                            <TableCell className="text-right">MWK {totalLiabilities.toLocaleString()}</TableCell>
                        </TableRow>

                        <TableRow className="font-semibold"><TableCell colSpan={2}>Equity</TableCell></TableRow>
                        {equity.map(acc => (
                            <TableRow key={acc.id}>
                                <TableCell className="pl-6">{acc.name}</TableCell>
                                <TableCell className="text-right">MWK {acc.balance.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                         <TableRow className="font-semibold border-t">
                            <TableCell>Total Equity</TableCell>
                            <TableCell className="text-right">MWK {totalEquity.toLocaleString()}</TableCell>                        </TableRow>
                        
                         <TableRow className="font-bold border-t-2">
                            <TableCell>Total Liabilities &amp; Equity</TableCell>
                            <TableCell className="text-right">MWK {totalLiabilitiesAndEquity.toLocaleString()}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
        {Math.abs(balanceDifference) > 0.01 && (
             <div className="mt-4 p-4 bg-destructive/10 border border-destructive/50 text-destructive rounded-lg flex items-center gap-3">
                <AlertTriangle className="h-5 w-5"/>
                <div>
                    <h4 className="font-bold">Out of Balance!</h4>
                    <p className="text-sm">Assets do not equal Liabilities + Equity. The difference is MWK {balanceDifference.toLocaleString()}. Please review journal entries for errors.</p>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
