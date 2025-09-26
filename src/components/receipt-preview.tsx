import { Landmark } from 'lucide-react';

export default function ReceiptPreview({ receiptText }: { receiptText: string }) {
  return (
    <>
      <style>
        {`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-preview, #receipt-preview * {
            visibility: visible;
          }
          #receipt-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}
      </style>
      <div
        id="receipt-preview"
        className="mt-4 rounded-lg border bg-card p-6 text-card-foreground shadow-sm"
      >
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
             <Landmark className="size-10 text-primary" />
             <div>
                <h2 className="font-headline text-2xl font-semibold text-primary">
                Janalo Enterprises
                </h2>
                <p className="text-sm text-muted-foreground">123 Finance St, Moneytown, USA</p>
             </div>
          </div>
          <h3 className="font-headline text-xl font-semibold">Payment Receipt</h3>
        </div>
        <pre className="mt-4 font-body text-sm whitespace-pre-wrap">{receiptText}</pre>
      </div>
    </>
  );
}
