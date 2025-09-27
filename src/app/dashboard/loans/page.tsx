'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import type { Borrower, Loan, Payment } from '@/types';
import ReceiptGenerator from '../borrowers/components/receipt-generator';
import { useToast } from '@/hooks/use-toast';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments, addPayment } from '@/services/payment-service';


export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isReceiptGeneratorOpen, setReceiptGeneratorOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({ amount: '', date: '' });
  const { toast } = useToast();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const [loansData, borrowersData, paymentsData] = await Promise.all([
      getLoans(),
      getBorrowers(),
      getAllPayments(),
    ]);
    setLoans(loansData);
    setBorrowers(borrowersData);
    setPayments(paymentsData);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getBorrowerById = (id: string) => borrowers.find((c) => c.id === id);

  const getLoanBalance = (loan: Loan) => {
    const totalPaid = payments
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    return totalOwed - totalPaid;
  };
  
  const getLoanStatus = (loan: Loan): 'approved' | 'active' | 'closed' => {
      const balance = getLoanBalance(loan);
      if (balance <= 0) return 'closed';

      const paymentsForLoan = payments.filter(p => p.loanId === loan.id);
      if (paymentsForLoan.length > 0) return 'active';

      return 'approved';
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
  
  const getLoanProgress = (loan: Loan) => {
    const totalPaid = payments
      .filter((p) => p.loanId === loan.id)
      .reduce((acc, p) => acc + p.amount, 0);
    
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    if (totalOwed === 0) return 100;
    return (totalPaid / totalOwed) * 100;
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

    const newPaymentData: Omit<Payment, 'id'> = {
      loanId: selectedLoan.id,
      amount: newPaymentAmount,
      date: paymentDetails.date || new Date().toISOString().split('T')[0],
      recordedBy: 'Staff Admin',
      method: 'cash',
    };

    await addPayment(selectedLoan.id, newPaymentData);
    
    toast({
      title: 'Payment Recorded',
      description: `Payment of MWK ${newPaymentData.amount} for loan ${selectedLoan.id} has been recorded.`,
    });

    setRecordPaymentOpen(false);
    setReceiptGeneratorOpen(true);
    
    await fetchData();
  };

  const handleViewDetails = (loan: Loan) => {
    router.push(`/dashboard/borrowers/${loan.borrowerId}`);
  };

  const selectedBorrower = selectedLoan ? getBorrowerById(selectedLoan.borrowerId) : null;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Loans" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <div className="flex items-center">
          <h1 className="font-headline text-lg font-semibold md:text-2xl">
            Loan Portfolio
          </h1>
        </div>
        <div className="rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Loan ID</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead className="hidden sm:table-cell">Principal</TableHead>
                <TableHead className="hidden md:table-cell">Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => {
                const borrower = getBorrowerById(loan.borrowerId);
                const progress = getLoanProgress(loan);
                const status = getLoanStatus(loan);

                return (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.id}</TableCell>
                    <TableCell>{borrower?.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">MWK {loan.principal.toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="w-24" />
                        <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getLoanStatusVariant(status)}>
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={status === 'closed'}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRecordPaymentClick(loan)} disabled={status === 'closed'}>
                            Record Payment
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetails(loan)}>
                            View Details
                          </DropdownMenuItem>
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
              For loan {selectedLoan.id} of {getBorrowerById(selectedLoan.borrowerId)?.name}.
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
      
      {selectedBorrower && selectedLoan && (
        <ReceiptGenerator 
          isOpen={isReceiptGeneratorOpen}
          setIsOpen={setReceiptGeneratorOpen}
          borrower={selectedBorrower}
          loan={selectedLoan}
          paymentAmount={parseFloat(paymentDetails.amount) || 0}
          paymentDate={paymentDetails.date || new Date().toISOString().split('T')[0]}
        />
      )}

    </div>
  );
}
