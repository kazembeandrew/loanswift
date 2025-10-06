'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';

/**
 * A client component that listens for Firestore permission errors
 * and throws them to be caught by Next.js's development error overlay.
 * This is a DEVELOPMENT ONLY tool.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Throw the error so Next.js can catch it and display the overlay
      // which allows for better debugging during development.
      throw error;
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null; // This component does not render anything
}
