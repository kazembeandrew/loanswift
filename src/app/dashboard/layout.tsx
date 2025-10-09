'use client';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarNav } from '@/app/dashboard/sidebar-nav';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, userProfile, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = useCallback(() => {
    signOut().then(() => {
        toast({
          title: 'Session Expired',
          description: 'You have been logged out due to inactivity.',
        });
    });
  }, [signOut, toast]);


  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    
    // Redirect if user status is not approved
    if (!loading && userProfile && userProfile.status !== 'approved') {
      if (userProfile.status === 'pending') {
        router.push('/pending-approval');
      } else {
        // For rejected or other statuses, log out and go to login
        signOut();
        router.push('/login');
      }
      return;
    }
    
    // Only set up timers if the user is logged in and approved
    if(user && userProfile?.status === 'approved') {
        let inactivityTimer: NodeJS.Timeout;

        const resetTimer = () => {
          clearTimeout(inactivityTimer);
          inactivityTimer = setTimeout(handleSignOut, INACTIVITY_TIMEOUT);
        };
        
        const activityEvents = [
          'mousemove',
          'mousedown',
          'keypress',
          'touchstart',
          'scroll'
        ];

        activityEvents.forEach(event => {
          window.addEventListener(event, resetTimer);
        });

        resetTimer(); // Initialize timer

        return () => {
          clearTimeout(inactivityTimer);
           activityEvents.forEach(event => {
            window.removeEventListener(event, resetTimer);
          });
        };
    }

  }, [user, userProfile, loading, router, handleSignOut, signOut]);

  if (loading || !user || !userProfile || userProfile.status !== 'approved') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
        <div className="flex h-screen">
            <SidebarNav />
            <div className="flex flex-1 flex-col overflow-y-auto">
                {children}
            </div>
        </div>
    </SidebarProvider>
  );
}
