'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as signOutUser, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, type User } from 'firebase/auth';
import { ensureUserDocument, type UserProfile } from '@/services/user-service';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth, useDB } from '@/lib/firebase-provider';


interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const auth = useFirebaseAuth();
  const db = useDB();

  useEffect(() => {
    if (!auth || !db) return; // Wait for auth and db to be initialized

    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;

      if (user) {
        setUser(user);
        try {
          const userDoc = await ensureUserDocument(db, user);
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
  }, [auth, db]);

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error('Auth not initialized');
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Auth not initialized');
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    if (!auth) throw new Error('Auth not initialized');
    await signOutUser(auth);
    router.push('/login');
  };

  const value = { user, userProfile, loading, signIn, signInWithGoogle, signOut };
  
  useEffect(() => {
      if (!loading && user) {
          router.push('/dashboard');
      }
  }, [user, loading, router]);


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
