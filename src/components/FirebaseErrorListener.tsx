'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

/**
 * A client component that listens for Firestore permission errors
 * and displays a user-friendly toast notification. It can also
 * trigger a sign-out if the user is unauthenticated.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.error("Firestore Permission Error Caught:", error.toJSON());

      let description = "You do not have permission to perform this action. Please contact your administrator if you believe this is an error.";

      // If the user isn't logged in at all, it's an auth issue.
      if (!user) {
        description = "Your session may have expired. Please log in again to continue.";
        // Optionally, force a sign-out to clear any invalid state
        signOut();
      }
      
      toast({
        title: 'Permission Denied',
        description: description,
        variant: 'destructive',
      });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast, user, signOut]);

  return null; // This component does not render anything
}
