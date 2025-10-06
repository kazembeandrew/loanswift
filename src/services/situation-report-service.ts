'use client';

import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SituationReport } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';

const reportsCollection = collection(db, 'situationReports');

export async function addSituationReport(reportData: Omit<SituationReport, 'id' | 'reportDate' | 'status'>): Promise<string> {
  const newReport: Omit<SituationReport, 'id'> = {
    ...reportData,
    reportDate: new Date().toISOString(),
    status: 'Open',
  };
  const docRef = await addDoc(reportsCollection, newReport)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: reportsCollection.path,
            operation: 'create',
            requestResourceData: newReport,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
  return docRef.id;
}

export async function getSituationReportsByBorrower(borrowerId: string): Promise<SituationReport[]> {
  const q = query(reportsCollection, where("borrowerId", "==", borrowerId));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as SituationReport))
      .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: `situationReports where borrowerId == ${borrowerId}`,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

export async function getAllSituationReports(): Promise<SituationReport[]> {
    try {
        const snapshot = await getDocs(reportsCollection);
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as SituationReport))
          .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
    } catch(serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: reportsCollection.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}

export async function updateSituationReportStatus(id: string, status: SituationReport['status']): Promise<void> {
    const reportRef = doc(db, 'situationReports', id);
    const updateData = { 
        status: status,
        updatedAt: new Date().toISOString()
    };
    await updateDoc(reportRef, updateData)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: reportRef.path,
            operation: 'update',
            requestResourceData: { status },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
}
