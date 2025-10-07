

import { collection, getDocs, writeBatch, collectionGroup } from 'firebase/firestore';
import { adminDb as db } from '@/lib/firebase-admin';

const collectionsToDelete = [
    'borrowers',
    'conversations',
    'settings',
    'loans',
    'accounts',
    'journal',
    'users',
    'audit_logs',
    'monthEndClosures',
    'situationReports',
];

const groupCollectionsToDelete = ['payments', 'messages'];


async function deleteCollectionInBatches(collectionName: string) {
    const BATCH_SIZE = 499;
    const q = db.collection(collectionName);
    const snapshot = await q.get();
    
    if(snapshot.empty) return;

    const batches: Promise<FirebaseFirestore.WriteResult[]>[] = [];
    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);
        chunk.forEach(doc => batch.delete(doc.ref));
        batches.push(batch.commit());
    }
    await Promise.all(batches);
}

async function deleteGroupCollectionInBatches(collectionName: string) {
    const BATCH_SIZE = 499;
    const q = db.collectionGroup(collectionName);
    const snapshot = await q.get();

    if(snapshot.empty) return;

    const batches: Promise<FirebaseFirestore.WriteResult[]>[] = [];
    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);
        chunk.forEach(doc => batch.delete(doc.ref));
        batches.push(batch.commit());
    }
    await Promise.all(batches);
}


export async function deleteAllData(): Promise<void> {
    
    // First, delete all group collections which are subcollections
    for (const collectionName of groupCollectionsToDelete) {
        await deleteGroupCollectionInBatches(collectionName);
    }

    // Then delete all top-level collections
    for (const collectionName of collectionsToDelete) {
        await deleteCollectionInBatches(collectionName);
    }

    console.log("All data deletion process completed.");
}
