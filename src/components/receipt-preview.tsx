import type { BusinessSettings } from '@/types';
import { Landmark } from 'lucide-react';
import { getPlaceholderImage } from '@/lib/placeholder-images';

type ReceiptPreviewProps = {
  receiptText: string;
  receiptId: string;
  paymentDate: string;
  paymentAmount: number;
  businessInfo: BusinessSettings;
};

export default function ReceiptPreview({
  receiptText,
  receiptId,
  paymentDate,
  paymentAmount,
  businessInfo,
}: ReceiptPreviewProps) {
  const lines = receiptText.split('\n');
  const businessLogo = getPlaceholderImage('business-logo-small');

  return (
    <div
      id="receipt-preview"
      className="mt-4 rounded-lg border bg-white p-6 text-black shadow-sm font-sans"
    >
        <style>{`
          #receipt-preview {
            color: black;
          }
        `}</style>
      <div className="pb-4 border-b border-black">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
             {businessLogo && <img src={businessLogo.imageUrl} alt={businessLogo.description} className="h-16 w-16" data-ai-hint={businessLogo.imageHint} />}
            <div>
              <h2 className="font-headline text-4xl font-bold text-black">
                {businessInfo.businessName}
              </h2>
              <p className="text-sm text-black">{businessInfo.businessAddress}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-black">Cell: {businessInfo.businessPhone}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-2">
          <div className="border border-black p-1 w-48">
              <p>Receipt No.: {receiptId}</p>
          </div>
      </div>
      <div className="flex justify-end gap-4 mt-1">
          <div className="border border-black p-1 w-48">
              <p>Date: {new Date(paymentDate).toLocaleDateString()}</p>
          </div>
      </div>


      <div className="mt-4 flex gap-4">
        <div className="flex-grow space-y-4">
          {lines.map((line, index) => {
            const [label, value] = line.split(/:(.*)/s);
            return (
              <div key={index} className="flex items-end">
                <span className="font-medium mr-2">{label}:</span>
                <span className="flex-1 border-b border-dotted border-black text-right pr-2">
                  {value?.trim()}
                </span>
              </div>
            )
          })}
          <div className="flex items-end">
              <span className="font-medium mr-2">Sign:</span>
              <span className="flex-1 border-b border-dotted border-black text-right pr-2">
              </span>
            </div>
        </div>
        <div className="w-40">
          <table className="w-full border-collapse border border-black receipt-table">
              <thead>
                  <tr>
                      <td colSpan={2} className="border border-black p-1 font-bold text-center">Amount</td>
                  </tr>
                  <tr>
                      <td className="border border-black p-1 font-bold text-center">MK</td>
                      <td className="border border-black p-1 font-bold text-center">t</td>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <td className="border border-black p-1 h-12 text-center">{paymentAmount.toLocaleString().split('.')[0]}</td>
                      <td className="border border-black p-1 h-12 text-center">{paymentAmount.toFixed(2).split('.')[1] || '00'}</td>
                  </tr>
                   <tr>
                      <td className="border border-black p-1 h-6"></td>
                      <td className="border border-black p-1 h-6"></td>
                  </tr>
                   <tr>
                      <td className="border border-black p-1 h-6"></td>
                      <td className="border border-black p-1 h-6"></td>
                  </tr>
                   <tr>
                      <td className="border-b border-black p-1 h-6 font-bold text-center">{paymentAmount.toLocaleString().split('.')[0]}</td>
                      <td className="border-b border-black p-1 h-6 font-bold text-center">{paymentAmount.toFixed(2).split('.')[1] || '00'}</td>
                  </tr>
              </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
