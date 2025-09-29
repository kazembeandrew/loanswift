'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOutUser, signInWithEmail } from '@/services/auth-service';
import { getUserProfile, createUserProfile } from '@/services/user-service';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
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
        setUser(user);
        let profile = await getUserProfile(user.uid);
        if (!profile) {
            // If the user exists in Auth but not in Firestore, create their profile.
            // This handles the case for the very first admin user or other pre-existing auth users.
            profile = await createUserProfile(user);
            // For the very first user, we can make them an admin.
            // This logic can be more sophisticated, e.g., checking if it's the first document.
            // For now, we'll keep it simple. The role can be changed in Firestore manually.
        }
        setUserProfile(profile);
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
        const user = userCredential;
        const profile = await getUserProfile(user.uid);
        setUser(user);
        setUserProfile(profile);
        router.push('/dashboard');
        return user;
    } catch (error) {
        console.error("Sign in error:", error);
        throw error;
    }
  };

  const signOut = async () => {
    await signOutUser();
    setUser(null);
    setUserProfile(null);
    router.push('/login');
  };

  const value = { user, userProfile, loading, signIn, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
