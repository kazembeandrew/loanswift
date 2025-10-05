
'use client';

import { useParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, Paperclip, Upload, CircleDollarSign, Loader2, ShieldCheck, Scale, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import type { Borrower, Loan, Payment, RepaymentScheduleItem } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import ReceiptGenerator from '../components/receipt-generator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getBorrowerById } from '@/services/borrower-service';
import { getLoansByBorrowerId } from '@/services/loan-service';
import { addPayment, getAllPayments } from '@/services/payment-service';
import { getBorrowerAvatar } from '@/lib/placeholder-images';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


export default function BorrowerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { userProfile } = useAuth();
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [borrowerLoans, setBorrowerLoans] = useState<Loan[]>([]);
  const [allPayments, setAllPayments] = useState<(Payment & { loanId: string })[]>([]);
  
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isReceiptGeneratorOpen, setReceiptGeneratorOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({ amount: '', date: '' });
  const [receiptBalance, setReceiptBalance] = useState(0);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!id) return;
    const [borrowerData, loansData, paymentsData] = await Promise.all([
      getBorrowerById(id),
      getLoansByBorrowerId(id),
      getAllPayments(), // Fetch all payments to calculate balances correctly
    ]);
    setBorrower(borrowerData);
    setBorrowerLoans(loansData);
    setAllPayments(paymentsData);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  if (!borrower) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header title="Loading Borrower..." />
        <main className="flex-1 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  const getLoanBalance = (loan: Loan) => {
    const totalPaid = allPayments
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    return totalOwed - totalPaid;
  };
  
  const handleRecordPaymentClick = (loan: Loan) => {
    setSelectedLoan(loan);
    setPaymentDetails({ amount: '', date: new Date().toISOString().split('T')[0] });
    setRecordPaymentOpen(true);
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || !paymentDetails.amount) return;

    const newPaymentAmount = parseFloat(paymentDetails.amount);
    const balance = getLoanBalance(selectedLoan);

    if (newPaymentAmount > balance) {
      toast({
        title: 'Overpayment Warning',
        description: `This payment of MWK ${newPaymentAmount.toLocaleString()} exceeds the outstanding balance of MWK ${balance.toLocaleString()}. The payment was not recorded.`,
        variant: 'destructive',
      });
      return;
    }

    try {
        await addPayment(selectedLoan.id, {
            loanId: selectedLoan.id,
            amount: newPaymentAmount,
            date: paymentDetails.date || new Date().toISOString().split('T')[0],
            recordedBy: userProfile?.email || 'Staff Admin',
            method: 'cash',
        });

        setReceiptBalance(balance - newPaymentAmount);
        
        toast({
          title: 'Payment Recorded',
          description: `Payment of MWK ${newPaymentAmount.toLocaleString()} for loan ${selectedLoan.id} has been recorded.`,
        });

        setRecordPaymentOpen(false);
        setReceiptGeneratorOpen(true);

        await fetchData();
    } catch(error: any) {
         toast({
            title: 'Payment Failed',
            description: error.message || 'An unexpected error occurred while recording the payment.',
            variant: 'destructive',
        });
    }
  };

  const getLoanStatus = (loan: Loan): 'approved' | 'active' | 'closed' => {
      const balance = getLoanBalance(loan);
      if (balance <= 0) return 'closed';

      const paymentsForLoan = allPayments.filter(p => p.loanId === loan.id);
      if (paymentsForLoan.length > 0) return 'active';

      return 'approved';
  }
  
  const getRepaymentScheduleWithStatus = (loan: Loan): (RepaymentScheduleItem & { status: 'paid' | 'pending' | 'overdue' })[] => {
    if (!loan.repaymentSchedule) return [];
      
    const paymentsForLoan = allPayments.filter(p => p.loanId === loan.id);
    const totalPaid = paymentsForLoan.reduce((sum, p) => sum + p.amount, 0);

    let cumulativePaid = 0;
    let cumulativeDue = 0;

    return loan.repaymentSchedule.map(item => {
        cumulativeDue += item.amountDue;
        
        let status: 'paid' | 'pending' | 'overdue';

        if (totalPaid >= cumulativeDue) {
            status = 'paid';
        } else if (new Date() > new Date(item.dueDate) && totalPaid < cumulativeDue) {
            status = 'overdue';
        } else {
            status = 'pending';
        }

        return { ...item, status };
    });
  }

  const getLoanStatusVariant = (
    status: 'approved' | 'active' | 'closed'
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active':
        return 'default';
      case 'closed':
        return 'secondary';
      case 'approved':
        return 'outline';
      default:
          return 'default';
    }
  };
  
  const getScheduleStatusVariant = (
    status: 'paid' | 'pending' | 'overdue'
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
     switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'outline';
      case 'overdue':
        return 'destructive';
      default:
        return 'default';
    }
  }

  const avatarFallback = borrower.name.split(' ').map(n => n[0]).join('');

  const totalAmountLoaned = borrowerLoans.reduce((sum, loan) => sum + loan.principal, 0);
  const totalAmountRepaid = allPayments
    .filter(p => borrowerLoans.some(l => l.id === p.loanId))
    .reduce((sum, p) => sum + p.amount, 0);


  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Borrower Dashboard" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={getBorrowerAvatar(borrower.id)} alt="Avatar" data-ai-hint="user avatar" />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-headline text-3xl font-semibold">{borrower.name}</h1>
            <p className="text-muted-foreground">{borrower.idNumber}</p>
          </div>
        </div>

        <div className="grid gap-6 mt-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Phone:</strong> {borrower.phone}</p>
              <p><strong>Address:</strong> {borrower.address}</p>
              <p><strong>Guarantor:</strong> {borrower.guarantorName} ({borrower.guarantorPhone})</p>
              <p><strong>Joined:</strong> {new Date(borrower.joinDate).toLocaleDateString()}</p>
            </CardContent>
          </Card>
           <Card className="md:col-span-1">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 font-headline"><Scale className="h-5 w-5"/> Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-muted-foreground">Total Loaned to Borrower</p>
                    <p className="text-2xl font-bold">MWK {totalAmountLoaned.toLocaleString()}</p>
                </div>
                 <div>
                    <p className="text-sm text-muted-foreground">Total Repaid by Borrower</p>
                    <p className="text-2xl font-bold text-green-600">MWK {totalAmountRepaid.toLocaleString()}</p>
                </div>
            </CardContent>
          </Card>
        </div>

        <Card>
            <CardHeader>
              <CardTitle>Loan History</CardTitle>
              <CardDescription>Select a loan to view its details and repayment schedule.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {borrowerLoans.length > 0 ? (
                <Tabs defaultValue={borrowerLoans[0]?.id}>
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {borrowerLoans.map(loan => (
                            <TabsTrigger key={loan.id} value={loan.id}>{loan.id}</TabsTrigger>
                        ))}
                    </TabsList>
                    {borrowerLoans.map(loan => {
                        const balance = getLoanBalance(loan);
                        const status = getLoanStatus(loan);
                        const schedule = getRepaymentScheduleWithStatus(loan);
                        
                        return (
                            <TabsContent key={loan.id} value={loan.id}>
                                <div className="mt-4 p-4 border rounded-lg">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                      <div className="flex-1">
                                        <p className="font-semibold">{loan.id}</p>
                                        <p className="text-sm">Principal: MWK {loan.principal.toLocaleString()}</p>
                                        <p className={`text-sm font-medium ${status === 'closed' ? 'text-green-600' : 'text-destructive'}`}>
                                          Balance: MWK {balance.toLocaleString()}
                                        </p>
                                      </div>
                                       <div className="flex items-center gap-2 w-full sm:w-auto">
                                         <Badge variant={getLoanStatusVariant(status)} className="w-full sm:w-auto justify-center">{status}</Badge>
                                         {status !== 'closed' && (
                                          <Button variant="outline" size="sm" onClick={() => handleRecordPaymentClick(loan)} className="w-full sm:w-auto">
                                            <CircleDollarSign className="mr-2 h-4 w-4" />
                                            Record Payment
                                          </Button>
                                         )}
                                      </div>
                                    </div>
                                    
                                    <div className="mt-6">
                                        <h4 className="font-semibold flex items-center gap-2 mb-2"><CalendarDays className="h-4 w-4" />Repayment Schedule</h4>
                                        <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Due Date</TableHead>
                                                    <TableHead>Amount Due</TableHead>
                                                    <TableHead className="text-right">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {schedule.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{format(new Date(item.dueDate), 'PPP')}</TableCell>
                                                        <TableCell>MWK {item.amountDue.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge variant={getScheduleStatusVariant(item.status)}>{item.status}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        </div>
                                    </div>

                                </div>
                            </TabsContent>
                        )
                    })}
                </Tabs>
              ) : (
                <p className="text-muted-foreground text-center py-10">No loans found for this borrower.</p>
              )}
            </CardContent>
          </Card>
        
        {borrowerLoans.some(loan => loan.collateral && loan.collateral.length > 0) && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline"><ShieldCheck className="h-5 w-5"/> Collateral</CardTitle>
                    <CardDescription>Collateral items held against this borrower's loans.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {borrowerLoans.map(loan => 
                      loan.collateral && loan.collateral.length > 0 && (
                        <div key={loan.id}>
                            <h4 className="font-semibold mb-2">For Loan: {loan.id}</h4>
                            <ul className="space-y-2">
                            {loan.collateral.map((item, index) => (
                                <li key={index} className="flex justify-between items-center text-sm p-2 bg-muted rounded-md">
                                    <span>{item.name}</span>
                                    <span className="font-mono text-xs">MWK {item.value.toLocaleString()}</span>
                                </li>
                            ))}
                            </ul>
                        </div>
                      )
                    )}
                </CardContent>
            </Card>
        )}


        
          <Card>
             <CardHeader className="flex flex-row items-center gap-2">
               <MapPin className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="font-headline">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-64 w-full rounded-lg overflow-hidden border">
                 <iframe 
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=33.7823%2C-13.9626%2C33.7923%2C-13.9526&layer=mapnik&marker=-13.9576,33.7873`} 
                    style={{border: 0, width: '100%', height: '100%'}}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
              </div>
            </CardContent>
          </Card>
        
      </main>
      
      <Dialog open={isRecordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            {selectedLoan && <DialogDescription>
              For loan {selectedLoan.id} of {borrower?.name}.
            </DialogDescription>}
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <Input id="amount" type="number" className="col-span-3" value={paymentDetails.amount} onChange={(e) => setPaymentDetails(d => ({...d, amount: e.target.value}))}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <Input id="date" type="date" className="col-span-3" value={paymentDetails.date} onChange={(e) => setPaymentDetails(d => ({...d, date: e.target.value}))}/>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Generate Receipt</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {borrower && selectedLoan && (
        <ReceiptGenerator 
          isOpen={isReceiptGeneratorOpen}
          setIsOpen={setReceiptGeneratorOpen}
          borrower={borrower}
          loan={selectedLoan}
          paymentAmount={parseFloat(paymentDetails.amount) || 0}
          paymentDate={paymentDetails.date || new Date().toISOString().split('T')[0]}
          balance={receiptBalance}
        />
      )}

    </div>
  );
}

    