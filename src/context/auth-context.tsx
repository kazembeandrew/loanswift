'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut as signOutUser, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, type User } from 'firebase/auth';
import { ensureUserDocument, type UserProfile } from '@/services/user-service';
import { useRouter, usePathname } from 'next/navigation';
import { useFirebaseAuth, useDB } from '@/lib/firebase-provider';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import ClientOnly from '@/components/client-only';

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
  const pathname = usePathname();

  useEffect(() => {
    if (!auth || !db) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const userDoc = await ensureUserDocument(db, user);
        setUserProfile(userDoc);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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

  const signOut = useCallback(async () => {
    if (!auth) throw new Error('Auth not initialized');
    await signOutUser(auth);
    setUser(null);
    setUserProfile(null);
    router.push('/login');
  }, [auth, router]);

  const value = { user, userProfile, loading, signIn, signInWithGoogle, signOut };
  
  useEffect(() => {
      if (!loading && user && userProfile && pathname === '/login') {
          router.push('/dashboard');
      }
  }, [user, userProfile, loading, pathname, router]);


  if (loading && pathname !== '/login') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
        {children}
        <ClientOnly>
          <Toaster />
        </ClientOnly>
    </AuthContext.Provider>
  );
}
