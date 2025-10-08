'use client';

import { collection, addDoc, getDocs, query, where, updateDoc, doc, type Firestore, orderBy, limit } from 'firebase/firestore';
import type { SituationReport } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';


export async function addSituationReport(db: Firestore, reportData: Omit<SituationReport, 'id' | 'reportDate' | 'status'>): Promise<string> {
  const reportsCollection = collection(db, 'situationReports');
  const newReport: Omit<SituationReport, 'id'> = {
    ...reportData,
    reportDate: new Date().toISOString(),
    status: 'Open',
  };
  try {
    const docRef = await addDoc(reportsCollection, newReport);
    return docRef.id;
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: reportsCollection.path,
            operation: 'create',
            requestResourceData: newReport,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

export async function getSituationReportsByBorrower(db: Firestore, borrowerId: string): Promise<SituationReport[]> {
  const reportsCollection = collection(db, 'situationReports');
  const q = query(reportsCollection, where("borrowerId", "==", borrowerId), orderBy('reportDate', 'desc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as SituationReport));
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

export async function getAllSituationReports(db: Firestore, borrowerIds?: string[]): Promise<SituationReport[]> {
    const reportsCollection = collection(db, 'situationReports');
    
    let q;
    if (borrowerIds && borrowerIds.length > 0) {
      // Firestore 'in' query is limited to 30 elements
      const chunks = [];
      for (let i = 0; i < borrowerIds.length; i += 30) {
          chunks.push(borrowerIds.slice(i, i + 30));
      }
      
      const reportPromises = chunks.map(chunk => {
        const chunkQuery = query(reportsCollection, where('borrowerId', 'in', chunk), orderBy('reportDate', 'desc'));
        return getDocs(chunkQuery);
      });

      try {
        const querySnapshots = await Promise.all(reportPromises);
        const reports = querySnapshots.flatMap(snapshot =>
          snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SituationReport))
        );
        return reports.sort((a,b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
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
    } else {
       q = query(reportsCollection, orderBy('reportDate', 'desc'), limit(100));
       try {
        const snapshot = await getDocs(q);
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as SituationReport));
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
}

export async function updateSituationReportStatus(db: Firestore, id: string, status: SituationReport['status']): Promise<void> {
    const reportRef = doc(db, 'situationReports', id);
    const updateData = { 
        status: status,
        updatedAt: new Date().toISOString()
    };
    try {
        await updateDoc(reportRef, updateData);
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: reportRef.path,
                operation: 'update',
                requestResourceData: { status },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}
