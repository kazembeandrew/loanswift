import { collection, addDoc, getDocs, query, where, doc, getDoc, collectionGroup, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, Account, Loan } from '@/types';
import { getLoanById, updateLoan } from './loan-service';
import { addJournalEntry } from './journal-service';
import { getAccounts } from './account-service';


// Note: Payments are now a subcollection of a loan.

export async function getPaymentsByLoanId(loanId: string): Promise<Payment[]> {
    const paymentsCollection = collection(db, `loans/${loanId}/payments`);
    const snapshot = await getDocs(paymentsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
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

    const interestOwedTotal = totalOwed - loan.principal;
    
    const allAccounts = await getAccounts();
    const interestIncomeAccount = allAccounts.find(a => a.name === 'Interest Income');
    // We check for all critical accounts at once to provide a single, clear error message.
    const loanPortfolioAccount = allAccounts.find(a => a.name === 'Loan Portfolio');
    const cashAccount = allAccounts.find(a => a.name === 'Cash on Hand');

    if (!interestIncomeAccount || !loanPortfolioAccount || !cashAccount) {
        let missingAccounts = [];
        if (!interestIncomeAccount) missingAccounts.push('"Interest Income" (type: Income)');
        if (!loanPortfolioAccount) missingAccounts.push('"Loan Portfolio" (type: Asset)');
        if (!cashAccount) missingAccounts.push('"Cash on Hand" (type: Asset)');
        throw new Error(`Cannot record payment. The following critical accounts are missing from your Chart of Accounts: ${missingAccounts.join(', ')}. Please create them on the Accounts page.`);
    }
    
    // This is a simplification for calculating previously paid interest.
    const allPayments = (await getAllPayments()).filter(p => p.loanId === loanId);
    let interestPaidPreviously = 0;
    for (const p of allPayments) {
        const remainingInterest = interestOwedTotal - interestPaidPreviously;
        const interestForThisPayment = Math.min(p.amount, remainingInterest);
        interestPaidPreviously += interestForThisPayment;
    }


    const remainingInterestToPay = interestOwedTotal - interestPaidPreviously;
    const interestPortionOfPayment = Math.max(0, Math.min(paymentData.amount, remainingInterestToPay));
    const principalPortionOfPayment = paymentData.amount - interestPortionOfPayment;
    
    // Create the automated Journal Entry
    // This is wrapped in a transaction inside addJournalEntry, so it's safe to call here.
    try {
        await addJournalEntry({
            date: paymentData.date,
            description: `Payment for loan ${loanId}`,
            lines: [
                { // Money comes into cash
                    accountId: cashAccount.id,
                    accountName: cashAccount.name,
                    type: 'debit',
                    amount: paymentData.amount,
                },
                ...(principalPortionOfPayment > 0 ? [{ // Principal repayment reduces loan portfolio
                    accountId: loanPortfolioAccount.id,
                    accountName: loanPortfolioAccount.name,
                    type: 'credit',
                    amount: principalPortionOfPayment,
                }] : []),
                ...(interestPortionOfPayment > 0 ? [{ // Interest is recognized as income
                    accountId: interestIncomeAccount.id,
                    accountName: interestIncomeAccount.name,
                    type: 'credit',
                    amount: interestPortionOfPayment,
                }] : [])
            ].filter(Boolean) as any
        });
    } catch (journalError) {
        console.error("CRITICAL: Failed to create automated journal entry for payment. Financial records may be inconsistent.", journalError);
        // Throw a specific error if accounting fails, as it's a critical step.
        throw new Error("Payment data was saved, but the accounting entry failed. Please review your account setup and the journal entry logs.");
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
    
    await batch.commit();
    return newPaymentRef.id;
}

export async function getAllPayments(): Promise<(Payment & {loanId: string})[]> {
    const paymentsQuery = query(collectionGroup(db, 'payments'));
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
}
