'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments, addPayment } from '@/services/payment-service';
import { getBorrowerAvatar } from '@/lib/placeholder-images';


export default function PaymentsPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isReceiptGeneratorOpen, setReceiptGeneratorOpen] = useState(false);

  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({ amount: '', date: '' });
  const [receiptBalance, setReceiptBalance] = useState(0);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const [borrowersData, loansData, paymentsData] = await Promise.all([
      getBorrowers(),
      getLoans(),
      getAllPayments(),
    ]);
    setBorrowers(borrowersData);
    setLoans(loansData);
    setPayments(paymentsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


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

    if (!selectedLoan || !paymentDetails.amount) {
      toast({
        title: 'Error',
        description: 'Please select a borrower, loan and enter an amount.',
        variant: 'destructive',
      });
      return;
    }

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

    const newPaymentData: Omit<Payment, 'id'> = {
      loanId: selectedLoan.id,
      amount: newPaymentAmount,
      date: paymentDetails.date || new Date().toISOString().split('T')[0],
      recordedBy: 'Staff Admin',
      method: 'cash',
    };

    await addPayment(selectedLoan.id, newPaymentData);

    setReceiptBalance(balance - newPaymentAmount);

    toast({
      title: 'Payment Recorded',
      description: `Payment of MWK ${newPaymentData.amount} for loan ${newPaymentData.loanId} has been recorded.`,
    });

    setRecordPaymentOpen(false);
    setReceiptGeneratorOpen(true);

    await fetchData();
  };

  const handleOpenRecordPayment = () => {
    setSelectedBorrowerId(null);
    setSelectedLoanId(null);
    setPaymentDetails({ amount: '', date: new Date().toISOString().split('T')[0] });
    setRecordPaymentOpen(true);
  }

  const selectedBorrowerForDialog = getBorrowerById(selectedBorrowerId);
  const selectedLoanForDialog = getLoanById(selectedLoanId);
  
  const recentPayments = payments.slice(0, 7);

  return (
    <div className="flex min-h-screen w-full flex-col">
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
                                <AvatarImage src={getBorrowerAvatar(borrower.id)} alt="Avatar" data-ai-hint="user avatar" />
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
              <Button type="submit">Generate Receipt</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {selectedBorrowerForDialog && selectedLoanForDialog && (
        <ReceiptGenerator 
          isOpen={isReceiptGeneratorOpen}
          setIsOpen={setReceiptGeneratorOpen}
          borrower={selectedBorrowerForDialog}
          loan={selectedLoanForDialog}
          paymentAmount={parseFloat(paymentDetails.amount) || 0}
          paymentDate={paymentDetails.date || new Date().toISOString().split('T')[0]}
          balance={receiptBalance}
        />
      )}
    </div>
  );
}
