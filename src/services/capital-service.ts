import { collection, addDoc, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Capital } from '@/types';

const capitalCollection = collection(db, 'capital');

export async function getCapitalContributions(): Promise<Capital[]> {
  const snapshot = await getDocs(capitalCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Capital));
}

export async function addCapitalContribution(capitalData: Omit<Capital, 'id'>): Promise<string> {
  const docRef = await addDoc(capitalCollection, capitalData);
  return docRef.id;
}
