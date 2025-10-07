'use server';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { JournalEntry, Account } from '@/types';
import { verifyUser, C_LEVEL_ROLES } from '@/lib/auth-helpers';

// GET all journal entries
export async function GET(request: NextRequest) {
    try {
        await verifyUser(request, C_LEVEL_ROLES);
        
        const journalSnapshot = await adminDb.collection('journal').orderBy('date', 'desc').get();
        const journalEntries = journalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry));
            
        return NextResponse.json({ success: true, data: journalEntries });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message || 'An unknown error occurred.' }, { status: error.status || 500 });
    }
}

// POST a new journal entry
export async function POST(request: NextRequest) {
    try {
        await verifyUser(request, C_LEVEL_ROLES);
        const entryData: Omit<JournalEntry, 'id'> = await request.json();

        // Basic validation
        const totalDebits = entryData.lines.filter(l => l.type === 'debit').reduce((sum, l) => sum + l.amount, 0);
        const totalCredits = entryData.lines.filter(l => l.type === 'credit').reduce((sum, l) => sum + l.amount, 0);

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            return NextResponse.json({ success: false, message: 'Debits and credits must be equal.' }, { status: 400 });
        }

        const accountsSnapshot = await adminDb.collection('accounts').get();
        const allAccounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));

        // Add account names to the lines
        const linesWithNames = entryData.lines.map(line => {
            const account = allAccounts.find(a => a.id === line.accountId);
            return { ...line, accountName: account?.name || 'Unknown Account' };
        });

        const newEntryData = { ...entryData, lines: linesWithNames };

        // Transaction to post entry and update balances
        await adminDb.runTransaction(async (transaction) => {
            const newEntryRef = adminDb.collection('journal').doc();
            transaction.set(newEntryRef, newEntryData);

            for (const line of newEntryData.lines) {
                const accountRef = adminDb.collection('accounts').doc(line.accountId);
                const accountDoc = allAccounts.find(a => a.id === line.accountId);

                if (!accountDoc) throw new Error(`Account with ID ${line.accountId} not found.`);
                
                const currentBalance = accountDoc.balance || 0;
                let newBalance;

                if (line.type === 'debit') {
                    newBalance = ['asset', 'expense'].includes(accountDoc.type)
                        ? currentBalance + line.amount
                        : currentBalance - line.amount;
                } else { // credit
                    newBalance = ['liability', 'equity', 'income'].includes(accountDoc.type)
                        ? currentBalance + line.amount
                        : currentBalance - line.amount;
                }
                transaction.update(accountRef, { balance: newBalance });
            }
        });

        return NextResponse.json({ success: true, data: newEntryData });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message || 'An unknown error occurred.' }, { status: error.status || 500 });
    }
}
