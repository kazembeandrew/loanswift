'use client';

import { collection, getDocs, query, collectionGroup, type Firestore, orderBy, limit } from 'firebase/firestore';
import type { Payment } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';


// Note: Payments are now a subcollection of a loan.

export async function getPaymentsByLoanId(db: Firestore, loanId: string): Promise<Payment[]> {
    const paymentsCollection = collection(db, `loans/${loanId}/payments`);
    const q = query(paymentsCollection, orderBy('date', 'desc'));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: paymentsCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}
