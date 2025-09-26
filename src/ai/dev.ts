import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-arrears.ts';
import '@/ai/flows/generate-receipt.ts';
import '@/ai/flows/generate-receipt-image.ts';
import '@/ai/flows/generate-financial-summary.ts';
