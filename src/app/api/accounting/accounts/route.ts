'use server';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { Account } from '@/types';
import { getAuth } from 'firebase-admin/auth';
import { verifyUser, getUser, C_LEVEL_ROLES } from '@/lib/auth-helpers';

// GET all accounts
export async function GET(request: NextRequest) {
    try {
        await verifyUser(request, C_LEVEL_ROLES);
        
        const accountsSnapshot = await adminDb.collection('accounts').get();
        const accounts = accountsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Account))
            .sort((a, b) => a.name.localeCompare(b.name));
            
        return NextResponse.json({ success: true, data: accounts });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message || 'An unknown error occurred.' }, { status: error.status || 500 });
    }
}


// POST a new account
export async function POST(request: NextRequest) {
    try {
        await verifyUser(request, C_LEVEL_ROLES);
        const body = await request.json();
        const { name, type } = body;

        if (!name || !type) {
            return NextResponse.json({ success: false, message: 'Missing name or type for the new account.' }, { status: 400 });
        }
        
        const newAccount: Omit<Account, 'id'> = {
            name,
            type,
            balance: 0,
        };
        
        const docRef = await adminDb.collection('accounts').add(newAccount);

        return NextResponse.json({ success: true, data: { id: docRef.id, ...newAccount } });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message || 'An unknown error occurred.' }, { status: error.status || 500 });
    }
}

// PUT (update) an existing account
export async function PUT(request: NextRequest) {
    try {
        await verifyUser(request, C_LEVEL_ROLES);
        const body = await request.json();
        const { id, name, type } = body;

        if (!id || !name || !type) {
            return NextResponse.json({ success: false, message: 'Missing id, name, or type for the account update.' }, { status: 400 });
        }
        
        const accountRef = adminDb.collection('accounts').doc(id);
        
        await accountRef.update({ name, type });

        return NextResponse.json({ success: true, data: { id, name, type } });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message || 'An unknown error occurred.' }, { status: error.status || 500 });
    }
}
