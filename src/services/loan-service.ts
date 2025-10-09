'use client';

import { collection, getDocs, query, where, doc, getDoc, updateDoc, type Firestore, orderBy, limit } from 'firebase/firestore';
import type { Loan } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';

export async function updateLoan(db: Firestore, id: string, updates: Partial<Loan>): Promise<void> {
    const docRef = doc(db, 'loans', id);
    try {
        await updateDoc(docRef, updates);
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: updates,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}
