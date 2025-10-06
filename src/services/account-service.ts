import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Account } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/errors';

const accountsCollection = collection(db, 'accounts');

export async function getAccounts(): Promise<Account[]> {
  const snapshot = await getDocs(accountsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)).sort((a, b) => a.name.localeCompare(b.name));
}

export async function addAccount(accountData: Omit<Account, 'id' | 'balance'>): Promise<string> {
    const fullAccountData = {
        ...accountData,
        balance: 0,
    };
    
    const docRef = await addDoc(accountsCollection, fullAccountData)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: accountsCollection.path,
            operation: 'create',
            requestResourceData: fullAccountData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError; // re-throw to stop execution
    });

  return docRef.id;
}

export async function updateAccount(id: string, updates: Partial<Omit<Account, 'id'>>): Promise<void> {
    const docRef = doc(db, 'accounts', id);
    await updateDoc(docRef, updates)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updates,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
}

export async function deleteAccount(id: string): Promise<void> {
    const docRef = doc(db, 'accounts', id);
    await deleteDoc(docRef)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
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
  }).catch(async (serverError) => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: accountRef.path,
                operation: 'update',
                requestResourceData: { balance: `increment by ${amount}` },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
  });
}
