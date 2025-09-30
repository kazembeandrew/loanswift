'use client';
import { useState, useEffect, useCallback } from 'react';
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
import type { Borrower, Loan, BusinessSettings } from '@/types';
import { Loader2, Printer, Download } from 'lucide-react';
import ReceiptPreview from '@/components/receipt-preview';
import { getSettings } from '@/services/settings-service';

type ReceiptGeneratorProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  borrower: Borrower;
  loan: Loan;
  paymentAmount: number;
  paymentDate: string;
  balance?: number;
};

export default function ReceiptGenerator({
  isOpen,
  setIsOpen,
  borrower,
  loan,
  paymentAmount,
  paymentDate,
  balance = 0,
}: ReceiptGeneratorProps) {
  const [receiptText, setReceiptText] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const { toast } = useToast();
  
  
  useEffect(() => {
    if (isOpen) {
        getSettings().then(setSettings);
    }
  }, [isOpen]);


  const generateReceiptText = useCallback(async () => {
    if (!settings) {
        toast({ title: "Error", description: "Business settings not loaded.", variant: "destructive" });
        return;
    }
    setIsGeneratingText(true);
    setReceiptText(null);
    const newReceiptId = `RCPT-${Date.now()}`;
    setReceiptId(newReceiptId);
    try {
      const input = {
        customerName: borrower.name,
        loanId: loan.id,
        paymentAmount: paymentAmount,
        paymentDate: new Date(paymentDate).toISOString(),
        staffName: 'Staff Admin', // Hardcoded for now
        receiptId: newReceiptId,
        businessName: settings.businessName,
        businessAddress: settings.businessAddress,
        balance,
      };
      const result = await handleGenerateReceipt(input);
      setReceiptText(result.receiptText);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Generating Receipt Text',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingText(false);
    }
  }, [borrower, loan, paymentAmount, paymentDate, settings, toast, balance]);

  useEffect(() => {
    if (isOpen && settings && !receiptText && !isGeneratingText) {
      generateReceiptText();
    }
  }, [isOpen, settings, receiptText, isGeneratingText, generateReceiptText]);


  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReceiptText(null);
      setReceiptId(null);
    }
    setIsOpen(open);
  };
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const receiptElement = document.getElementById('receipt-preview');
      if (receiptElement) {
        const printableContent = `
            <html>
                <head>
                    <title>Print Receipt</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Belleza&display=swap" rel="stylesheet">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        body { 
                            font-family: 'Alegreya', serif;
                            -webkit-print-color-adjust: exact;
                        }
                        @page {
                            size: A5;
                            margin: 0;
                        }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    ${receiptElement.innerHTML}
                </body>
            </html>
        `;
        printWindow.document.write(printableContent);
        printWindow.document.close();
      }
    }
  };


  const isLoading = isGeneratingText || !settings;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md md:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
          <DialogDescription>
            A receipt has been generated for the payment of MWK {paymentAmount.toFixed(2)}.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-48 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
                {isGeneratingText ? 'Generating receipt content...' : 'Loading settings...'}
            </p>
          </div>
        )}
        
        <div style={{ display: !isLoading && receiptText ? 'block' : 'none' }}>
           {receiptText && receiptId && settings && (
             <ReceiptPreview 
                receiptText={receiptText} 
                receiptId={receiptId} 
                paymentDate={paymentDate}
                paymentAmount={paymentAmount}
                businessInfo={settings}
                borrower={borrower}
                loan={loan}
             />
           )}
        </div>


        {!isLoading && receiptText && (
             <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => toast({ title: 'Coming Soon!', description: 'PDF download will be available soon.'})}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
