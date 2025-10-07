'use server';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getAdminApp } from '@/lib/firebase-admin';
import type { Account, JournalEntry, TransactionLine, MonthEndClosure } from '@/types';
import { format } from 'date-fns';
import { addAuditLog } from '@/services/audit-log-service';
import { getAuth } from 'firebase-admin/auth';

// Helper to get user email and role from UID using Admin SDK
async function getUser(uid: string): Promise<{ email: string; role: string }> {
  try {
    const userRecord = await getAuth(getAdminApp()).getUser(uid);
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const role = userDoc.exists ? userDoc.data()?.role : 'unknown';
    return { email: userRecord.email || 'unknown', role };
  } catch (error) {
    console.error(`Failed to get user data for UID: ${uid}`, error);
    return { email: 'unknown', role: 'unknown' };
  }
}

async function verifyUser(request: NextRequest, allowedRoles: string[]) {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];

    if (!idToken) {
      throw { message: 'Unauthorized: No token provided.', status: 401 };
    }

    const decodedToken = await getAuth(getAdminApp()).verifyIdToken(idToken);
    const user = await getUser(decodedToken.uid);

    if (!allowedRoles.includes(user.role)) {
       throw { message: 'Forbidden: You do not have permission to perform this action.', status: 403 };
    }

    return { uid: decodedToken.uid, email: user.email };
}

export async function GET(request: NextRequest) {
    try {
        await verifyUser(request, ['ceo', 'cfo', 'admin']);
        const { searchParams } = new URL(request.url);
        const periodId = searchParams.get('periodId');
        
        if (!periodId) {
            return NextResponse.json({ success: false, message: 'Missing periodId parameter.' }, { status: 400 });
        }

        const closureRef = adminDb.collection('monthEndClosures').doc(periodId);
        const docSnap = await closureRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ success: true, data: null }, { status: 200 });
        }
        
        const data = docSnap.data() as MonthEndClosure;

        // Enrich with emails if they don't exist
        if (data.initiatedBy && !data.initiatedByEmail) {
            data.initiatedByEmail = (await getUser(data.initiatedBy)).email;
        }
        if (data.approvedBy && !data.approvedByEmail) {
            data.approvedByEmail = (await getUser(data.approvedBy)).email;
        }
        if (data.processedBy && !data.processedByEmail) {
            data.processedByEmail = (await getUser(data.processedBy)).email;
        }
        
        return NextResponse.json({ success: true, data }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: error.status || 500 });
    }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, periodId } = body;
    
    let result, user, title, description;

    switch (action) {
      case 'initiate':
        user = await verifyUser(request, ['cfo', 'admin']);
        result = await initiateMonthEndClose(user.uid, user.email, periodId);
        title = 'Month-End Close Initiated';
        description = `The closing process for ${periodId} has been initiated and is awaiting CEO approval.`;
        break;

      case 'approve':
        user = await verifyUser(request, ['ceo', 'admin']);
        result = await approveMonthEndClose(user.uid, user.email, periodId);
        title = 'Month-End Close Approved';
        description = `The closing process for ${periodId} has been approved and is ready for final processing.`;
        break;

      case 'process':
        user = await verifyUser(request, ['cfo', 'admin']);
        result = await processApprovedMonthEndClose(user.uid, user.email, periodId);
        title = 'Month-End Close Successful';
        description = `Period ${periodId} closed. Profit/Loss has been moved to equity.`;
        break;

      default:
        throw { message: 'Invalid action provided.', status: 400 };
    }
    
    return NextResponse.json({ success: true, data: result, title, description });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: error.status || 500 });
  }
}


// --- Handler Functions ---
async function initiateMonthEndClose(initiatedByUid: string, initiatedByEmail: string, periodId: string): Promise<MonthEndClosure> {
  const closureRef = adminDb.collection('monthEndClosures').doc(periodId);
  const docSnap = await closureRef.get();

  if (docSnap.exists && docSnap.data()?.status !== 'rejected') {
    throw { message: `A month-end close for period ${periodId} is already in progress or has been completed.`, status: 409 };
  }

  const newClosure: MonthEndClosure = {
    id: periodId,
    status: 'pending_approval',
    initiatedBy: initiatedByUid,
    initiatedByEmail: initiatedByEmail,
    initiatedAt: new Date().toISOString(),
  };
  await closureRef.set(newClosure);
  await addAuditLog({ userEmail: initiatedByEmail, action: 'MONTH_END_INITIATE', details: { period: periodId } });

  return newClosure;
}

