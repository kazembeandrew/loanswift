'use client';

import { collection, addDoc, getDocs, doc, writeBatch, runTransaction, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { JournalEntry, TransactionLine } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/errors';

const journalCollection = collection(db, 'journal');

export async function getJournalEntries(): Promise<JournalEntry[]> {
    try {
        const snapshot = await getDocs(journalCollection);
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: journalCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}

export async function addJournalEntry(entryData: Omit<JournalEntry, 'id'>): Promise<string> {
  const totalDebits = entryData.lines.filter(l => l.type === 'debit').reduce((sum, l) => sum + l.amount, 0);
  const totalCredits = entryData.lines.filter(l => l.type === 'credit').reduce((sum, l) => sum + l.amount, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) { // Allow for small floating point discrepancies
    throw new Error('Debits and credits must be equal.');
  }

  return await runTransaction(db, async (transaction) => {
    // 1. Add the new journal entry document
    const newEntryRef = doc(journalCollection);
    transaction.set(newEntryRef, entryData);

    // 2. Update the balances for each account involved
    for (const line of entryData.lines) {
      const accountRef = doc(db, 'accounts', line.accountId);
      const accountDoc = await transaction.get(accountRef);

      if (!accountDoc.exists()) {
        throw new Error(`Account with ID ${line.accountId} not found.`);
      }

      const currentBalance = accountDoc.data().balance || 0;
      const accountType = accountDoc.data().type;
      
      let newBalance;

      // The effect of a debit/credit depends on the account type
      if (line.type === 'debit') {
        if (['asset', 'expense'].includes(accountType)) {
          newBalance = currentBalance + line.amount; // Increases
        } else {
          newBalance = currentBalance - line.amount; // Decreases
        }
      } else { // credit
        if (['liability', 'equity', 'income'].includes(accountType)) {
          newBalance = currentBalance + line.amount; // Increases
        } else {
          newBalance = currentBalance - line.amount; // Decreases
        }
      }
      
      transaction.update(accountRef, { balance: newBalance });
    }

    return newEntryRef.id;
  }).catch(async (serverError) => {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: 'transaction<journal/create, accounts/update>',
            operation: 'write',
            requestResourceData: entryData,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    // Re-throw the original error to be handled by the calling function
    throw serverError;
  });
}
