'use server';

import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { serverDeleteAllData } from '@/services/server-reset-service';
import { getAdminApp, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    // Ensure the admin app is initialized
    getAdminApp();

    const body = await request.json();
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];

    if (!idToken) {
      return NextResponse.json({ success: false, message: 'Unauthorized: No token provided.' }, { status: 401 });
    }

    // Verify the token and get the user's UID
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // Check the user's role in Firestore
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    // If the user is an admin, proceed with data deletion
    const result = await serverDeleteAllData();

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }

  } catch (error: any) {
    console.error('API Reset Error:', error);
    let message = 'An unknown error occurred.';
    let status = 500;

    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        message = 'Unauthorized: Invalid or expired token.';
        status = 401;
    }
    
    return NextResponse.json({ success: false, message }, { status });
  }
}