async function approveMonthEndClose(approvedByUid: string, approvedByEmail: string, periodId: string): Promise<MonthEndClosure> {
  const closureRef = adminDb.collection('monthEndClosures').doc(periodId);

  const result = await adminDb.runTransaction(async (transaction) => {
    const closureDoc = await transaction.get(closureRef);
    if (!closureDoc.exists() || closureDoc.data()?.status !== 'pending_approval') {
      throw { message: 'No pending month-end close found for this period to approve.', status: 404 };
    }
    const updatedClosureData: Partial<MonthEndClosure> = {
      status: 'approved',
      approvedBy: approvedByUid,
      approvedByEmail: approvedByEmail,
      approvedAt: new Date().toISOString(),
    };
    transaction.update(closureRef, updatedClosureData);
    return { ...closureDoc.data(), ...updatedClosureData } as MonthEndClosure;
  });

  await addAuditLog({ userEmail: approvedByEmail, action: 'MONTH_END_APPROVE', details: { period: periodId } });
  return result;
}

async function processApprovedMonthEndClose(processedByUid: string, processedByEmail: string, periodId: string): Promise<MonthEndClosure> {
  const closureRef = adminDb.collection('monthEndClosures').doc(periodId);
  const closingDate = new Date().toISOString().split('T')[0];

  const finalClosureState = await adminDb.runTransaction(async (transaction) => {
    const closureDoc = await transaction.get(closureRef);
    if (!closureDoc.exists() || closureDoc.data()?.status !== 'approved') {
      throw { message: 'This month-end close has not been approved by the CEO yet.', status: 409 };
    }
    const accountsSnapshot = await transaction.get(adminDb.collection('accounts'));
    const allAccounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
    const incomeAccounts = allAccounts.filter(a => a.type === 'income');
    const expenseAccounts = allAccounts.filter(a => a.type === 'expense');
    let capitalAccount = allAccounts.find(a => a.name === 'Retained Earnings' && a.type === 'equity') || allAccounts.find(a => a.type === 'equity');
    if (!capitalAccount) {
      throw { message: 'No capital/equity account found to close the books into.', status: 500 };
    }
    const totalRevenue = incomeAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const netProfit = totalRevenue - totalExpenses;
    const journalLines: TransactionLine[] = [];
    incomeAccounts.forEach(acc => acc.balance !== 0 && journalLines.push({ accountId: acc.id, accountName: acc.name, type: 'debit', amount: acc.balance }));
    expenseAccounts.forEach(acc => acc.balance !== 0 && journalLines.push({ accountId: acc.id, accountName: acc.name, type: 'credit', amount: acc.balance }));
    if (netProfit > 0) {
      journalLines.push({ accountId: capitalAccount.id, accountName: capitalAccount.name, type: 'credit', amount: netProfit });
    } else if (netProfit < 0) {
      journalLines.push({ accountId: capitalAccount.id, accountName: capitalAccount.name, type: 'debit', amount: Math.abs(netProfit) });
    }
    const newJournalEntryRef = adminDb.collection('journal').doc();
    transaction.set(newJournalEntryRef, { date: closingDate, description: `Month-End Closing Entry for period ${periodId}`, lines: journalLines });
    transaction.update(adminDb.collection('accounts').doc(capitalAccount.id), { balance: capitalAccount.balance + netProfit });
    [...incomeAccounts, ...expenseAccounts].forEach(acc => transaction.update(adminDb.collection('accounts').doc(acc.id), { balance: 0 }));

    const finalData: Partial<MonthEndClosure> = {
        status: 'processed',
        closingJournalEntryId: newJournalEntryRef.id,
        processedBy: processedByUid,
        processedByEmail: processedByEmail,
        processedAt: new Date().toISOString(),
    };
    transaction.update(closureRef, finalData);
    return { ...closureDoc.data(), ...finalData } as MonthEndClosure;
  });

  await addAuditLog({ userEmail: processedByEmail, action: 'MONTH_END_PROCESS', details: { period: periodId } });
  return finalClosureState;
}
