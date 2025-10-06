'use client';

import { collection, addDoc, getDocs, query, orderBy, type Firestore } from 'firebase/firestore';
import type { AuditLog } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';

/**
 * Adds a new entry to the audit log. This is an admin-only operation.
 * @param db The Firestore instance.
 * @param logData The data for the audit log entry.
 * @returns A promise that resolves to the ID of the new log entry.
 */
export async function addAuditLog(db: Firestore, logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> {
  const auditLogsCollection = collection(db, 'audit_logs');
  const fullLogData = {
    ...logData,
    timestamp: new Date().toISOString(),
  };

  const docRef = await addDoc(auditLogsCollection, fullLogData)
    .catch(async (serverError) => {
      // This is a critical failure, but we don't want to break the user's action.
      // We will log it to the console and can emit a specialized error if needed.
      console.error("CRITICAL: Failed to write to audit log.", serverError);
      
      // We are not re-throwing or emitting a UI error because the primary user
      // action (e.g. creating a user) likely succeeded. Failing silently here
      // prevents the user from thinking their action failed.
    });

  return docRef ? docRef.id : '';
}

/**
 * Fetches all audit log entries, sorted by most recent first.
 * This is an admin-only operation.
 * @param db The Firestore instance.
 * @returns A promise that resolves to an array of audit log entries.
 */
export async function getAuditLogs(db: Firestore): Promise<AuditLog[]> {
  const auditLogsCollection = collection(db, 'audit_logs');
  const q = query(auditLogsCollection, orderBy('timestamp', 'desc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: auditLogsCollection.path,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}
