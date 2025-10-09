
'use client';

import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function GracefulFallback({
  children,
  fallback,
  isAllowed = true,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  isAllowed?: boolean;
}) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || userProfile?.status !== 'approved' || !isAllowed) {
    return fallback || <div>Access unavailable. Please check your permissions.</div>;
  }

  return <>{children}</>;
}
