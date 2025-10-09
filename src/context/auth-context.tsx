'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut as signOutUser, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, type User } from 'firebase/auth';
import { getUserProfile, ensureUserDocument, type UserProfile } from '@/services/user-service';
import { useFirebaseAuth, useDB } from '@/lib/firebase-client-provider';
import { Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = useFirebaseAuth();
  const db = useDB();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth || !db) return;

    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;

      if (user) {
        setUser(user);
        try {
          console.log(`🔄 Ensuring user document for: ${user.uid}`);
          const userDoc = await ensureUserDocument(db, user);
          
          if (mounted) {
            if (userDoc) {
              setUserProfile(userDoc);
              console.log(`✅ User profile loaded: ${userDoc.role}, ${userDoc.status}`);
              
              // Handle user status
              if (userDoc.status === 'approved') {
                if (pathname === '/login' || pathname === '/pending-approval') {
                  router.push('/dashboard');
                }
              } else if (userDoc.status === 'pending') {
                if (pathname !== '/pending-approval') {
                  router.push('/pending-approval');
                }
              }
            } else {
              console.error('❌ Failed to ensure user document');
              // Don't sign out - let user see the error
            }
          }
        } catch (error) {
          console.error('❌ Auth state change error:', error);
          if (mounted) {
            setUserProfile(null);
            // Show user-friendly error
            toast({
              title: 'Authentication Error',
              description: 'Unable to initialize user session. Please try again.',
              variant: 'destructive',
            });
          }
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [auth, db, pathname, router, toast]);

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error('Auth not initialized');
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Auth not initialized');
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const signOut = useCallback(async () => {
    if (!auth) throw new Error('Auth not initialized');
    await signOutUser(auth);
    router.push('/login');
  }, [auth, router]);

  const value = { user, userProfile, loading, signIn, signInWithGoogle, signOut };
  
  if (loading && !pathname.startsWith('/login') && !pathname.startsWith('/pending-approval')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
