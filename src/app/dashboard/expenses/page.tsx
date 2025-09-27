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
import { PlusCircle, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addExpenseRecord, getExpenseRecords } from '@/services/expense-service';
import type { Expense } from '@/types';


export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newExpense, setNewExpense] = useState<{ amount: string; date: string; category: Expense['category'] | ''; description: string; }>({ amount: '', date: '', category: '', description: '' });
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        const data = await getExpenseRecords();
        setExpenses(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.amount || !newExpense.date || !newExpense.category) {
            toast({
                title: 'Missing Information',
                description: 'Please provide amount, date, and category.',
                variant: 'destructive',
            });
            return;
        }

        const expenseData: Omit<Expense, 'id'> = {
            amount: parseFloat(newExpense.amount),
            date: newExpense.date,
            category: newExpense.category,
            description: newExpense.description,
        };

        await addExpenseRecord(expenseData);

        toast({
            title: 'Expense Recorded',
            description: `A new expense of MWK ${expenseData.amount.toLocaleString()} has been recorded.`,
        });

        setIsDialogOpen(false);
        setNewExpense({ amount: '', date: '', category: '', description: '' });
        await fetchData();
    };

    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Expenses" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">MWK {totalExpenses.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total operational expenses recorded.</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>Expense Log</CardTitle>
                    <CardDescription>A log of all operational business expenses.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="ml-auto gap-1">
                            <PlusCircle className="h-4 w-4" />
                            Record Expense
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Record New Expense</DialogTitle>
                            <DialogDescription>Record a new business expense.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddExpense}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="amount" className="text-right">Amount</Label>
                                    <Input id="amount" type="number" className="col-span-3" value={newExpense.amount} onChange={(e) => setNewExpense(d => ({ ...d, amount: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="date" className="text-right">Date</Label>
                                    <Input id="date" type="date" className="col-span-3" value={newExpense.date} onChange={(e) => setNewExpense(d => ({ ...d, date: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="category" className="text-right">Category</Label>
                                    <Select onValueChange={(value: Expense['category']) => setNewExpense(d => ({ ...d, category: value }))} value={newExpense.category || ''}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="rent">Rent</SelectItem>
                                            <SelectItem value="salaries">Salaries</SelectItem>
                                            <SelectItem value="utilities">Utilities</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="description" className="text-right">Description</Label>
                                    <Input id="description" className="col-span-3" value={newExpense.description} onChange={(e) => setNewExpense(d => ({ ...d, description: e.target.value }))} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Save Expense</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                 {expenses.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                                    <TableCell className="capitalize">{item.category}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right">MWK {item.amount.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-10">
                        <div className="flex flex-col items-center gap-1 text-center">
                            <h3 className="font-headline text-2xl font-bold tracking-tight">No expenses recorded</h3>
                            <p className="text-sm text-muted-foreground">Record your first business expense to get started.</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
