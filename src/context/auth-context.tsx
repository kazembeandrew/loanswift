'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOutUser, signInWithEmail, signInWithGoogle } from '@/services/auth-service';
import { ensureUserDocument } from '@/services/user-service';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';
import { useRouter } from 'next/navigation';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await ensureUserDocument(user);
        setUser(user);
        setUserProfile(userDoc);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const signIn = async (email: string, password: string) => {
    try {
        const userCredential = await signInWithEmail(email, password);
        // The onAuthStateChanged listener will handle the rest
    } catch (error) {
        console.error("Sign in error:", error);
        throw error;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error("Google Sign in error:", error);
      throw error;
    }
  };


  const signOut = async () => {
    await signOutUser();
    setUser(null);
    setUserProfile(null);
    router.push('/login');
  };

  const value = { user, userProfile, loading, signIn, signInWithGoogle: handleGoogleSignIn, signOut };

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
