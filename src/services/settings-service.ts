'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BusinessSettings } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';

// There will only be one document in this collection, with a fixed ID.
const SETTINGS_DOC_ID = 'business_config';
const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);

const defaultSettings: Omit<BusinessSettings, 'id'> = {
    businessName: 'Janalo Enterprises',
    businessAddress: 'Private Bag 292, Lilongwe',
    businessPhone: '+265 996 566 091 / +265 880 663 248',
    reserveAmount: 0,
};

export async function getSettings(): Promise<BusinessSettings> {
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as BusinessSettings;
        } else {
            // If settings don't exist, create them with default values
            await setDoc(settingsDocRef, defaultSettings).catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: settingsDocRef.path,
                    operation: 'create',
                    requestResourceData: defaultSettings,
                });
                errorEmitter.emit('permission-error', permissionError);
                throw permissionError;
            });
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

export async function updateSettings(settings: Omit<BusinessSettings, 'id'>): Promise<void> {
    // The 'id' is not stored in the document itself.
    const { id, ...settingsData } = settings as BusinessSettings;
    await setDoc(settingsDocRef, settingsData, { merge: true })
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: settingsDocRef.path,
            operation: 'update',
            requestResourceData: settingsData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
}
