'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut as signOutUser, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, type User } from 'firebase/auth';
import { getUserProfile, ensureUserDocument, type UserProfile } from '@/services/user-service';
import { useFirebaseAuth, useDB } from '@/lib/firebase-provider';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';

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
              console.log(`✅ User profile loaded with role: ${userDoc.role}`);
            } else {
              console.error('❌ Failed to ensure user document - signing out user');
              // If we can't create the user document, sign them out
              await signOutUser(auth);
            }
          }
        } catch (error) {
          console.error('❌ Error ensuring user document:', error);
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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if(db && userCredential.user) {
        const profile = await ensureUserDocument(db, userCredential.user);
        setUserProfile(profile);
    }
    return userCredential;
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Auth not initialized');
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
     if(db && userCredential.user) {
        const profile = await ensureUserDocument(db, userCredential.user);
        setUserProfile(profile);
    }
    return userCredential;
  };

  const signOut = useCallback(async () => {
    if (!auth) throw new Error('Auth not initialized');
    await signOutUser(auth);
  }, [auth]);

  const value = { user, userProfile, loading, signIn, signInWithGoogle, signOut };

  if (loading) {
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
