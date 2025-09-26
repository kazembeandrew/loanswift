'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Borrower, Loan, Payment } from '@/types';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';


const ExportButton = ({ payments, loans, borrowers }: { payments: Payment[], loans: Loan[], borrowers: Borrower[] }) => {
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
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [borrowers, setBorrowers] = useState<Borrower[]>([]);

    const fetchData = useCallback(async () => {
      const [paymentsData, loansData, borrowersData] = await Promise.all([
        getAllPayments(),
        getLoans(),
        getBorrowers(),
      ]);
      setPayments(paymentsData);
      setLoans(loansData);
      setBorrowers(borrowersData);
    }, []);

    useEffect(() => {
      fetchData();
    }, [fetchData]);

    const getBorrowerByLoanId = (loanId: string) => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return null;
        return borrowers.find(c => c.id === loan.borrowerId);
    };

  return (
    <div className="flex min-h-screen w-full flex-col">
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
    </div>
  );
}
