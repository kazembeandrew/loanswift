import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Account } from '@/types';

const accountsCollection = collection(db, 'accounts');

export async function getAccounts(): Promise<Account[]> {
  const snapshot = await getDocs(accountsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)).sort((a, b) => a.name.localeCompare(b.name));
}

export async function addAccount(accountData: Omit<Account, 'id' | 'balance'>): Promise<string> {
  const docRef = await addDoc(accountsCollection, {
    ...accountData,
    balance: 0,
  });
  return docRef.id;
}

export async function updateAccount(id: string, updates: Partial<Omit<Account, 'id'>>): Promise<void> {
    const docRef = doc(db, 'accounts', id);
    await updateDoc(docRef, updates);
}

export async function deleteAccount(id: string): Promise<void> {
    const docRef = doc(db, 'accounts', id);
    await deleteDoc(docRef);
}

export async function updateAccountBalance(accountId: string, amount: number) {
  const accountRef = doc(db, "accounts", accountId);
  await runTransaction(db, async (transaction) => {
    const accountDoc = await transaction.get(accountRef);
    if (!accountDoc.exists()) {
      throw "Account does not exist!";
    }
    const newBalance = (accountDoc.data().balance || 0) + amount;
    transaction.update(accountRef, { balance: newBalance });
  });
}
