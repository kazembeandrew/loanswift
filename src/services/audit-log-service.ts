import { collection, addDoc, getDocs, query, orderBy, type Firestore } from 'firebase/firestore';
import type { AuditLog } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Adds a new entry to the audit log using the Admin SDK. This is a server-only operation.
 * @param logData The data for the audit log entry.
 */
export async function addAuditLog(logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
  const fullLogData = {
    ...logData,
    timestamp: new Date().toISOString(),
  };

  try {
    await adminDb.collection('audit_logs').add(fullLogData);
  } catch (error) {
    // This is a critical failure, but we don't want to break the user's action.
    // We will log it to the console and can emit a specialized error if needed.
    console.error("CRITICAL: Failed to write to audit log.", error);
    // We are not re-throwing or emitting a UI error because the primary user
    // action (e.g. creating a user) likely succeeded. Failing silently here
    // prevents the user from thinking their action failed.
  }
}
