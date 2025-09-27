'use client';
import { useState, useEffect } from 'react';
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
import type { Borrower, Loan } from '@/types';
import { Loader2, Printer, Share2, Download, RefreshCw } from 'lucide-react';
import ReceiptPreview from '@/components/receipt-preview';
import Image from 'next/image';
import { getPlaceholderImage } from '@/lib/placeholder-images';

type ReceiptGeneratorProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  borrower: Borrower;
  loan: Loan;
  paymentAmount: number;
  paymentDate: string;
};

export default function ReceiptGenerator({
  isOpen,
  setIsOpen,
  borrower,
  loan,
  paymentAmount,
  paymentDate,
}: ReceiptGeneratorProps) {
  const [receiptText, setReceiptText] = useState<string | null>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const { toast } = useToast();
  
  const businessLogo = getPlaceholderImage('business-logo-small');

  const businessDetails = {
    name: 'Janalo Enterprises',
    address: 'Private Bag 292, Lilongwe',
    phone: '+265 996 566 091 / +265 880 663 248'
  };

  const generateReceiptText = async () => {
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
        businessName: businessDetails.name,
        businessAddress: businessDetails.address,
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
  };

  useEffect(() => {
    if (isOpen && !receiptText && !isGeneratingText) {
      generateReceiptText();
    }
  }, [isOpen, receiptText, isGeneratingText]);

  const generateImage = async () => {
    if (!receiptText || !receiptId) {
      toast({ title: 'Error', description: 'Receipt text not generated yet.', variant: 'destructive'});
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
            businessName: businessDetails.name,
            businessAddress: businessDetails.address,
            businessPhone: businessDetails.phone,
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

  const shareToWhatsApp = () => {
    if(receiptImageUrl) {
        toast({ title: 'Sharing', description: 'Please wait while we prepare the image for sharing.'});
        const newWindow = window.open();
        newWindow?.document.write(`<img src="${receiptImageUrl}" alt="Receipt" />`);
    } else {
        toast({ title: 'No Image', description: 'Please generate an image first.', variant: 'destructive'});
    }
  }

  const isLoading = isGeneratingText || isGeneratingImage;

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
            <div className="flex justify-center items-center h-48">
                <Button onClick={generateReceiptText}>Generate Receipt</Button>
            </div>
        )}

        {isGeneratingText && (
          <div className="flex flex-col items-center justify-center h-48 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Generating receipt text...</p>
          </div>
        )}

        {receiptText && receiptId && !receiptImageUrl && (
            <div className="space-y-4">
                 <ReceiptPreview 
                    receiptText={receiptText} 
                    receiptId={receiptId} 
                    paymentDate={paymentDate}
                    paymentAmount={paymentAmount}
                 />
                 <div className="flex justify-center items-center">
                    <Button onClick={generateImage} disabled={isGeneratingImage}>
                        {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Generate Image for Sharing
                    </Button>
                 </div>
            </div>
        )}
        
        {isGeneratingImage && (
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
               <Button variant="outline" onClick={shareToWhatsApp}>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
              <Button onClick={() => setReceiptImageUrl(null)}>
                View Original
              </Button>
            </div>
          </div>
        )}

        {!receiptImageUrl && receiptText && (
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
