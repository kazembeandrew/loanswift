'use client';

import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PendingApprovalPage() {
  const { userProfile, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Clock className="h-12 w-12 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Pending Approval</CardTitle>
          <CardDescription>
            Your account is waiting for administrator approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Waiting for admin approval...
            </span>
          </div>
          <div className="text-sm space-y-2">
            <p>Welcome, {userProfile?.displayName}!</p>
            <p className="text-muted-foreground">
              Your account has been created with the email{' '}
              <span className="font-semibold text-primary">{userProfile?.email}</span> and is
              pending review. You will be able to access the dashboard once approved.
            </p>
          </div>
           <Button variant="outline" onClick={signOut} className="w-full">
                Logout
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
