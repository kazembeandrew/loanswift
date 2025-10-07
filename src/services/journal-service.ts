'use client';

import { collection, addDoc, getDocs, doc, writeBatch, runTransaction, query, type Firestore } from 'firebase/firestore';
import type { JournalEntry, TransactionLine } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/errors';


export async function getJournalEntries(db: Firestore): Promise<JournalEntry[]> {
    const journalCollection = collection(db, 'journal');
    try {
        const snapshot = await getDocs(journalCollection);
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: journalCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}
