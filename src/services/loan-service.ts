import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Loan, RepaymentScheduleItem } from '@/types';
import { addJournalEntry } from './journal-service';
import { getAccounts } from './account-service';
import { addMonths } from 'date-fns';


export async function getLoans(): Promise<Loan[]> {
  const snapshot = await getDocs(collection(db, 'loans'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
}

export async function getLoanById(id: string): Promise<Loan | null> {
    const docRef = doc(db, 'loans', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Loan;
    }
    return null;
}

export async function getLoansByBorrowerId(borrowerId: string): Promise<Loan[]> {
    const q = query(collection(db, 'loans'), where("borrowerId", "==", borrowerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
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
      status: 'pending',
    });
  }

  return schedule;
}


export async function addLoan(loanData: Omit<Loan, 'id' | 'repaymentSchedule'>): Promise<string> {
  const repaymentSchedule = generateRepaymentSchedule(loanData);
  const loanWithSchedule = { ...loanData, repaymentSchedule };

  const docRef = await addDoc(collection(db, 'loans'), loanWithSchedule);
  
  // Automated Journal Entry for Loan Disbursement
  try {
    const accounts = await getAccounts();
    const loanPortfolioAccount = accounts.find(a => a.name === 'Loan Portfolio');
    const cashAccount = accounts.find(a => a.name === 'Cash on Hand');

    if (!loanPortfolioAccount || !cashAccount) {
      // Log an error to the console but do not block loan creation.
      // This makes the system more resilient if accounting isn't fully configured.
      console.error("Could not create journal entry for loan disbursement: Critical accounting accounts ('Loan Portfolio', 'Cash on Hand') are not set up.");
    } else {
        await addJournalEntry({
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
    console.error("Failed to create automated journal entry for loan disbursement:", error);
  }

  return docRef.id;
}

export async function updateLoan(id: string, updates: Partial<Loan>): Promise<void> {
    const docRef = doc(db, 'loans', id);
    await updateDoc(docRef, updates);
}
