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
import { PlusCircle, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addCapitalContribution, getCapitalContributions } from '@/services/capital-service';
import type { Capital } from '@/types';


export default function CapitalPage() {
    const [contributions, setContributions] = useState<Capital[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newContribution, setNewContribution] = useState({ amount: '', date: '' });
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        const data = await getCapitalContributions();
        setContributions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddContribution = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContribution.amount || !newContribution.date) {
            toast({
                title: 'Missing Information',
                description: 'Please provide both an amount and a date.',
                variant: 'destructive',
            });
            return;
        }

        const contributionData: Omit<Capital, 'id'> = {
            amount: parseFloat(newContribution.amount),
            date: newContribution.date,
            type: 'additional' // For now, all new contributions are 'additional'
        };

        await addCapitalContribution(contributionData);

        toast({
            title: 'Contribution Recorded',
            description: `A new capital contribution of MWK ${contributionData.amount.toLocaleString()} has been recorded.`,
        });

        setIsDialogOpen(false);
        setNewContribution({ amount: '', date: '' });
        await fetchData();
    };

    const totalCapital = contributions.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Capital" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Capital</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">MWK {totalCapital.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total capital invested in the business.</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>Capital Contributions</CardTitle>
                    <CardDescription>A log of all initial and additional capital contributions.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="ml-auto gap-1">
                            <PlusCircle className="h-4 w-4" />
                            Record Contribution
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Record New Capital Contribution</DialogTitle>
                            <DialogDescription>Add a new capital injection into the business.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddContribution}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="amount" className="text-right">Amount</Label>
                                    <Input id="amount" type="number" className="col-span-3" value={newContribution.amount} onChange={(e) => setNewContribution(d => ({ ...d, amount: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="date" className="text-right">Date</Label>
                                    <Input id="date" type="date" className="col-span-3" value={newContribution.date} onChange={(e) => setNewContribution(d => ({ ...d, date: e.target.value }))} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Save Contribution</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                 {contributions.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contributions.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">MWK {item.amount.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-10">
                        <div className="flex flex-col items-center gap-1 text-center">
                            <h3 className="font-headline text-2xl font-bold tracking-tight">No contributions recorded</h3>
                            <p className="text-sm text-muted-foreground">Record your first capital contribution to get started.</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
