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


export async function getAllPayments(db: Firestore): Promise<(Payment & {loanId: string})[]> {
    const paymentsQuery = query(collectionGroup(db, 'payments'), orderBy('date', 'desc'), limit(200));
    try {
        const querySnapshot = await getDocs(paymentsQuery);
        const payments: (Payment & { loanId: string })[] = [];
        querySnapshot.forEach((doc) => {
            const loanDocRef = doc.ref.parent.parent;
            if (loanDocRef) {
                const loanId = loanDocRef.id;
                payments.push({ loanId, id: doc.id, ...doc.data() } as Payment & { loanId: string });
            }
        });
        return payments;
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: 'collectionGroup<payments>',
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}
