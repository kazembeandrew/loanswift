'use client';

import { collection, addDoc, getDocs, query, where, doc, getDoc, collectionGroup, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, Account, Loan } from '@/types';
import { getLoanById, updateLoan } from './loan-service';
import { addJournalEntry } from './journal-service';
import { getAccounts } from './account-service';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';


// Note: Payments are now a subcollection of a loan.

export async function getPaymentsByLoanId(loanId: string): Promise<Payment[]> {
    const paymentsCollection = collection(db, `loans/${loanId}/payments`);
    try {
        const snapshot = await getDocs(paymentsCollection);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: paymentsCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}

export async function addPayment(loanId: string, paymentData: Omit<Payment, 'id'>): Promise<string> {
    const loan = await getLoanById(loanId);
    if (!loan) {
        throw new Error(`Loan with ID ${loanId} not found.`);
    }

    const allPaymentsForLoan = await getPaymentsByLoanId(loanId);
    
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    const totalPaidPreviously = allPaymentsForLoan.reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalance = totalOwed - totalPaidPreviously;

    // Allow for small rounding differences, but not significant overpayment.
    if (paymentData.amount > outstandingBalance + 0.01) { 
        throw new Error(`Payment of ${paymentData.amount} exceeds the outstanding balance of ${outstandingBalance}.`);
    }

    // This section is now wrapped in the main batch write, but we must calculate portions first.
    let interestPortionOfPayment = 0;
    let principalPortionOfPayment = 0;
    try {
        const accounts = await getAccounts();
        const interestAccount = accounts.find(a => a.name === "Interest Income");
        const portfolioAccount = accounts.find(a => a.name === "Loan Portfolio");
        const cashAccount = accounts.find(a => a.name === "Cash on Hand");

        if (!interestAccount || !portfolioAccount || !cashAccount) {
            throw new Error("Required accounts for payment processing are missing.");
        }
        
        const interestOwedTotal = totalOwed - loan.principal;
        let interestPaidPreviously = 0;
        for (const p of allPaymentsForLoan) {
            const remainingInterest = interestOwedTotal - interestPaidPreviously;
            const interestForThisPayment = Math.min(p.amount, remainingInterest);
            interestPaidPreviously += interestForThisPayment;
        }

        const remainingInterestToPay = interestOwedTotal - interestPaidPreviously;
        interestPortionOfPayment = Math.max(0, Math.min(paymentData.amount, remainingInterestToPay));
        principalPortionOfPayment = paymentData.amount - interestPortionOfPayment;

        await addJournalEntry({
            date: paymentData.date,
            description: `Payment for loan ${loanId}`,
            lines: [
                { type: 'debit', amount: paymentData.amount, accountId: cashAccount.id, accountName: cashAccount.name },
                ...(principalPortionOfPayment > 0 ? [{ type: 'credit', amount: principalPortionOfPayment, accountId: portfolioAccount.id, accountName: portfolioAccount.name }] : []),
                ...(interestPortionOfPayment > 0 ? [{ type: 'credit', amount: interestPortionOfPayment, accountId: interestAccount.id, accountName: interestAccount.name }] : [])
            ].filter(Boolean) as any,
        });

    } catch (journalError: any) {
        // The addJournalEntry function now handles its own permission errors,
        // so we just re-throw to let the UI know something went wrong.
        throw journalError;
    }
    
    const batch = writeBatch(db);

    // 1. Record the payment in the loan's subcollection
    const paymentsCollection = collection(db, `loans/${loanId}/payments`);
    const newPaymentRef = doc(paymentsCollection);
    batch.set(newPaymentRef, paymentData);
    
    // 2. Update the loan's outstanding balance
    const newOutstandingBalance = outstandingBalance - paymentData.amount;
    const loanRef = doc(db, 'loans', loanId);
    batch.update(loanRef, { outstandingBalance: newOutstandingBalance });

    await batch.commit().catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: `writeBatch<loans/${loanId}/payments, /loans/${loanId}>`,
            operation: 'write',
            requestResourceData: { payment: paymentData, loanUpdate: { outstandingBalance: newOutstandingBalance } },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });

    return newPaymentRef.id;
}

export async function getAllPayments(): Promise<(Payment & {loanId: string})[]> {
    const paymentsQuery = query(collectionGroup(db, 'payments'));
    try {
        const querySnapshot = await getDocs(paymentsQuery);
        const payments: (Payment & { loanId: string })[] = [];
        querySnapshot.forEach((doc) => {
            const loanDocRef = doc.ref.parent.parent;
            if (loanDocRef) {
                const loanId = loanDocRef.id;
                payments.push({ loanId, id: doc.id, ...doc.data() } as Payment & { loanId: string });
            }
        });
        return payments;
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: 'collectionGroup<payments>',
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}
