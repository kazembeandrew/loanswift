'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOutUser, signInWithEmail } from '@/services/auth-service';
import { createUserProfile, getUserProfile } from '@/services/user-service';
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
        
        // Force refresh the token to get custom claims immediately after login/state change
        await user.getIdTokenResult(true);
        const tokenResult = await user.getIdTokenResult();
        const claims = tokenResult.claims;
        const userRole = claims.role as UserProfile['role'] || 'loan_officer';

        // This server-side function now handles both creation and role synchronization.
        const profile = await createUserProfile({ uid: user.uid, email: user.email! }, userRole);
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
        // The onAuthStateChanged listener will handle setting user and userProfile state
        // and redirecting to the dashboard.
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

  useEffect(() => {
    if (!loading && user) {
        router.push('/dashboard');
    }
  }, [user, loading, router]);


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
