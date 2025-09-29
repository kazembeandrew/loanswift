'use server';

// This file is now used for loading Genkit flows in development.
// It no longer starts the Next.js server.
import '@/ai/flows/summarize-arrears.ts';
import '@/ai/flows/generate-receipt.ts';
import '@/ai/flows/generate-receipt-image.ts';
import '@/ai/flows/generate-financial-summary.ts';
