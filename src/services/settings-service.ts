'use client';

import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import type { BusinessSettings } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';

// There will only be one document in this collection, with a fixed ID.
const SETTINGS_DOC_ID = 'business_config';


const defaultSettings: Omit<BusinessSettings, 'id'> = {
    businessName: 'Janalo Enterprises',
    businessAddress: 'Private Bag 292, Lilongwe',
    businessPhone: '+265 996 566 091 / +256 880 663 248',
    reserveAmount: 0,
};

export async function getSettings(db: Firestore): Promise<BusinessSettings> {
    const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as BusinessSettings;
        } else {
            // If settings don't exist, create them with default values
            await setDoc(settingsDocRef, defaultSettings);
            return { id: SETTINGS_DOC_ID, ...defaultSettings };
        }
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: settingsDocRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}

export async function updateSettings(db: Firestore, settings: Omit<BusinessSettings, 'id'>): Promise<void> {
    const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);
    // The 'id' is not stored in the document itself.
    const { id, ...settingsData } = settings as BusinessSettings;
    try {
        await setDoc(settingsDocRef, settingsData, { merge: true });
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: settingsDocRef.path,
                operation: 'update',
                requestResourceData: settingsData,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}
