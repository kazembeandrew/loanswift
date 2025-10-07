'use server';

import { serverDeleteAllData } from '@/services/server-reset-service';

export async function resetDataAction(): Promise<{ success: boolean; message: string }> {
    try {
        // Add admin check here if needed
        // For example, using a session management library:
        // const { user } = await getSession();
        // if (user.role !== 'admin') {
        //   throw new Error('Unauthorized');
        // }
        
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
