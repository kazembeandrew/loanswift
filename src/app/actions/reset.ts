'use server';

import { serverDeleteAllData } from '@/services/server-reset-service';
import { adminDb } from '@/lib/firebase-admin';

// Enhanced security version
export async function resetDataAction(userId: string): Promise<{ success: boolean; message: string }> {
    try {
        if (!userId) {
            return {
                success: false,
                message: 'Unauthorized: User ID not provided.'
            };
        }
        // Check if user is admin
        const userDoc = await adminDb.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
             return { 
                success: false, 
                message: 'Unauthorized: User not found.' 
            };
        }
        const userData = userDoc.data();
        
        if (userData?.role !== 'admin') {
            return { 
                success: false, 
                message: 'Unauthorized: Admin access required' 
            };
        }
        
        await serverDeleteAllData();
        
        return { 
            success: true, 
            message: 'All data has been successfully reset.' 
        };
        
    } catch (error) {
        console.error('Reset action failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during the reset process.';
        return { 
            success: false, 
            message: errorMessage
        };
    }
}
