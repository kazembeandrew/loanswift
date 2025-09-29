import { collection, getDocs, writeBatch, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const collectionsToDelete = [
    'borrowers', 
    'capital', 
    'drawings', 
    'expenses', 
    'income', 
    'conversations',
    'settings', // also reset settings
];
const subcollectionsToDelete = ['payments']; // subcollections under 'loans'
const groupCollectionsToDelete = ['payments', 'messages']; // subcollections we can query directly


// Firestore limits batch writes to 500 operations.
const BATCH_SIZE = 499;

async function deleteCollection(collectionPath: string, batch: FirebaseFirestore.WriteBatch) {
    const snapshot = await getDocs(collection(db, collectionPath));
    if (snapshot.size === 0) return 0;

    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    return snapshot.size;
}

async function deleteCollectionInBatches(collectionName: string) {
    const q = collection(db, collectionName);
    const snapshot = await getDocs(q);
    
    if(snapshot.empty) return;

    const batches = [];
    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);
        chunk.forEach(doc => batch.delete(doc.ref));
        batches.push(batch.commit());
    }
    await Promise.all(batches);
}

async function deleteGroupCollectionInBatches(collectionName: string) {
    const q = collectionGroup(db, collectionName);
    const snapshot = await getDocs(q);

    if(snapshot.empty) return;

    const batches = [];
    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);
        chunk.forEach(doc => batch.delete(doc.ref));
        batches.push(batch.commit());
    }
    await Promise.all(batches);
}


export async function deleteAllData(): Promise<void> {
    
    // First, delete all subcollections within loans
    const loansSnapshot = await getDocs(collection(db, 'loans'));
    for (const loanDoc of loansSnapshot.docs) {
        for (const subcollectionName of subcollectionsToDelete) {
            await deleteCollectionInBatches(`loans/${loanDoc.id}/${subcollectionName}`);
        }
    }
    
    // Now delete the loans collection itself
    await deleteCollectionInBatches('loans');

    // Delete all top-level collections
    for (const collectionName of collectionsToDelete) {
        await deleteCollectionInBatches(collectionName);
    }

    // Delete group collections that might exist under different parents (like chat messages)
    for (const collectionName of groupCollectionsToDelete) {
        await deleteGroupCollectionInBatches(collectionName);
    }

    console.log("All data deletion process completed.");
}
