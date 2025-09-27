import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BusinessSettings } from '@/types';

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
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as BusinessSettings;
    } else {
        // If settings don't exist, create them with default values
        await setDoc(settingsDocRef, defaultSettings);
        return { id: SETTINGS_DOC_ID, ...defaultSettings };
    }
}

export async function updateSettings(settings: Omit<BusinessSettings, 'id'>): Promise<void> {
    // The 'id' is not stored in the document itself.
    const { id, ...settingsData } = settings as BusinessSettings;
    await setDoc(settingsDocRef, settingsData);
}
