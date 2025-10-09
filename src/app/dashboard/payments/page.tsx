
'use client';

import { useState, useTransition } from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Borrower, Loan, Payment } from '@/types';
import ReceiptGenerator from '../borrowers/components/receipt-generator';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { handleRecordPayment } from '@/app/actions/payment';
import { getBorrowerAvatar } from '@/lib/placeholder-images';
import { useAuth } from '@/context/auth-context';
import { useRealtimeData } from '@/hooks/use-realtime-data';


export default function PaymentsPage() {
  const { user } = useAuth();
  const { borrowers, loans, payments, loading } = useRealtimeData(user);
  
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [receiptInfo, setReceiptInfo] = useState<{
      isOpen: boolean;
      borrower: Borrower | null;
      loan: Loan | null;
      paymentAmount: number;
      paymentDate: string;
      newBalance: number;
  }>({ isOpen: false, borrower: null, loan: null, paymentAmount: 0, paymentDate: '', newBalance: 0 });

  const [isSubmittingPayment, startPaymentTransition] = useTransition();

  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({ amount: '', date: '' });
  const { toast } = useToast();

  const getBorrowerById = (id: string | null) => id ? borrowers.find((c) => c.id === id) : null;
  const getLoanById = (id: string | null) => id ? loans.find((l) => l.id === id) : null;

  const getLoanBalance = (loan: Loan) => {
    const totalPaid = payments
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    return totalOwed - totalPaid;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedLoan = getLoanById(selectedLoanId);

    if (!selectedLoan || !paymentDetails.amount || !user) {
      toast({
        title: 'Error',
        description: 'Please select a borrower, loan and enter an amount.',
        variant: 'destructive',
      });
      return;
    }

    startPaymentTransition(async () => {
        const paymentAmount = parseFloat(paymentDetails.amount);
        const result = await handleRecordPayment({
            loanId: selectedLoan.id,
            amount: paymentAmount,
            date: paymentDetails.date || new Date().toISOString().split('T')[0],
            recordedByEmail: user.email!,
        });

        if (result.success) {
            const borrower = getBorrowerById(selectedLoan.borrowerId);
            if (borrower) {
                 setReceiptInfo({
                    isOpen: true,
                    borrower,
                    loan: selectedLoan,
                    paymentAmount,
                    paymentDate: paymentDetails.date || new Date().toISOString().split('T')[0],
                    newBalance: result.newBalance,
                });
            }
            toast({
                title: 'Payment Recorded',
                description: `Payment of MWK ${paymentAmount.toLocaleString()} for loan ${selectedLoan.id} has been recorded.`,
            });
            setRecordPaymentOpen(false);
        } else {
            toast({
                title: 'Payment Failed',
                description: result.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
    });
  };

  const handleOpenRecordPayment = () => {
    setSelectedBorrowerId(null);
    setSelectedLoanId(null);
    setPaymentDetails({ amount: '', date: new Date().toISOString().split('T')[0] });
    setRecordPaymentOpen(true);
  }
  
  const recentPayments = payments.slice(0, 7);

  return (
    <>
      <Header title="Payments" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Record a Payment</CardTitle>
                    <CardDescription>
                        Manually enter a new payment from a borrower.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center text-center p-10">
                     <Button size="lg" onClick={handleOpenRecordPayment}>
                        <PlusCircle className="mr-2 h-5 w-5"/>
                        New Payment
                    </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                        A quick look at the latest payments recorded.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                   ) : (
                     <div className="space-y-4">
                       {recentPayments.length > 0 ? (
                        recentPayments.map(payment => {
                          const loan = getLoanById(payment.loanId);
                          if (!loan) return null;
                          const borrower = getBorrowerById(loan.borrowerId);
                          if (!borrower) return null;
                          const avatarFallback = borrower?.name.split(' ').map(n => n[0]).join('') || 'N/A';
                          
                          return (
                            <div className="flex items-center" key={payment.id}>
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={getBorrowerAvatar(borrower.id)} />
                                <AvatarFallback>{avatarFallback}</AvatarFallback>
                              </Avatar>
                              <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">{borrower.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Paid for Loan {payment.loanId} on {new Date(payment.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="ml-auto font-medium">
                                 +MWK {payment.amount.toLocaleString()}
                              </div>
                            </div>
                          )
                        })
                       ) : (
                        <p className="text-sm text-muted-foreground text-center pt-8">No recent payments.</p>
                       )}
                      </div>
                   )}
                </CardContent>
            </Card>
        </div>
      </main>

      <Dialog open={isRecordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
            <DialogDescription>
                Select a borrower and their loan to record a payment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="borrower" className="sm:text-right">
                        Borrower
                    </Label>
                    <Select onValueChange={setSelectedBorrowerId} value={selectedBorrowerId || ''}>
                        <SelectTrigger className="sm:col-span-3">
                            <SelectValue placeholder="Select a borrower" />
                        </SelectTrigger>
                        <SelectContent>
                            {borrowers.map(borrower => (
                                <SelectItem key={borrower.id} value={borrower.id}>
                                    {borrower.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {selectedBorrowerId && (
                     <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                        <Label htmlFor="loan" className="sm:text-right">
                            Loan
                        </Label>
                        <Select onValueChange={setSelectedLoanId} value={selectedLoanId || ''}>
                             <SelectTrigger className="sm:col-span-3">
                                <SelectValue placeholder="Select a loan" />
                            </SelectTrigger>
                            <SelectContent>
                                {loans.filter(l => l.borrowerId === selectedBorrowerId && getLoanBalance(l) > 0).map(loan => (
                                    <SelectItem key={loan.id} value={loan.id}>
                                        {loan.id} - Bal: MWK {getLoanBalance(loan).toLocaleString()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="sm:text-right">
                  Amount
                </Label>
                <Input id="amount" type="number" className="sm:col-span-3" value={paymentDetails.amount} onChange={(e) => setPaymentDetails(d => ({...d, amount: e.target.value}))}/>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="sm:text-right">
                  Date
                </Label>
                <Input id="date" type="date" className="sm:col-span-3" value={paymentDetails.date} onChange={(e) => setPaymentDetails(d => ({...d, date: e.target.value}))}/>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmittingPayment}>
                {isSubmittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {receiptInfo.isOpen && receiptInfo.borrower && receiptInfo.loan && (
        <ReceiptGenerator 
          isOpen={receiptInfo.isOpen}
          setIsOpen={(isOpen) => setReceiptInfo(prev => ({...prev, isOpen}))}
          borrower={receiptInfo.borrower}
          loan={receiptInfo.loan}
          paymentAmount={receiptInfo.paymentAmount}
          paymentDate={receiptInfo.paymentDate}
          balance={receiptInfo.newBalance}
        />
      )}
    </>
  );
}

    
