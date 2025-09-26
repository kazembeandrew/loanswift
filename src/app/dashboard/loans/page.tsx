
'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { customers as initialCustomers, loans as initialLoans, payments as initialPayments } from '@/lib/data';
import type { Customer, Loan, Payment } from '@/types';
import ReceiptGenerator from '../customers/components/receipt-generator';

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isReceiptGeneratorOpen, setReceiptGeneratorOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({ amount: '', date: '' });

  const getCustomerById = (id: string) => customers.find((c) => c.id === id);

  const getLoanStatusVariant = (
    status: 'Active' | 'Overdue' | 'Paid' | 'Pending'
  ) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Overdue':
        return 'destructive';
      case 'Paid':
        return 'secondary';
      case 'Pending':
        return 'outline';
      default:
        return 'default';
    }
  };
  
  const getLoanProgress = (loanId: string, principal: number) => {
    const paidAmount = payments
      .filter((p) => p.loanId === loanId)
      .reduce((acc, p) => acc + p.amount, 0);
    return (paidAmount / principal) * 100;
  };
  
  const handleRecordPaymentClick = (loan: Loan) => {
    setSelectedLoan(loan);
    setRecordPaymentOpen(true);
  }

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLoan && paymentDetails.amount) {
      const newPayment: Payment = {
        id: `PAY-${Date.now()}`,
        loanId: selectedLoan.id,
        amount: parseFloat(paymentDetails.amount),
        date: paymentDetails.date || new Date().toISOString().split('T')[0],
        recordedBy: 'Staff Admin',
      };
      setPayments(prev => [...prev, newPayment]);
      setRecordPaymentOpen(false);
      setReceiptGeneratorOpen(true);
    }
  };

  const selectedCustomer = selectedLoan ? getCustomerById(selectedLoan.customerId) : null;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Loans" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <div className="flex items-center">
          <h1 className="font-headline text-lg font-semibold md:text-2xl">
            Loan Payment Dashboard
          </h1>
        </div>
        <div className="rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => {
                const customer = getCustomerById(loan.customerId);
                const progress = getLoanProgress(loan.id, loan.principal);
                return (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.id}</TableCell>
                    <TableCell>{customer?.name}</TableCell>
                    <TableCell>MWK {loan.principal.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="w-full" />
                        <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getLoanStatusVariant(loan.status)}>
                        {loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRecordPaymentClick(loan)}>
                            Record Payment
                          </DropdownMenuItem>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </main>

       <Dialog open={isRecordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            {selectedLoan && <DialogDescription>
              For loan {selectedLoan.id} of {getCustomerById(selectedLoan.customerId)?.name}.
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
      
      {selectedCustomer && selectedLoan && (
        <ReceiptGenerator 
          isOpen={isReceiptGeneratorOpen}
          setIsOpen={setReceiptGeneratorOpen}
          customer={selectedCustomer}
          loan={selectedLoan}
          paymentAmount={parseFloat(paymentDetails.amount) || 0}
          paymentDate={paymentDetails.date || new Date().toISOString().split('T')[0]}
        />
      )}

    </div>
  );
}
