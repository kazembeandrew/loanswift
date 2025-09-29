import { collection, addDoc, getDocs, query, where, doc, getDoc, collectionGroup, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, Income, Loan } from '@/types';
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
    
    // Find previously recorded interest income for this loan
    const incomeRecords = collection(db, 'income');
    const q = query(incomeRecords, where("loanId", "==", loanId), where("source", "==", "interest"));
    const interestIncomeDocs = await getDocs(q);
    const interestPaidPreviously = interestIncomeDocs.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    
    const remainingInterestToPay = interestOwedTotal - interestPaidPreviously;
    const interestPortionOfPayment = Math.max(0, Math.min(paymentData.amount, remainingInterestToPay));
    const principalPortionOfPayment = paymentData.amount - interestPortionOfPayment;

    // Automated Journal Entry Logic
    const accounts = await getAccounts();
    const loanPortfolioAccount = accounts.find(a => a.name === 'Loan Portfolio');
    const cashAccount = accounts.find(a => a.name === 'Cash on Hand');
    const interestIncomeAccount = accounts.find(a => a.name === 'Interest Income');

    if (!loanPortfolioAccount || !cashAccount || !interestIncomeAccount) {
        throw new Error("Critical accounting accounts ('Loan Portfolio', 'Cash on Hand', 'Interest Income') are not set up. Cannot record payment.");
    }
    
    const batch = writeBatch(db);

    // 1. Record the payment in the loan's subcollection
    const paymentsCollection = collection(db, `loans/${loanId}/payments`);
    const newPaymentRef = doc(paymentsCollection);
    batch.set(newPaymentRef, paymentData);

    // 2. Record interest portion as income (for P&L reporting, this might become redundant with Journal)
    if (interestPortionOfPayment > 0) {
        const incomeData: Omit<Income, 'id'> = {
            amount: interestPortionOfPayment,
            date: paymentData.date,
            source: 'interest',
            loanId: loanId,
        };
        const newIncomeRef = doc(collection(db, 'income'));
        batch.set(newIncomeRef, incomeData);
    }
    
    // 3. Update the loan's outstanding balance
    const newOutstandingBalance = outstandingBalance - paymentData.amount;
    const loanRef = doc(db, 'loans', loanId);
    batch.update(loanRef, { outstandingBalance: newOutstandingBalance });
    
    // 4. Create the automated Journal Entry via a separate call (not in batch, as it's a transaction)
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
            ].filter(Boolean)
        });
    } catch (journalError) {
        console.error("CRITICAL: Failed to create automated journal entry for payment. Financial records may be inconsistent.", journalError);
        // We throw here because failing to record the accounting is a major issue.
        throw new Error("Payment recorded, but failed to create the corresponding journal entry. Please check system configuration.");
    }


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
