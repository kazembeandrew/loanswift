'use server';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyUser, C_LEVEL_ROLES } from '@/lib/auth-helpers';
import type { AuditLog } from '@/types';
import { collection, getDocs, query, orderBy, type Firestore } from 'firebase/firestore';


export async function GET(request: Request) {
  try {
    // @ts-ignore
    await verifyUser(request, ['admin']);

    const auditLogsCollection = adminDb.collection('audit_logs');
    const q = auditLogsCollection.orderBy('timestamp', 'desc');
    const snapshot = await q.get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));

    return NextResponse.json({ success: true, data: logs });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'An unknown error occurred.' }, { status: error.status || 500 });
  }
}
