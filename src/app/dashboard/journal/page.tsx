
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, BookCopy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAccounts } from '@/services/account-service';
import { getJournalEntries, addJournalEntry } from '@/services/journal-service';
import type { Account, JournalEntry } from '@/types';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const transactionLineSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  type: z.enum(['debit', 'credit']),
  amount: z.coerce.number().positive('Amount must be positive'),
});

const journalFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  lines: z.array(transactionLineSchema).min(2, 'At least two lines are required'),
}).refine(data => {
    const totalDebits = data.lines.filter(l => l.type === 'debit').reduce((sum, l) => sum + l.amount, 0);
    const totalCredits = data.lines.filter(l => l.type === 'credit').reduce((sum, l) => sum + l.amount, 0);
    return Math.abs(totalDebits - totalCredits) < 0.01;
}, {
    message: 'Total debits must equal total credits.',
    path: ['lines'],
});


export default function JournalPage() {
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof journalFormSchema>>({
        resolver: zodResolver(journalFormSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            description: '',
            lines: [
                { accountId: '', type: 'debit', amount: 0 },
                { accountId: '', type: 'credit', amount: 0 }
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines",
    });

    const fetchData = useCallback(async () => {
        const [entriesData, accountsData] = await Promise.all([
            getJournalEntries(),
            getAccounts()
        ]);
        setJournalEntries(entriesData);
        setAccounts(accountsData);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const watchLines = form.watch('lines');
    const totalDebits = watchLines.filter(l => l.type === 'debit').reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalCredits = watchLines.filter(l => l.type === 'credit').reduce((sum, l) => sum + (l.amount || 0), 0);
    const difference = totalDebits - totalCredits;


    const handleAddEntry = async (values: z.infer<typeof journalFormSchema>) => {
        const linesWithNames = values.lines.map(line => {
            const account = accounts.find(a => a.id === line.accountId);
            return {...line, accountName: account?.name || 'Unknown' };
        });

        try {
            await addJournalEntry({ ...values, lines: linesWithNames });
            toast({
                title: 'Journal Entry Created',
                description: `The entry "${values.description}" has been posted.`,
            });
            setAddDialogOpen(false);
            form.reset();
            await fetchData();
        } catch (error: any) {
            toast({
                title: 'Error creating entry',
                description: error.message || 'An unknown error occurred.',
                variant: 'destructive',
            });
        }
    };
    
    const getAccountName = (accountId: string) => {
        return accounts.find(a => a.id === accountId)?.name || 'Unknown Account';
    }


  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Journal Entries" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>General Journal</CardTitle>
                    <CardDescription>Record all financial transactions using debits and credits.</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if(!open) form.reset(); }}>
                    <DialogTrigger asChild>
                        <Button className="ml-auto gap-1">
                            <PlusCircle className="h-4 w-4" />
                            New Entry
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>New Journal Entry</DialogTitle>
                        </DialogHeader>
                        <div className="flex-grow overflow-y-auto pr-6">
                        <Form {...form}>
                          <form id="journal-form" onSubmit={form.handleSubmit(handleAddEntry)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Paid monthly office rent" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Transaction Lines</Label>
                                <div className="rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-1/2">Account</TableHead>
                                                <TableHead>Debit</TableHead>
                                                <TableHead>Credit</TableHead>
                                                <TableHead className="w-12"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.map((field, index) => (
                                                <TableRow key={field.id}>
                                                    <TableCell>
                                                        <FormField control={form.control} name={`lines.${index}.accountId`} render={({ field }) => (
                                                            <FormItem><Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger></FormControl>
                                                                <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.type})</SelectItem>)}</SelectContent>
                                                            </Select><FormMessage /></FormItem>
                                                        )}/>
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormField control={form.control} name={`lines.${index}.amount`} render={({ field }) => (
                                                            <FormItem><FormControl><Input type="number" {...field} disabled={watchLines[index].type === 'credit'} onChange={e => {
                                                                field.onChange(e.target.valueAsNumber);
                                                                form.setValue(`lines.${index}.type`, 'debit');
                                                            }} /></FormControl><FormMessage /></FormItem>
                                                        )}/>
                                                    </TableCell>
                                                     <TableCell>
                                                        <FormField control={form.control} name={`lines.${index}.amount`} render={({ field }) => (
                                                            <FormItem><FormControl><Input type="number" {...field} disabled={watchLines[index].type === 'debit'} onChange={e => {
                                                                field.onChange(e.target.valueAsNumber);
                                                                form.setValue(`lines.${index}.type`, 'credit');
                                                            }} /></FormControl><FormMessage /></FormItem>
                                                        )}/>
                                                    </TableCell>
                                                    <TableCell>
                                                        {fields.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ accountId: '', type: 'debit', amount: 0 })}>Add Line</Button>
                            </div>
                            {form.formState.errors.lines && <p className="text-sm font-medium text-destructive">{form.formState.errors.lines.message}</p>}
                          </form>
                        </Form>
                        </div>

                         <DialogFooter className="border-t pt-4 mt-auto">
                            <div className="flex w-full justify-between items-center">
                                <div className="text-sm">
                                    <p>Totals: <span className="font-mono">D: {totalDebits.toLocaleString()}</span> / <span className="font-mono">C: {totalCredits.toLocaleString()}</span></p>
                                    <p className={difference !== 0 ? 'text-destructive' : 'text-green-600'}>Difference: <span className="font-mono">{difference.toLocaleString()}</span></p>
                                </div>
                                <Button type="submit" form="journal-form">Post Entry</Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                 {journalEntries.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount (Debit/Credit)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {journalEntries.map(entry => (
                                <>
                                <TableRow key={entry.id} className="bg-muted/50">
                                    <TableCell className="font-medium">{new Date(entry.date).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-medium col-span-2">{entry.description}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                                {entry.lines.map((line, index) => (
                                    <TableRow key={`${entry.id}-${index}`}>
                                        <TableCell></TableCell>
                                        <TableCell className={line.type === 'credit' ? 'pl-8' : ''}>{line.accountName}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {line.type === 'debit' ? `${line.amount.toLocaleString()}` : ''}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {line.type === 'credit' ? `${line.amount.toLocaleString()}` : ''}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                </>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-10">
                        <div className="flex flex-col items-center gap-1 text-center">
                            <BookCopy className="h-12 w-12 text-muted-foreground" />
                            <h3 className="font-headline text-2xl font-bold tracking-tight mt-4">No journal entries found</h3>
                            <p className="text-sm text-muted-foreground">Create your first journal entry to record a transaction.</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
