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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/context/auth-context';
import { useDB } from '@/lib/firebase-provider';

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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const db = useDB();
  
  
  useEffect(() => {
    if (isOpen) {
        getSettings(db).then(setSettings);
    }
  }, [isOpen, db]);


  const generateReceiptText = useCallback(async () => {
    if (!settings || !userProfile) {
        toast({ title: "Error", description: "Business settings or user profile not loaded.", variant: "destructive" });
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
        staffName: userProfile.email,
        receiptId: newReceiptId,
        businessName: settings.businessName,
        businessAddress: settings.businessAddress,
        balance,
      };
      const result = await handleGenerateReceipt(input);
      setReceiptText(result.receiptText);
    } catch (error) {
      toast({
        title: 'Error Generating Receipt Text',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingText(false);
    }
  }, [borrower, loan, paymentAmount, paymentDate, settings, toast, balance, userProfile]);

  useEffect(() => {
    if (isOpen && settings && userProfile && !receiptText && !isGeneratingText) {
      generateReceiptText();
    }
  }, [isOpen, settings, userProfile, receiptText, isGeneratingText, generateReceiptText]);


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

  const handleDownloadPdf = async () => {
    const receiptElement = document.getElementById('receipt-preview');
    if (!receiptElement || !receiptId) {
        toast({title: "Error", description: "Receipt element not found for PDF generation.", variant: "destructive"});
        return;
    }

    setIsDownloadingPdf(true);

    try {
        const canvas = await html2canvas(receiptElement, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        
        // A5 size in mm is 148 x 210. We'll use landscape.
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a5',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`receipt-${receiptId}.pdf`);

        toast({title: "Download Started", description: "Your receipt PDF is downloading."});
    } catch(error) {
        toast({title: "PDF Error", description: "Failed to generate PDF.", variant: "destructive"});
    } finally {
        setIsDownloadingPdf(false);
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
              <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
                {isDownloadingPdf ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Download className="mr-2 h-4 w-4" />
                )}
                 Download PDF
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
