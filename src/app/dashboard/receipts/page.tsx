
'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Download, Eye, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Borrower, Loan, Payment } from '@/types';
import ReceiptGenerator from '../borrowers/components/receipt-generator';
import { useAuth } from '@/context/auth-context';
import { useRealtimeData } from '@/hooks/use-realtime-data';


const ExportButton = ({ payments, loans, borrowers }: { payments: (Payment & { loanId: string })[], loans: Loan[], borrowers: Borrower[] }) => {
  const { toast } = useToast();

  const getBorrowerByLoanId = (loanId: string): Borrower | null => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return null;
    return borrowers.find(c => c.id === loan.borrowerId) || null;
  };

  const handleExport = () => {
    if (payments.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'There are no receipts to export.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ["Receipt ID", "Borrower Name", "Loan ID", "Amount", "Date", "Recorded By"];
    const rows = payments.map(payment => {
      const borrower = getBorrowerByLoanId(payment.loanId);
      return [
        payment.id,
        borrower?.name || 'N/A',
        payment.loanId,
        payment.amount,
        payment.date,
        payment.recordedBy
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "receipts_export.csv");
    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Successful',
      description: 'The receipts data has been downloaded as a CSV file.',
    });
  };

  return (
    <Button onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export to CSV
    </Button>
  )
}

export default function ReceiptsPage() {
    const { user } = useAuth();
    const { payments, loans, borrowers, loading } = useRealtimeData(user);
    const [receiptInfo, setReceiptInfo] = useState<{
      isOpen: boolean;
      borrower: Borrower | null;
      loan: Loan | null;
      paymentAmount: number;
      paymentDate: string;
      newBalance: number;
  }>({ isOpen: false, borrower: null, loan: null, paymentAmount: 0, paymentDate: '', newBalance: 0 });

    const getBorrowerByLoanId = (loanId: string): Borrower | undefined => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return undefined;
        return borrowers.find(c => c.id === loan.borrowerId);
    };

    const handleViewReceipt = (payment: Payment & {loanId: string}) => {
        const loan = loans.find(l => l.id === payment.loanId);
        const borrower = loan ? borrowers.find(b => b.id === loan.borrowerId) : null;
        
        if (loan && borrower) {
            // Simplified balance for viewing an old receipt.
            const totalOwed = loan.principal * (1 + loan.interestRate / 100);
            const totalPaidUpToPayment = payments
                .filter(p => p.loanId === loan.id && new Date(p.date) <= new Date(payment.date))
                .reduce((sum, p) => sum + p.amount, 0);

            setReceiptInfo({
                isOpen: true,
                borrower,
                loan,
                paymentAmount: payment.amount,
                paymentDate: payment.date,
                newBalance: totalOwed - totalPaidUpToPayment,
            });
        }
    };
    
    if (loading) {
        return (
            <>
                <Header title="Receipts" />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </main>
            </>
        )
    }


  return (
    <>
      <Header title="Receipts" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
          <h1 className="font-headline text-lg font-semibold md:text-2xl">
            Receipts Register
          </h1>
          <div className="ml-auto">
            <ExportButton payments={payments} loans={loans} borrowers={borrowers} />
          </div>
        </div>
        <div className="rounded-lg border shadow-sm">
          {payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt ID (Payment)</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => {
                  const borrower = getBorrowerByLoanId(payment.loanId);
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.id}</TableCell>
                      <TableCell>{borrower?.name || 'N/A'}</TableCell>
                      <TableCell>{payment.loanId}</TableCell>
                      <TableCell>MWK {payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                      <TableCell>{payment.recordedBy}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewReceipt(payment)}>
                           <Eye className="mr-2 h-4 w-4"/> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-1 items-center justify-center rounded-lg border-dashed py-10">
              <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="font-headline text-2xl font-bold tracking-tight">
                  No receipts recorded
                </h3>
                <p className="text-sm text-muted-foreground">
                  Payments you record will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

       {receiptInfo.isOpen && receiptInfo.borrower && receiptInfo.loan && (
        <ReceiptGenerator 
          isOpen={receiptInfo.isOpen}
          setIsOpen={(isOpen) => setReceiptInfo(prev => ({...prev, isOpen}))}
          borrower={receiptInfo.borrower}
          loan={receiptInfo.loan}
          paymentAmount={receiptInfo.paymentAmount}
          paymentDate={receiptInfo.paymentDate}
          newBalance={receiptInfo.newBalance}
        />
      )}
    </>
  );
}

    
