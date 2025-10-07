'use server';

import { serverDeleteAllData } from '@/services/server-reset-service';

export async function handleDeleteAllData(): Promise<{ success: boolean; error?: string }> {
  try {
    await serverDeleteAllData();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: `Failed to delete all data: ${errorMessage}` };
  }
}
