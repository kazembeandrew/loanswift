import { collection, addDoc, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Income } from '@/types';

const incomeCollection = collection(db, 'income');

export async function getIncomeRecords(): Promise<Income[]> {
  const snapshot = await getDocs(incomeCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Income));
}

export async function addIncomeRecord(incomeData: Omit<Income, 'id'>): Promise<string> {
  const docRef = await addDoc(incomeCollection, incomeData);
  return docRef.id;
}
