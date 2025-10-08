'use client';
import { useAuth } from '@/context/auth-context';
import { Header } from '@/components/header';
import CeoDashboard from './components/ceo-dashboard';
import LoanOfficerDashboard from './components/loan-officer-dashboard';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function HrDashboard() {
    return (
        <div className="space-y-6">
             <h1 className="font-headline text-3xl font-semibold">
                Welcome, HR Manager
            </h1>
            <Card>
                <CardHeader>
                    <CardTitle>HR Dashboard</CardTitle>
                    <CardDescription>
                        Your primary function is user management. Please use the "Staff" link in the Admin section of the sidebar.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}

function AdminDashboard() {
    return (
         <div className="space-y-6">
             <h1 className="font-headline text-3xl font-semibold">
                Welcome, Administrator
            </h1>
            <Card>
                <CardHeader>
                    <CardTitle>Administrator Dashboard</CardTitle>
                    <CardDescription>
                        You have access to all system features, including user management and system settings. Please use the sidebar to navigate.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}

function DashboardSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-9 w-64" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-32 mt-2" /></CardHeader><CardContent><Skeleton className="h-7 w-36" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-40 mt-2" /></CardHeader><CardContent><Skeleton className="h-7 w-32" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-44 mt-2" /></CardHeader><CardContent><Skeleton className="h-7 w-32" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-48 mt-2" /></CardHeader><CardContent><Skeleton className="h-7 w-12" /></CardContent></Card>
            </div>
        </div>
    )
}

export default function DashboardPage() {
  const { userProfile, loading } = useAuth();
  
  if (loading) {
    return (
      <>
        <Header title="Dashboard" />
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <DashboardSkeleton />
        </main>
      </>
    );
  }

  const renderDashboard = () => {
    switch (userProfile?.role) {
      case 'ceo':
      case 'cfo':
        return <CeoDashboard />;
      case 'admin':
        // Admin gets the CEO dashboard view plus their admin capabilities via the sidebar.
        return <CeoDashboard />;
      case 'hr':
        return <HrDashboard />;
      case 'loan_officer':
      default:
        return <LoanOfficerDashboard />;
    }
  };

  return (
    <>
      <Header 
        title="Dashboard"
      />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {renderDashboard()}
      </main>
    </>
  );
}
