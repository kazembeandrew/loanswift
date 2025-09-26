'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { payments as initialPayments, loans as initialLoans, customers as initialCustomers } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ExportButton = () => {
  const { toast } = useToast();
  return (
      <Button onClick={() => toast({ title: 'Coming Soon!', description: 'Excel export will be available soon.'})}>
      <Download className="mr-2 h-4 w-4" />
      Export to Excel
    </Button>
  )
}

export default function ReceiptsPage() {
    const getCustomerByLoanId = (loanId: string) => {
        const loan = initialLoans.find(l => l.id === loanId);
        if (!loan) return null;
        return initialCustomers.find(c => c.id === loan.customerId);
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
            <ExportButton />
          </div>
        </div>
        <div className="rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt ID (Payment)</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Loan ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialPayments.map(payment => {
                const customer = getCustomerByLoanId(payment.loanId);
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell>{customer?.name || 'N/A'}</TableCell>
                    <TableCell>{payment.loanId}</TableCell>
                    <TableCell>MWK {payment.amount.toLocaleString()}</TableCell>
                    <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                    <TableCell>{payment.recordedBy}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
