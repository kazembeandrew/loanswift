'use client';

import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, type Firestore } from 'firebase/firestore';
import type { Loan, RepaymentScheduleItem } from '@/types';
import { addJournalEntry } from './journal-service';
import { getAccounts } from './account-service';
import { addMonths } from 'date-fns';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import { addAuditLog } from './audit-log-service';
import { getAuth } from 'firebase/auth';
import { getFirebase } from '@/lib/firebase';


export async function getLoans(db: Firestore): Promise<Loan[]> {
  const loansCollection = collection(db, 'loans');
  try {
    const snapshot = await getDocs(loansCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: loansCollection.path,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

export async function getLoanById(db: Firestore, id: string): Promise<Loan | null> {
    const docRef = doc(db, 'loans', id);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Loan;
        }
        return null;
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}

export async function getLoansByBorrowerId(db: Firestore, borrowerId: string): Promise<Loan[]> {
    const q = query(collection(db, 'loans'), where("borrowerId", "==", borrowerId));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `loans where borrowerId == ${borrowerId}`,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}

function generateRepaymentSchedule(loan: Omit<Loan, 'id' | 'repaymentSchedule'>): RepaymentScheduleItem[] {
  const schedule: RepaymentScheduleItem[] = [];
  const { principal, interestRate, repaymentPeriod, startDate } = loan;
  const totalInterest = principal * (interestRate / 100);
  const totalOwed = principal + totalInterest;
  const monthlyPayment = totalOwed / repaymentPeriod;
  
  const loanStartDate = new Date(startDate);

  for (let i = 1; i <= repaymentPeriod; i++) {
    const dueDate = addMonths(loanStartDate, i);
    schedule.push({
      dueDate: dueDate.toISOString(),
      amountDue: monthlyPayment,
    });
  }

  return schedule;
}


export async function addLoan(db: Firestore, loanData: Omit<Loan, 'id' | 'repaymentSchedule'>): Promise<string> {
  const auth = getAuth(getFirebase());
  const currentUser = auth.currentUser;

  const loansCollection = collection(db, 'loans');
  const repaymentSchedule = generateRepaymentSchedule(loanData);
  const loanWithSchedule = { ...loanData, repaymentSchedule };

  const docRef = await addDoc(loansCollection, loanWithSchedule)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: loansCollection.path,
            operation: 'create',
            requestResourceData: loanWithSchedule,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });

  // Log the audit event.
  if (currentUser) {
    addAuditLog(db, {
      userEmail: currentUser.email || 'unknown',
      action: 'LOAN_DISBURSEMENT',
      details: {
        loanId: docRef.id,
        borrowerId: loanData.borrowerId,
        amount: loanData.principal,
      }
    });
  }
  
  // Automated Journal Entry for Loan Disbursement
  try {
    const accounts = await getAccounts(db);
    const loanPortfolioAccount = accounts.find(a => a.name === 'Loan Portfolio');
    const cashAccount = accounts.find(a => a.name === 'Cash on Hand');

    if (loanPortfolioAccount && cashAccount) {
        await addJournalEntry(db, {
            date: loanData.startDate,
            description: `Loan disbursement for ${docRef.id}`,
            lines: [
                {
                    accountId: loanPortfolioAccount.id,
                    accountName: loanPortfolioAccount.name,
                    type: 'debit',
                    amount: loanData.principal,
                },
                {
                    accountId: cashAccount.id,
                    accountName: cashAccount.name,
                    type: 'credit',
                    amount: loanData.principal,
                }
            ]
        });
    }
  } catch (error) {
    // This will now catch permission errors from addJournalEntry
  }

  return docRef.id;
}

export async function updateLoan(db: Firestore, id: string, updates: Partial<Loan>): Promise<void> {
    const docRef = doc(db, 'loans', id);
    await updateDoc(docRef, updates)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updates,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
}
