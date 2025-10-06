'use client';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/sidebar-nav';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutes

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = useCallback(() => {
    signOut();
    toast({
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity.',
    });
  }, [signOut, toast]);


  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

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

  }, [user, loading, router, handleSignOut]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
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
