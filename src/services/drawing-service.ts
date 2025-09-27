import { collection, addDoc, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Drawing } from '@/types';

const drawingsCollection = collection(db, 'drawings');

export async function getDrawingRecords(): Promise<Drawing[]> {
  const snapshot = await getDocs(drawingsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Drawing));
}

export async function addDrawingRecord(drawingData: Omit<Drawing, 'id'>): Promise<string> {
  const docRef = await addDoc(drawingsCollection, drawingData);
  return docRef.id;
}
