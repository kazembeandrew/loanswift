'use server';
import { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, adminDb } from '@/lib/firebase-admin';

export const C_LEVEL_ROLES = ['ceo', 'cfo', 'admin'];
export const ALL_STAFF_ROLES = ['loan_officer', 'hr', ...C_LEVEL_ROLES];

/**
 * Retrieves a user's full profile from UID using the Admin SDK.
 * @param uid The user's UID.
 * @returns A promise that resolves to the user's profile object.
 */
export async function getUser(uid: string): Promise<{ email: string; role: string }> {
  try {
    const userRecord = await getAuth(getAdminApp()).getUser(uid);
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const role = userDoc.exists ? userDoc.data()?.role : 'unknown';
    return { email: userRecord.email || 'unknown', role };
  } catch (error) {
    console.error(`Failed to get user data for UID: ${uid}`, error);
    return { email: 'unknown', role: 'unknown' };
  }
}

/**
 * Verifies the Firebase ID token from a request and checks if the user has one of the allowed roles.
 * Throws an error if unauthorized or forbidden.
 * @param request The NextRequest object.
 * @param allowedRoles An array of roles that are allowed to access the resource.
 * @returns A promise that resolves to the user's UID and email if authorized.
 */
export async function verifyUser(request: NextRequest, allowedRoles: string[]): Promise<{ uid: string; email: string }> {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];

    if (!idToken) {
      throw { message: 'Unauthorized: No token provided.', status: 401 };
    }
    
    getAdminApp(); // Ensure admin app is initialized
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const user = await getUser(decodedToken.uid);

    if (!allowedRoles.includes(user.role)) {
       throw { message: 'Forbidden: You do not have permission to perform this action.', status: 403 };
    }

    return { uid: decodedToken.uid, email: user.email };
}
