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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addIncomeRecord, getIncomeRecords } from '@/services/income-service';
import type { Income } from '@/types';


export default function IncomePage() {
    const [income, setIncome] = useState<Income[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newIncome, setNewIncome] = useState<{ amount: string; date: string; source: Income['source'] | ''; loanId?: string; }>({ amount: '', date: '', source: '' });
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        const data = await getIncomeRecords();
        setIncome(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddIncome = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIncome.amount || !newIncome.date || !newIncome.source) {
            toast({
                title: 'Missing Information',
                description: 'Please provide amount, date, and source.',
                variant: 'destructive',
            });
            return;
        }

        const incomeData: Omit<Income, 'id'> = {
            amount: parseFloat(newIncome.amount),
            date: newIncome.date,
            source: newIncome.source,
            loanId: newIncome.loanId || undefined,
        };

        await addIncomeRecord(incomeData);

        toast({
            title: 'Income Recorded',
            description: `New income of MWK ${incomeData.amount.toLocaleString()} has been recorded.`,
        });

        setIsDialogOpen(false);
        setNewIncome({ amount: '', date: '', source: '' });
        await fetchData();
    };

    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Income" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Miscellaneous Income</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">MWK {totalIncome.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Does not include interest from loans.</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>Miscellaneous Income Log</CardTitle>
                    <CardDescription>A log of all manually recorded income, such as fees or penalties.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="ml-auto gap-1">
                            <PlusCircle className="h-4 w-4" />
                            Record Income
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Record New Income</DialogTitle>
                            <DialogDescription>Record new income from sources other than loan interest.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddIncome}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="amount" className="text-right">Amount</Label>
                                    <Input id="amount" type="number" className="col-span-3" value={newIncome.amount} onChange={(e) => setNewIncome(d => ({ ...d, amount: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="date" className="text-right">Date</Label>
                                    <Input id="date" type="date" className="col-span-3" value={newIncome.date} onChange={(e) => setNewIncome(d => ({ ...d, date: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="source" className="text-right">Source</Label>
                                    <Select onValueChange={(value: Income['source']) => setNewIncome(d => ({ ...d, source: value }))} value={newIncome.source || ''}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select a source" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fees">Fees</SelectItem>
                                            <SelectItem value="penalty">Penalty</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="loanId" className="text-right">Loan ID (Optional)</Label>
                                    <Input id="loanId" className="col-span-3" value={newIncome.loanId} onChange={(e) => setNewIncome(d => ({ ...d, loanId: e.target.value }))} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Save Income</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                 {income.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Loan ID</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {income.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                                    <TableCell className="capitalize">{item.source}</TableCell>
                                    <TableCell>{item.loanId || 'N/A'}</TableCell>
                                    <TableCell className="text-right">MWK {item.amount.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-10">
                        <div className="flex flex-col items-center gap-1 text-center">
                            <h3 className="font-headline text-2xl font-bold tracking-tight">No miscellaneous income recorded</h3>
                            <p className="text-sm text-muted-foreground">Record your first miscellaneous income transaction to get started.</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
