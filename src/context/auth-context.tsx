'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOutUser, signInWithEmail } from '@/services/auth-service';
import { getUserProfile, seedInitialAdmin } from '@/services/user-service';
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

// A flag to ensure seeding only runs once per session.
let adminSeeded = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        
        // Force refresh the token to get custom claims
        await user.getIdTokenResult(true);

        if (!adminSeeded) {
          try {
            await seedInitialAdmin();
            adminSeeded = true;
            console.log("Initial admin seeding process completed.");
          } catch(error) {
            console.error("Admin seeding failed:", error);
          }
        }
        
        const tokenResult = await user.getIdTokenResult();
        const claims = tokenResult.claims;
        const userRole = claims.role as UserProfile['role'] || 'loan_officer';

        // Fetch profile from Firestore, but use the claim as the source of truth for the role
        let profile = await getUserProfile(user.uid);
        if (profile) {
            profile.role = userRole; // Ensure role is consistent with claim
            setUserProfile(profile);
        } else {
            // This case is for a user that exists in Auth but not Firestore.
            // This shouldn't happen in normal flow with our new user creation logic.
            // But as a fallback, create a profile.
            const newProfileData: UserProfile = {
                uid: user.uid,
                email: user.email || '',
                role: userRole,
            };
            // This doesn't call the full createUserProfile service to avoid a server-to-server loop
            // on claims. We assume claims are set by an admin action.
            const { setDoc, doc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            await setDoc(doc(db, 'users', user.uid), newProfileData);
            setUserProfile(newProfileData);
        }
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
        // The onAuthStateChanged listener will handle setting user and userProfile state
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
