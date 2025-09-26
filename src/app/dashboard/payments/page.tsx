
'use client';

import { useState } from 'react';
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
import {
  customers as initialCustomers,
  loans as initialLoans,
  payments as initialPayments,
} from '@/lib/data';
import type { Customer, Loan, Payment } from '@/types';
import ReceiptGenerator from '../customers/components/receipt-generator';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function PaymentsPage() {
  const [customers] = useState<Customer[]>(initialCustomers);
  const [loans] = useState<Loan[]>(initialLoans);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isReceiptGeneratorOpen, setReceiptGeneratorOpen] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({ amount: '', date: '' });
  const { toast } = useToast();

  const getCustomerById = (id: string | null) => id ? customers.find((c) => c.id === id) : null;
  const getLoanById = (id: string | null) => id ? loans.find((l) => l.id === id) : null;

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedLoan = getLoanById(selectedLoanId);
    if (selectedLoan && paymentDetails.amount) {
       const newPayment: Payment = {
        id: `PAY-${Date.now()}`,
        loanId: selectedLoan.id,
        amount: parseFloat(paymentDetails.amount),
        date: paymentDetails.date || new Date().toISOString().split('T')[0],
        recordedBy: 'Staff Admin',
      };
      setPayments(prev => [newPayment, ...prev]); 
      
      toast({
        title: 'Payment Recorded',
        description: `Payment of MWK ${newPayment.amount} for loan ${newPayment.loanId} has been recorded.`,
      });

      setRecordPaymentOpen(false);
      setReceiptGeneratorOpen(true);
    } else {
        toast({
            title: 'Error',
            description: 'Please select a customer, loan and enter an amount.',
            variant: 'destructive'
        })
    }
  };

  const handleOpenRecordPayment = () => {
    setSelectedCustomerId(null);
    setSelectedLoanId(null);
    setPaymentDetails({ amount: '', date: new Date().toISOString().split('T')[0] });
    setRecordPaymentOpen(true);
  }

  const selectedCustomerForDialog = getCustomerById(selectedCustomerId);
  const selectedLoanForDialog = getLoanById(selectedLoanId);
  
  const recentPayments = payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Payments" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Record a Payment</CardTitle>
                    <CardDescription>
                        Manually enter a new payment from a customer.
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
                          const customer = getCustomerById(loan.customerId);
                          if (!customer) return null;
                          const avatarFallback = customer?.name.split(' ').map(n => n[0]).join('') || 'N/A';
                          
                          return (
                            <div className="flex items-center" key={payment.id}>
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={`https://picsum.photos/seed/${customer.id}/100/100`} alt="Avatar" data-ai-hint="user avatar" />
                                <AvatarFallback>{avatarFallback}</AvatarFallback>
                              </Avatar>
                              <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">{customer.name}</p>
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
                Select a customer and their loan to record a payment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customer" className="text-right">
                        Customer
                    </Label>
                    <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId || ''}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                        <SelectContent>
                            {customers.map(customer => (
                                <SelectItem key={customer.id} value={customer.id}>
                                    {customer.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {selectedCustomerId && (
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="loan" className="text-right">
                            Loan
                        </Label>
                        <Select onValueChange={setSelectedLoanId} value={selectedLoanId || ''}>
                             <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a loan" />
                            </SelectTrigger>
                            <SelectContent>
                                {loans.filter(l => l.customerId === selectedCustomerId).map(loan => (
                                    <SelectItem key={loan.id} value={loan.id}>
                                        {loan.id} - MWK {loan.principal.toLocaleString()} ({loan.status})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
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
      
      {selectedCustomerForDialog && selectedLoanForDialog && (
        <ReceiptGenerator 
          isOpen={isReceiptGeneratorOpen}
          setIsOpen={setReceiptGeneratorOpen}
          customer={selectedCustomerForDialog}
          loan={selectedLoanForDialog}
          paymentAmount={parseFloat(paymentDetails.amount) || 0}
          paymentDate={paymentDetails.date || new Date().toISOString().split('T')[0]}
        />
      )}
    </div>
  );
}
