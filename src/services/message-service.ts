import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Message } from '@/types';

const messagesCollection = collection(db, 'messages');

export async function getMessages(): Promise<Message[]> {
  const q = query(messagesCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
}

export async function addMessage(messageData: Omit<Message, 'id'>): Promise<string> {
  const docRef = await addDoc(messagesCollection, messageData);
  return docRef.id;
}
