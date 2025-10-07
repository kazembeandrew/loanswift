// services/server-reset-service.ts
import { adminDb } from '@/lib/firebase-admin';

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

export async function serverDeleteAllData(): Promise<void> {
    console.log("Starting server-side data reset...");
    
    // Delete top-level collections
    for (const collectionName of collectionsToDelete) {
        await deleteCollection(collectionName);
    }
    
    // Delete collection group documents (subcollections)
    for (const collectionName of groupCollectionsToDelete) {
        await deleteCollectionGroup(collectionName);
    }
    
    console.log("Server-side data reset completed.");
}

async function deleteCollection(collectionName: string): Promise<void> {
    try {
        const collectionRef = adminDb.collection(collectionName);
        const snapshot = await collectionRef.get();
        
        if (snapshot.empty) {
            console.log(`Collection ${collectionName} is empty, skipping...`);
            return;
        }
        
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`✅ Deleted ${snapshot.size} documents from ${collectionName}`);
        
    } catch (error) {
        console.error(`❌ Error deleting collection ${collectionName}:`, error);
        throw error;
    }
}

async function deleteCollectionGroup(collectionName: string): Promise<void> {
    try {
        const snapshot = await adminDb.collectionGroup(collectionName).get();
        
        if (snapshot.empty) {
            console.log(`Collection group ${collectionName} is empty, skipping...`);
            return;
        }
        
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`✅ Deleted ${snapshot.size} documents from collection group ${collectionName}`);
        
    } catch (error) {
        console.error(`❌ Error deleting collection group ${collectionName}:`, error);
        throw error;
    }
}
