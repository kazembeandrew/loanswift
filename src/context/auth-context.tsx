'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOutUser, signInWithEmail } from '@/services/auth-service';
import type { User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const signIn = async (email: string, password: string) => {
    try {
        const user = await signInWithEmail(email, password);
        setUser(user);
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
    router.push('/login');
  };

  const value = { user, loading, signIn, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
