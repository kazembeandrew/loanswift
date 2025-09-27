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
import { handleGenerateReceipt, handleGenerateReceiptImage } from '@/app/actions/receipt';
import type { Borrower, Loan, BusinessSettings } from '@/types';
import { Loader2, Printer, Share2, Download, RefreshCw } from 'lucide-react';
import ReceiptPreview from '@/components/receipt-preview';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/placeholder-images';
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
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const { toast } = useToast();
  
  const businessLogo = getPlaceholderImage('business-logo-small');
  
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
    setReceiptImageUrl(null);
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
        businessLogoDataUri: businessLogo?.imageUrl,
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
  }, [borrower, loan, paymentAmount, paymentDate, settings, businessLogo, toast, balance]);

  useEffect(() => {
    if (isOpen && settings && !receiptText && !isGeneratingText) {
      generateReceiptText();
    }
  }, [isOpen, settings, receiptText, isGeneratingText, generateReceiptText]);

  const generateImage = async () => {
    if (!receiptText || !receiptId || !settings) {
      toast({ title: 'Error', description: 'Receipt text or settings not available yet.', variant: 'destructive'});
      return;
    }
    setIsGeneratingImage(true);
    setReceiptImageUrl(null);
    try {
        const input = {
            receiptText,
            receiptId,
            paymentDate: new Date(paymentDate).toLocaleDateString(),
            paymentAmount,
            businessName: settings.businessName,
            businessAddress: settings.businessAddress,
            businessPhone: settings.businessPhone,
            businessLogoDataUri: businessLogo?.imageUrl,
        };
        const result = await handleGenerateReceiptImage(input);
        setReceiptImageUrl(result.imageUrl);

    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Generating Receipt Image',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
        setIsGeneratingImage(false);
    }
  };


  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReceiptText(null);
      setReceiptId(null);
      setReceiptImageUrl(null);
    }
    setIsOpen(open);
  };
  
  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!receiptImageUrl) {
      toast({ title: 'No Image', description: 'Please generate an image first.', variant: 'destructive' });
      return;
    }
    try {
      // Convert data URI to blob for sharing
      const response = await fetch(receiptImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `receipt-${receiptId}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Payment Receipt ${receiptId}`,
          text: `Here is the receipt for your payment of MWK ${paymentAmount.toLocaleString()}.`,
          files: [file],
        });
      } else {
        // Fallback for browsers that don't support navigator.share with files
        const newWindow = window.open();
        newWindow?.document.write(`
          <html>
            <head><title>Receipt ${receiptId}</title></head>
            <body style="margin:0; background: #333; display:flex; justify-content:center; align-items:center;">
              <img src="${receiptImageUrl}" alt="Receipt" style="max-width:100%; max-height:100%;" />
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({ title: 'Sharing Failed', description: 'Could not share the receipt image.', variant: 'destructive' });
    }
  };


  const isLoading = isGeneratingText || isGeneratingImage || !settings;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate Payment Receipt</DialogTitle>
          <DialogDescription>
            A receipt will be generated for the payment of MWK {paymentAmount.toFixed(2)}.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-48 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
                {isGeneratingText ? 'Generating receipt text...' : isGeneratingImage ? 'Generating receipt image...' : 'Loading settings...'}
            </p>
          </div>
        )}

        {!isLoading && receiptText && receiptId && !receiptImageUrl && (
            <div className="space-y-4">
                 <ReceiptPreview 
                    receiptText={receiptText} 
                    receiptId={receiptId} 
                    paymentDate={paymentDate}
                    paymentAmount={paymentAmount}
                    businessInfo={settings!}
                 />
                 <div className="flex justify-center items-center">
                    <Button onClick={generateImage} disabled={isGeneratingImage}>
                        {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Generate Image for Sharing
                    </Button>
                 </div>
            </div>
        )}
        
        {isGeneratingImage && !receiptImageUrl && (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Generating receipt image...</p>
                <p className="text-sm text-muted-foreground">This can take up to 30 seconds.</p>
            </div>
        )}


        {receiptImageUrl && (
          <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                <Image src={receiptImageUrl} alt="Generated Receipt" layout="fill" objectFit="contain" />
            </div>
            <div className="mt-6 flex justify-end gap-2">
               <Button variant="outline" onClick={generateImage} disabled={isGeneratingImage}>
                <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
              </Button>
              <Button variant="outline" onClick={() => toast({ title: 'Coming Soon!', description: 'PDF download will be available soon.'})}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
               <Button variant="outline" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
              <Button onClick={() => setReceiptImageUrl(null)}>
                View Original
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !receiptImageUrl && receiptText && (
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
