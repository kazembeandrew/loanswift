'use server';

import { collection, runTransaction, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Account, JournalEntry, TransactionLine } from '@/types';

/**
 * @description Performs the month-end closing process for the accounting books.
 * This involves:
 * 1. Calculating net profit (Total Revenue - Total Expenses).
 * 2. Creating a closing journal entry to move the net profit into an equity account (Retained Earnings).
 * 3. Updating the balance of the equity account.
 * 4. Resetting the balances of all income and expense accounts to 0.
 * This entire process is done within a single Firestore transaction to ensure atomicity.
 * 
 * @returns A JSON object representing the closing journal entry.
 */
export async function performMonthEndClose(): Promise<Omit<JournalEntry, 'id'>> {
  
  const closingDate = new Date().toISOString().split('T')[0];

  // Fetch all accounts outside the transaction. Reads don't need to be in the transaction
  // unless they depend on a write that's part of the same transaction.
  const accountsCollection = collection(db, 'accounts');
  const accountsSnapshot = await getDocs(accountsCollection);
  const allAccounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));

  const closingEntry = await runTransaction(db, async (transaction) => {
    
    const incomeAccounts = allAccounts.filter(a => a.type === 'income');
    const expenseAccounts = allAccounts.filter(a => a.type === 'expense');
    
    // Use "Retained Earnings" or the first available equity account as the closing target.
    let capitalAccount = allAccounts.find(a => a.name === 'Retained Earnings' && a.type === 'equity');
    if (!capitalAccount) {
      capitalAccount = allAccounts.find(a => a.type === 'equity');
    }
    
    if (!capitalAccount) {
        throw new Error('No capital/equity account found to close the books into. Please create an equity account.');
    }
    
    const totalRevenue = incomeAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const netProfit = totalRevenue - totalExpenses;

    const journalLines: TransactionLine[] = [];
    
    // Create credit lines to zero out income accounts
    for (const acc of incomeAccounts) {
        if (acc.balance !== 0) {
            journalLines.push({
                accountId: acc.id,
                accountName: acc.name,
                type: 'debit',
                amount: acc.balance
            });
        }
    }
    
    // Create debit lines to zero out expense accounts
    for (const acc of expenseAccounts) {
        if (acc.balance !== 0) {
             journalLines.push({
                accountId: acc.id,
                accountName: acc.name,
                type: 'credit',
                amount: acc.balance
            });
        }
    }
    
    // Create the final line to move net profit to capital
    if (netProfit > 0) { // Profit
      journalLines.push({
        accountId: capitalAccount.id,
        accountName: capitalAccount.name,
        type: 'credit',
        amount: netProfit,
      });
    } else if (netProfit < 0) { // Loss
      journalLines.push({
        accountId: capitalAccount.id,
        accountName: capitalAccount.name,
        type: 'debit',
        amount: Math.abs(netProfit),
      });
    }

    const closingJournalEntryData: Omit<JournalEntry, 'id'> = {
        date: closingDate,
        description: `Month-End Closing Entry for period ending ${closingDate}`,
        lines: journalLines,
    };
    
    // 1. Post the closing journal entry
    const newJournalEntryRef = doc(collection(db, 'journal'));
    transaction.set(newJournalEntryRef, closingJournalEntryData);

    // 2. Update the capital account balance
    const newCapitalBalance = capitalAccount.balance + netProfit;
    transaction.update(doc(db, 'accounts', capitalAccount.id), { balance: newCapitalBalance });

    // 3. Reset all income and expense accounts
    for (const acc of [...incomeAccounts, ...expenseAccounts]) {
        transaction.update(doc(db, 'accounts', acc.id), { balance: 0 });
    }

    return closingJournalEntryData;
  });

  return closingEntry;
}
