'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { handleGenerateReceipt } from '@/app/actions/receipt';
import type { Customer, Loan } from '@/types';
import { Loader2, Printer, Share2, Download } from 'lucide-react';
import ReceiptPreview from '@/components/receipt-preview';

type ReceiptGeneratorProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  customer: Customer;
  loan: Loan;
  paymentAmount: number;
  paymentDate: string;
};

export default function ReceiptGenerator({
  isOpen,
  setIsOpen,
  customer,
  loan,
  paymentAmount,
  paymentDate,
}: ReceiptGeneratorProps) {
  const [receiptText, setReceiptText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateReceipt = async () => {
    setIsLoading(true);
    setReceiptText(null);
    try {
      const input = {
        customerName: customer.name,
        loanId: loan.id,
        paymentAmount: paymentAmount,
        paymentDate: new Date(paymentDate).toISOString(),
        staffName: 'Staff Admin', // Hardcoded for now
        receiptId: `RCPT-${Date.now()}`,
        businessName: 'LoanSwift Inc.',
        businessAddress: '123 Finance St, Moneytown, USA',
      };
      const result = await handleGenerateReceipt(input);
      setReceiptText(result.receiptText);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Generating Receipt',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReceiptText(null);
    }
    setIsOpen(open);
  };
  
  const handlePrint = () => {
    window.print();
  };

  const shareToWhatsApp = () => {
    if(receiptText) {
      const url = `https://wa.me/?text=${encodeURIComponent(receiptText)}`;
      window.open(url, '_blank');
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate Payment Receipt</DialogTitle>
          <DialogDescription>
            A receipt will be generated for the payment of MWK {paymentAmount.toFixed(2)}.
          </DialogDescription>
        </DialogHeader>
        {!receiptText && !isLoading && (
            <div className="flex justify-center items-center h-40">
                <Button onClick={generateReceipt}>Generate Receipt</Button>
            </div>
        )}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-40 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Generating receipt...</p>
          </div>
        )}
        {receiptText && (
          <div>
            <ReceiptPreview receiptText={receiptText} />
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => toast({ title: 'Coming Soon!', description: 'PDF download will be available soon.'})}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
               <Button variant="outline" onClick={shareToWhatsApp}>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
