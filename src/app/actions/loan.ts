
'use server';

import { adminDb } from '@/lib/firebase-admin';
import type { Loan, RepaymentScheduleItem, Account } from '@/types';
import { addMonths } from 'date-fns';
import { addAuditLog } from '@/services/audit-log-service';


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


export async function handleAddLoan(loanData: Omit<Loan, 'id' | 'repaymentSchedule'>, userEmail: string): Promise<{success: boolean, message: string, loanId?: string}> {
  
  const repaymentSchedule = generateRepaymentSchedule(loanData);
  const loanWithSchedule: Omit<Loan, 'id'> = { ...loanData, repaymentSchedule };

  try {
    const docRef = await adminDb.collection('loans').add(loanWithSchedule);

    // Log the audit event.
    await addAuditLog({
      userEmail: userEmail,
      action: 'LOAN_DISBURSEMENT',
      details: {
          loanId: docRef.id,
          borrowerId: loanData.borrowerId,
          amount: loanData.principal,
      }
    });
    
    // Automated Journal Entry for Loan Disbursement
    const accountsSnapshot = await adminDb.collection('accounts').get();
    const allAccounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));

    const loanPortfolioAccount = allAccounts.find(a => a.name === 'Loan Portfolio');
    const cashAccount = allAccounts.find(a => a.name === 'Cash on Hand');

    if (!loanPortfolioAccount || !cashAccount) {
        throw new Error('Required accounts (Loan Portfolio or Cash on Hand) not found for journal entry.');
    }

    const entryData = {
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
    };
    
    await adminDb.collection('journal').add(entryData);
    
    return { success: true, message: 'Loan added successfully', loanId: docRef.id };

  } catch (error: any) {
    return { success: false, message: error.message || 'An unknown error occurred while adding the loan.' };
  }
}
