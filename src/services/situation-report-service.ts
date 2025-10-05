
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SituationReport } from '@/types';

const reportsCollection = collection(db, 'situationReports');

export async function addSituationReport(reportData: Omit<SituationReport, 'id' | 'reportDate' | 'status'>): Promise<string> {
  const newReport: Omit<SituationReport, 'id'> = {
    ...reportData,
    reportDate: new Date().toISOString(),
    status: 'Open',
  };
  const docRef = await addDoc(reportsCollection, newReport);
  return docRef.id;
}

export async function getSituationReportsByBorrower(borrowerId: string): Promise<SituationReport[]> {
  const q = query(reportsCollection, where("borrowerId", "==", borrowerId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as SituationReport))
    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
}

export async function getAllSituationReports(): Promise<SituationReport[]> {
    const snapshot = await getDocs(reportsCollection);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as SituationReport))
      .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
}
