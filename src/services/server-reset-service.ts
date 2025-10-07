'use client';
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

export async function serverDeleteAllData(): Promise<{ success: boolean; message: string }> {
    try {
        console.log("🚀 Starting server-side data reset...");
        
        let totalDeleted = 0;

        // Delete collection group documents (subcollections) first
        for (const collectionName of groupCollectionsToDelete) {
            const count = await deleteCollectionGroup(collectionName);
            totalDeleted += count;
            console.log(`✅ Deleted ${count} documents from collection group: ${collectionName}`);
        }
        
        // Delete top-level collections
        for (const collectionName of collectionsToDelete) {
            const count = await deleteCollection(collectionName);
            totalDeleted += count;
            console.log(`✅ Deleted ${count} documents from collection: ${collectionName}`);
        }
        
        console.log(`🎉 Server-side data reset completed. Total documents deleted: ${totalDeleted}`);
        
        return { 
            success: true, 
            message: `Successfully reset all data. Deleted ${totalDeleted} documents across ${collectionsToDelete.length + groupCollectionsToDelete.length} collections.`
        };
        
    } catch (error) {
        console.error('❌ Server-side data reset failed:', error);
        return { 
            success: false, 
            message: `Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

async function deleteCollection(collectionName: string): Promise<number> {
    const collectionRef = adminDb.collection(collectionName);
    const snapshot = await collectionRef.get();
    
    if (snapshot.empty) {
        return 0;
    }
    
    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
    return snapshot.size;
}

async function deleteCollectionGroup(collectionName: string): Promise<number> {
    const snapshot = await adminDb.collectionGroup(collectionName).get();
    
    if (snapshot.empty) {
        return 0;
    }
    
    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
    return snapshot.size;
}
