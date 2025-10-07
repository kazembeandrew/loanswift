
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Payment, Account, Loan, JournalEntry, TransactionLine } from '@/types';
import { addAuditLog } from '@/services/audit-log-service';

type PaymentInput = {
    loanId: string;
    amount: number;
    date: string;
    recordedByEmail: string;
}

export async function handleRecordPayment(input: PaymentInput): Promise<{success: boolean, message: string, newBalance: number}> {
    const { loanId, amount, date, recordedByEmail } = input;

    try {
        return await adminDb.runTransaction(async (transaction) => {
            const loanRef = adminDb.collection('loans').doc(loanId);
            const loanDoc = await transaction.get(loanRef);

            if (!loanDoc.exists) {
                throw new Error(`Loan with ID ${loanId} not found.`);
            }

            const loan = loanDoc.data() as Loan;
            
            const paymentsCollectionRef = loanRef.collection('payments');
            const paymentsSnapshot = await transaction.get(paymentsCollectionRef);
            const allPaymentsForLoan = paymentsSnapshot.docs.map(doc => doc.data() as Payment);

            const totalOwed = loan.principal * (1 + loan.interestRate / 100);
            const totalPaidPreviously = allPaymentsForLoan.reduce((sum, p) => sum + p.amount, 0);
            const outstandingBalance = totalOwed - totalPaidPreviously;
            
            if (amount > outstandingBalance + 0.01) { // Add a small tolerance for floating point issues
                throw new Error(`Payment of ${amount} exceeds the outstanding balance of ${outstandingBalance}.`);
            }

            // Calculate interest and principal portions
            const interestOwedTotal = totalOwed - loan.principal;
            let interestPaidPreviously = 0;
            for (const p of allPaymentsForLoan) {
                const remainingInterest = interestOwedTotal - interestPaidPreviously;
                const interestForThisPayment = Math.min(p.amount, remainingInterest);
                interestPaidPreviously += interestForThisPayment;
            }
            const remainingInterestToPay = interestOwedTotal - interestPaidPreviously;
            const interestPortionOfPayment = Math.max(0, Math.min(amount, remainingInterestToPay));
            const principalPortionOfPayment = amount - interestPortionOfPayment;

            // Post Journal Entry
            const accountsSnapshot = await transaction.get(adminDb.collection('accounts'));
            const accounts = accountsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Account));
            const interestAccount = accounts.find(a => a.name === "Interest Income");
            const portfolioAccount = accounts.find(a => a.name === "Loan Portfolio");
            const cashAccount = accounts.find(a => a.name === "Cash on Hand");

            if (!interestAccount || !portfolioAccount || !cashAccount) {
                throw new Error("Required accounts for payment processing are missing.");
            }
            
            const journalEntryData: Omit<JournalEntry, 'id'> = {
                 date: date,
                 description: `Payment for loan ${loanId}`,
                 lines: [
                    { type: 'debit', amount: amount, accountId: cashAccount.id, accountName: cashAccount.name },
                    ...(principalPortionOfPayment > 0 ? [{ type: 'credit', amount: principalPortionOfPayment, accountId: portfolioAccount.id, accountName: portfolioAccount.name }] : []),
                    ...(interestPortionOfPayment > 0 ? [{ type: 'credit', amount: interestPortionOfPayment, accountId: interestAccount.id, accountName: interestAccount.name }] : [])
                ].filter(Boolean) as any,
            }
            const newJournalRef = adminDb.collection('journal').doc();
            transaction.set(newJournalRef, journalEntryData);


            // Record the payment
            const newPaymentRef = paymentsCollectionRef.doc();
            const newPaymentData: Omit<Payment, 'id'> = {
                loanId: loanId,
                amount: amount,
                date: date,
                method: 'cash',
                recordedBy: recordedByEmail,
            };
            transaction.set(newPaymentRef, newPaymentData);

            // Update the loan's outstanding balance
            const newOutstandingBalance = outstandingBalance - amount;
            transaction.update(loanRef, { outstandingBalance: newOutstandingBalance });

            await addAuditLog({
                userEmail: recordedByEmail,
                action: 'PAYMENT_RECORD',
                details: {
                    loanId,
                    borrowerId: loan.borrowerId,
                    amount,
                },
            });

            return { success: true, message: 'Payment recorded successfully.', newBalance: newOutstandingBalance };
        });

    } catch (error: any) {
        console.error("Error in handleRecordPayment:", error);
        return { success: false, message: error.message || 'An unknown error occurred.', newBalance: 0 };
    }
}
