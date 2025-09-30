import type { BusinessSettings, Borrower, Loan } from '@/types';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import QRCode from "react-qr-code";

type ReceiptPreviewProps = {
  receiptText: string;
  receiptId: string;
  paymentDate: string;
  paymentAmount: number;
  businessInfo: BusinessSettings;
  borrower: Borrower;
  loan: Loan;
};

export default function ReceiptPreview({
  receiptText,
  receiptId,
  paymentDate,
  paymentAmount,
  businessInfo,
  borrower,
  loan,
}: ReceiptPreviewProps) {
  const lines = receiptText.split('\n');
  const businessLogo = getPlaceholderImage('business-logo-small');
  
  const qrValue = `RECEIPT:${receiptId},BORROWER:${borrower.id},LOAN:${loan.id},AMOUNT:${paymentAmount}`;

  return (
    <div
      id="receipt-preview"
      className="mt-4 rounded-lg border bg-white p-8 text-black shadow-sm font-sans"
      style={{ width: '210mm', minHeight: '148mm' }} // A5 size
    >
        <style>{`
          #receipt-preview { color: black; }
          .font-headline { font-family: 'Belleza', sans-serif; }
          .font-body { font-family: 'Alegreya', serif; }
        `}</style>
      <header className="flex justify-between items-center pb-4 border-b-2 border-black">
        <div className="flex items-center gap-4">
           {businessLogo && <img src={businessLogo.imageUrl} alt="Business Logo" className="h-20 w-20" data-ai-hint={businessLogo.imageHint} />}
           <div>
              <h1 className="font-headline text-5xl font-bold text-black">
                {businessInfo.businessName}
              </h1>
              <p className="text-sm">{businessInfo.businessAddress} | {businessInfo.businessPhone}</p>
           </div>
        </div>
        <div className="text-right">
            <h2 className="font-headline text-3xl font-bold text-gray-800">PAYMENT RECEIPT</h2>
            <p className="text-sm">Receipt No: <span className="font-mono">{receiptId}</span></p>
            <p className="text-sm">Date: <span className="font-mono">{new Date(paymentDate).toLocaleDateString()}</span></p>
        </div>
      </header>

      <main className="mt-8 grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4 text-lg">
          {lines.map((line, index) => {
            const [label, ...valueParts] = line.split(/:(.*)/s);
            const value = valueParts.join(':').trim();
            return (
              <div key={index} className="flex items-baseline">
                <span className="font-bold w-40">{label}:</span>
                <span className="flex-1 border-b-2 border-dotted border-gray-400 font-mono text-base">
                  {value}
                </span>
              </div>
            )
          })}
        </div>

        <div className="col-span-1 flex flex-col items-center justify-between">
            <table className="w-full border-collapse border-2 border-black receipt-table">
              <thead>
                  <tr>
                      <th colSpan={2} className="border-2 border-black p-2 font-bold text-center text-xl bg-gray-200">Amount Received</th>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <td className="border-2 border-black p-4 h-24 text-center text-4xl font-bold font-mono" colSpan={2}>
                        MWK {paymentAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                  </tr>
              </tbody>
            </table>
            <div className="mt-4 p-2 border border-black">
              <QRCode value={qrValue} size={100} />
            </div>
        </div>
      </main>

      <footer className="mt-12 text-center text-xs text-gray-500">
        <p>Thank you for your payment. | Malawi's #1 SME Lender.</p>
      </footer>
    </div>
  );
}
