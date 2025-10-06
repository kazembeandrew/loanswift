'use client';

import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, runTransaction, getDoc, type Firestore } from 'firebase/firestore';
import type { Account } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/errors';


export async function getAccounts(db: Firestore): Promise<Account[]> {
  const accountsCollection = collection(db, 'accounts');
  try {
    const snapshot = await getDocs(accountsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)).sort((a, b) => a.name.localeCompare(b.name));
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
          path: accountsCollection.path,
          operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    // Re-throw the original error to be handled by the calling function if needed
    throw serverError;
  }
}

export async function addAccount(db: Firestore, accountData: Omit<Account, 'id' | 'balance'>): Promise<string> {
    const accountsCollection = collection(db, 'accounts');
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

export async function updateAccount(db: Firestore, id: string, updates: Partial<Omit<Account, 'id'>>): Promise<void> {
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

export async function deleteAccount(db: Firestore, id: string): Promise<void> {
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

export async function updateAccountBalance(db: Firestore, accountId: string, amount: number) {
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
