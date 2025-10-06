'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as signOutUser, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ensureUserDocument, type UserProfile } from '@/services/user-service';
import { useRouter } from 'next/navigation';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface AuthContextType {
  user: import('firebase/auth').User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => void;
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
  const [user, setUser] = useState<import('firebase/auth').User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;

      if (user) {
        setUser(user);
        try {
          const userDoc = await ensureUserDocument(user);
          if (mounted) {
            setUserProfile(userDoc);
          }
        } catch (error) {
          console.error('Error ensuring user document:', error);
          if (mounted) {
            setUserProfile(null);
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
  }, []);

  const signIn = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await signOutUser(auth);
    router.push('/login');
  };

  const value = { user, userProfile, loading, signIn, signInWithGoogle, signOut };
  
  // This effect handles redirection after login/logout.
  // It's separated to avoid circular dependencies.
  useEffect(() => {
      if (!loading && user) {
          router.push('/dashboard');
      }
  }, [user, loading, router]);


  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      {process.env.NODE_ENV === 'development' && <FirebaseErrorListener />}
    </AuthContext.Provider>
  );
}