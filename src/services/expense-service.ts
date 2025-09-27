import { collection, addDoc, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Expense } from '@/types';

const expensesCollection = collection(db, 'expenses');

export async function getExpenseRecords(): Promise<Expense[]> {
  const snapshot = await getDocs(expensesCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
}

export async function addExpenseRecord(expenseData: Omit<Expense, 'id'>): Promise<string> {
  const docRef = await addDoc(expensesCollection, expenseData);
  return docRef.id;
}
