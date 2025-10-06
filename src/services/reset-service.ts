
import { collection, getDocs, writeBatch, collectionGroup, getFirestore } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';

const db = getFirestore(getFirebase());

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
    const q = collection(db, collectionName);
    const snapshot = await getDocs(q);
    
    if(snapshot.empty) return;

    const batches: Promise<void>[] = [];
    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);
        chunk.forEach(doc => batch.delete(doc.ref));
        batches.push(batch.commit());
    }
    await Promise.all(batches);
}

async function deleteGroupCollectionInBatches(collectionName: string) {
    const BATCH_SIZE = 499;
    const q = collectionGroup(db, collectionName);
    const snapshot = await getDocs(q);

    if(snapshot.empty) return;

    const batches: Promise<void>[] = [];
    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
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
