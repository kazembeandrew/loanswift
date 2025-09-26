import { collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Customer } from '@/types';

const customersCollection = collection(db, 'customers');

export async function getCustomers(): Promise<Customer[]> {
  const snapshot = await getDocs(customersCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
}

export async function getCustomerById(id: string): Promise<Customer | null> {
    const docRef = doc(db, 'customers', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Customer;
    }
    return null;
}

export async function addCustomer(customerData: Omit<Customer, 'id' | 'joinDate'>): Promise<string> {
  const docRef = await addDoc(customersCollection, {
    ...customerData,
    joinDate: new Date().toISOString(),
  });
  return docRef.id;
}
