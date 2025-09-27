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
import { PlusCircle, PiggyBank } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDrawingRecord, getDrawingRecords } from '@/services/drawing-service';
import type { Drawing } from '@/types';


export default function DrawingsPage() {
    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newDrawing, setNewDrawing] = useState({ amount: '', date: '', description: '' });
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        const data = await getDrawingRecords();
        setDrawings(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddDrawing = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDrawing.amount || !newDrawing.date) {
            toast({
                title: 'Missing Information',
                description: 'Please provide both an amount and a date.',
                variant: 'destructive',
            });
            return;
        }

        const drawingData: Omit<Drawing, 'id'> = {
            amount: parseFloat(newDrawing.amount),
            date: newDrawing.date,
            description: newDrawing.description
        };

        await addDrawingRecord(drawingData);

        toast({
            title: 'Drawing Recorded',
            description: `A new owner drawing of MWK ${drawingData.amount.toLocaleString()} has been recorded.`,
        });

        setIsDialogOpen(false);
        setNewDrawing({ amount: '', date: '', description: '' });
        await fetchData();
    };

    const totalDrawings = drawings.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Drawings" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Drawings</CardTitle>
                    <PiggyBank className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">MWK {totalDrawings.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total funds withdrawn by the owner.</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>Owner Drawings</CardTitle>
                    <CardDescription>A log of all funds withdrawn from the business by the owner.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="ml-auto gap-1">
                            <PlusCircle className="h-4 w-4" />
                            Record Drawing
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Record New Owner Drawing</DialogTitle>
                            <DialogDescription>Record a new withdrawal of funds from the business.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddDrawing}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="amount" className="text-right">Amount</Label>
                                    <Input id="amount" type="number" className="col-span-3" value={newDrawing.amount} onChange={(e) => setNewDrawing(d => ({ ...d, amount: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="date" className="text-right">Date</Label>
                                    <Input id="date" type="date" className="col-span-3" value={newDrawing.date} onChange={(e) => setNewDrawing(d => ({ ...d, date: e.target.value }))} />
                                </div>
                                 <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="description" className="text-right">Description</Label>
                                    <Input id="description" className="col-span-3" value={newDrawing.description} onChange={(e) => setNewDrawing(d => ({ ...d, description: e.target.value }))} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Save Drawing</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                 {drawings.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {drawings.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right">MWK {item.amount.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-10">
                        <div className="flex flex-col items-center gap-1 text-center">
                            <h3 className="font-headline text-2xl font-bold tracking-tight">No drawings recorded</h3>
                            <p className="text-sm text-muted-foreground">Record your first owner drawing to get started.</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
