// Updated FirebaseErrorListener with more specific error handling
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';

export function FirebaseErrorListener() {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      const errorContext = error.context;
      console.error(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            error: error.toJSON(),
            user: user ? { uid: user.uid, email: user.email } : 'unauthenticated',
            context: errorContext
          },
          null,
          2
        )
      );

      // Enhanced error handling based on specific context
      let title = 'Permission Denied';
      let description = "You don't have permission to perform this action.";
      let action: 'signout' | 'none' = 'none';

      // Handle specific error scenarios
      if (!user) {
        title = 'Session Expired';
        description = 'Your session has expired. Please log in again.';
        action = 'signout';
      } 
      else if (errorContext?.path?.includes('users/') && errorContext?.operation === 'write') {
        title = 'Profile Setup Failed';
        description = 'Unable to create your user profile. Please contact support.';
        action = 'signout';
      }
      else if (errorContext?.path?.includes('borrowers')) {
        title = 'Access Restricted';
        description = 'You can only access borrowers assigned to you.';
        action = 'none';
      }
      else if (errorContext?.path?.includes('loans')) {
        title = 'Loan Access Denied';
        description = 'You do not have permission to view these loans.';
        action = 'none';
      }

      // Show toast notification
      toast({
        title,
        description,
        variant: 'destructive',
      });

      // Execute action
      if (action === 'signout') {
        setTimeout(() => {
          signOut();
          router.push('/login');
        }, 3000);
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast, user, signOut, router]);

  return null;
}
