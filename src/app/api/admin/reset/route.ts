'use server';

import { NextRequest, NextResponse } from 'next/server';
import { serverDeleteAllData } from '@/services/server-reset-service';
import { verifyUser } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    // Only allow users with the 'admin' role to perform this action.
    await verifyUser(request, ['admin']);

    // If the user is an admin, proceed with data deletion
    const result = await serverDeleteAllData();

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }

  } catch (error: any) {
    console.error('API Reset Error:', error);
    const message = error.message || 'An unknown error occurred.';
    const status = error.status || 500;
    
    return NextResponse.json({ success: false, message }, { status });
  }
}
