
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Account, JournalEntry, TransactionLine, MonthEndClosure } from '@/types';
import { format } from 'date-fns';
import { addAuditLog } from '@/services/audit-log-service';
import admin from 'firebase-admin';


// Helper to get user email from UID using Admin SDK
async function getUserEmail(uid: string): Promise<string> {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord.email || 'unknown';
  } catch (error) {
    console.error(`Failed to get email for UID: ${uid}`, error);
    return 'unknown';
  }
}


/**
 * @description Initiates the month-end closing process by creating a closure request document.
 * This can only be done by a CFO.
 * @param initiatedByUid The UID of the CFO initiating the close.
 * @returns A promise that resolves to the newly created closure request object.
 */
export async function initiateMonthEndClose(initiatedByUid: string): Promise<MonthEndClosure> {
  const periodId = format(new Date(), 'yyyy-MM');
  const closureRef = adminDb.collection('monthEndClosures').doc(periodId);

  const docSnap = await closureRef.get();
  if (docSnap.exists && docSnap.data()?.status !== 'rejected') {
    throw new Error(`A month-end close for period ${periodId} is already in progress or has been completed.`);
  }

  const userEmail = await getUserEmail(initiatedByUid);

  const newClosure: MonthEndClosure = {
    id: periodId,
    status: 'pending_approval',
    initiatedBy: initiatedByUid,
    initiatedByEmail: userEmail,
    initiatedAt: new Date().toISOString(),
  };

  await closureRef.set(newClosure);

  await addAuditLog(adminDb, {
    userEmail: userEmail,
    action: 'MONTH_END_INITIATE',
    details: { period: periodId },
  });

  return newClosure;
}

/**
 * @description Approves a pending month-end close request.
 * This can only be done by a CEO.
 * @param periodId The ID of the closure period (e.g., "YYYY-MM").
 * @param approvedByUid The UID of the CEO approving the request.
 * @returns A promise that resolves to the updated closure object.
 */
export async function approveMonthEndClose(periodId: string, approvedByUid: string): Promise<MonthEndClosure> {
  const closureRef = adminDb.collection('monthEndClosures').doc(periodId);
  const userEmail = await getUserEmail(approvedByUid);
    
  const result = await adminDb.runTransaction(async (transaction) => {
      const closureDoc = await transaction.get(closureRef);
      if (!closureDoc.exists() || closureDoc.data()?.status !== 'pending_approval') {
          throw new Error('No pending month-end close found for this period to approve.');
      }

      const updatedClosureData: Partial<MonthEndClosure> = {
          status: 'approved',
          approvedBy: approvedByUid,
          approvedByEmail: userEmail,
          approvedAt: new Date().toISOString(),
      };

      transaction.update(closureRef, updatedClosureData);
      return { ...closureDoc.data(), ...updatedClosureData } as MonthEndClosure;
  });

  await addAuditLog(adminDb, {
    userEmail: userEmail,
    action: 'MONTH_END_APPROVE',
    details: { period: periodId },
  });
  
  return result;
}


/**
 * @description Processes a previously approved month-end close.
 * This involves creating the closing journal entry and resetting account balances.
 * This can only be done by a CFO on an 'approved' closure.
 * @param periodId The ID of the closure period (e.g., "YYYY-MM").
 * @param processedByUid The UID of the CFO processing the closure.
 * @returns A promise that resolves to the final closing journal entry.
 */
export async function processApprovedMonthEndClose(periodId: string, processedByUid: string): Promise<Omit<JournalEntry, 'id'>> {
  const closureRef = adminDb.collection('monthEndClosures').doc(periodId);
  const closingDate = new Date().toISOString().split('T')[0];
  const userEmail = await getUserEmail(processedByUid);

  const closingEntry = await adminDb.runTransaction(async (transaction) => {
    
    const closureDoc = await transaction.get(closureRef);
    if (!closureDoc.exists() || closureDoc.data()?.status !== 'approved') {
        throw new Error('This month-end close has not been approved by the CEO yet.');
    }
    
    const accountsSnapshot = await transaction.get(adminDb.collection('accounts'));
    const allAccounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));

    const incomeAccounts = allAccounts.filter(a => a.type === 'income');
    const expenseAccounts = allAccounts.filter(a => a.type === 'expense');
    
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
    
    for (const acc of incomeAccounts) {
        if (acc.balance !== 0) {
            journalLines.push({ accountId: acc.id, accountName: acc.name, type: 'debit', amount: acc.balance });
        }
    }
    
    for (const acc of expenseAccounts) {
        if (acc.balance !== 0) {
             journalLines.push({ accountId: acc.id, accountName: acc.name, type: 'credit', amount: acc.balance });
        }
    }
    
    if (netProfit > 0) {
      journalLines.push({ accountId: capitalAccount.id, accountName: capitalAccount.name, type: 'credit', amount: netProfit });
    } else if (netProfit < 0) {
      journalLines.push({ accountId: capitalAccount.id, accountName: capitalAccount.name, type: 'debit', amount: Math.abs(netProfit) });
    }

    const closingJournalEntryData: Omit<JournalEntry, 'id'> = {
        date: closingDate,
        description: `Month-End Closing Entry for period ${periodId}`,
        lines: journalLines,
    };
    
    // 1. Post the closing journal entry
    const newJournalEntryRef = adminDb.collection('journal').doc();
    transaction.set(newJournalEntryRef, closingJournalEntryData);

    // 2. Update the capital account balance
    const newCapitalBalance = capitalAccount.balance + netProfit;
    transaction.update(adminDb.collection('accounts').doc(capitalAccount.id), { balance: newCapitalBalance });

    // 3. Reset all income and expense accounts
    for (const acc of [...incomeAccounts, ...expenseAccounts]) {
        transaction.update(adminDb.collection('accounts').doc(acc.id), { balance: 0 });
    }
    
    // 4. Mark the closure as processed
    transaction.update(closureRef, {
        status: 'processed',
        closingJournalEntryId: newJournalEntryRef.id,
        processedBy: processedByUid,
        processedByEmail: userEmail,
        processedAt: new Date().toISOString(),
    });


    return closingJournalEntryData;
  });

  await addAuditLog(adminDb, {
    userEmail: userEmail,
    action: 'MONTH_END_PROCESS',
    details: { period: periodId },
  });

  return closingEntry;
}


export async function getMonthEndClosure(periodId: string): Promise<MonthEndClosure | null> {
    const closureRef = adminDb.collection('monthEndClosures').doc(periodId);
    const docSnap = await closureRef.get();

    if (!docSnap.exists()) {
        return null;
    }
    
    const data = docSnap.data() as MonthEndClosure;

    // Enrich with emails if they don't exist
    if (data.initiatedBy && !data.initiatedByEmail) {
        data.initiatedByEmail = await getUserEmail(data.initiatedBy);
    }
    if (data.approvedBy && !data.approvedByEmail) {
        data.approvedByEmail = await getUserEmail(data.approvedBy);
    }
    if (data.processedBy && !data.processedByEmail) {
        data.processedByEmail = await getUserEmail(data.processedBy);
    }

    return data;
}
