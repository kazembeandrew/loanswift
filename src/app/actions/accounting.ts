'use server';

import { collection, runTransaction, getDocs, doc, setDoc, getDoc, getFirestore } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';
import type { Account, JournalEntry, TransactionLine, MonthEndClosure } from '@/types';
import { format } from 'date-fns';
import { addAuditLog } from '@/services/audit-log-service';
import admin from 'firebase-admin';

// This function ensures the Firebase Admin SDK is initialized, but only once.
function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (serviceAccount.clientEmail && serviceAccount.privateKey && serviceAccount.projectId) {
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function getUserEmail(uid: string): Promise<string> {
    const adminApp = initializeAdminApp();
    if (!adminApp) return 'unknown';
    try {
        const userRecord = await admin.auth(adminApp).getUser(uid);
        return userRecord.email || 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

const db = getFirestore(getFirebase());
/**
 * @description Initiates the month-end closing process by creating a closure request document.
 * This can only be done by a CFO.
 * @param initiatedByUid The UID of the CFO initiating the close.
 * @returns A promise that resolves to the newly created closure request object.
 */
export async function initiateMonthEndClose(initiatedByUid: string): Promise<MonthEndClosure> {
  const periodId = format(new Date(), 'yyyy-MM');
  const closureRef = doc(db, 'monthEndClosures', periodId);

  const docSnap = await getDoc(closureRef);
  if (docSnap.exists() && docSnap.data().status !== 'rejected') {
    throw new Error(`A month-end close for period ${periodId} is already in progress or has been completed.`);
  }

  const newClosure: MonthEndClosure = {
    id: periodId,
    status: 'pending_approval',
    initiatedBy: initiatedByUid,
    initiatedAt: new Date().toISOString(),
  };

  await setDoc(closureRef, newClosure);

  const userEmail = await getUserEmail(initiatedByUid);
  await addAuditLog(db, {
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
    const closureRef = doc(db, 'monthEndClosures', periodId);
    
    const result = await runTransaction(db, async (transaction) => {
        const closureDoc = await transaction.get(closureRef);
        if (!closureDoc.exists() || closureDoc.data().status !== 'pending_approval') {
            throw new Error('No pending month-end close found for this period to approve.');
        }

        const updatedClosureData = {
            status: 'approved',
            approvedBy: approvedByUid,
            approvedAt: new Date().toISOString(),
        };

        transaction.update(closureRef, updatedClosureData);
        return { ...closureDoc.data(), ...updatedClosureData } as MonthEndClosure;
    });

    const userEmail = await getUserEmail(approvedByUid);
    await addAuditLog(db, {
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
  
  const closureRef = doc(db, 'monthEndClosures', periodId);
  const closingDate = new Date().toISOString().split('T')[0];

  const accountsCollection = collection(db, 'accounts');
  const accountsSnapshot = await getDocs(accountsCollection);
  const allAccounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));

  const closingEntry = await runTransaction(db, async (transaction) => {
    
    const closureDoc = await transaction.get(closureRef);
    if (!closureDoc.exists() || closureDoc.data().status !== 'approved') {
        throw new Error('This month-end close has not been approved by the CEO yet.');
    }

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
    const newJournalEntryRef = doc(collection(db, 'journal'));
    transaction.set(newJournalEntryRef, closingJournalEntryData);

    // 2. Update the capital account balance
    const newCapitalBalance = capitalAccount.balance + netProfit;
    transaction.update(doc(db, 'accounts', capitalAccount.id), { balance: newCapitalBalance });

    // 3. Reset all income and expense accounts
    for (const acc of [...incomeAccounts, ...expenseAccounts]) {
        transaction.update(doc(db, 'accounts', acc.id), { balance: 0 });
    }
    
    // 4. Mark the closure as processed
    transaction.update(closureRef, {
        status: 'processed',
        closingJournalEntryId: newJournalEntryRef.id,
        processedBy: processedByUid,
        processedAt: new Date().toISOString(),
    });


    return closingJournalEntryData;
  });

  const userEmail = await getUserEmail(processedByUid);
  await addAuditLog(db, {
    userEmail: userEmail,
    action: 'MONTH_END_PROCESS',
    details: { period: periodId },
  });

  return closingEntry;
}


export async function getMonthEndClosure(periodId: string): Promise<MonthEndClosure | null> {
    const closureRef = doc(db, 'monthEndClosures', periodId);
    const docSnap = await getDoc(closureRef);
    if (docSnap.exists()) {
        return docSnap.data() as MonthEndClosure;
    }
    return null;
}
