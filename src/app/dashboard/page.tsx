
'use client';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Header } from '@/components/header';
import CeoDashboard from './components/ceo-dashboard';
import LoanOfficerDashboard from './components/loan-officer-dashboard';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
                        This is the Human Resources dashboard. Your primary functions are user management. Please use the "Staff" link in the Admin section of the sidebar.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}

export default function DashboardPage() {
  const [isAddBorrowerOpen, setAddBorrowerOpen] = useState(false);
  const { userProfile, loading } = useAuth();
  
  if (loading) {
    return (
      <>
        <Header title="Dashboard" />
        <main className="flex-1 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </>
    );
  }

  const renderDashboard = () => {
    switch (userProfile?.role) {
      case 'ceo':
      case 'cfo':
      case 'admin':
        return <CeoDashboard isAddBorrowerOpen={isAddBorrowerOpen} setAddBorrowerOpen={setAddBorrowerOpen} />;
      case 'hr':
        return <HrDashboard />;
      case 'loan_officer':
      default:
        return <LoanOfficerDashboard isAddBorrowerOpen={isAddBorrowerOpen} setAddBorrowerOpen={setAddBorrowerOpen} />;
    }
  };

  return (
    <>
      <Header 
        title="Dashboard" 
        showAddBorrowerButton={userProfile?.role !== 'hr'}
        onAddBorrowerClick={() => setAddBorrowerOpen(true)}
      />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {renderDashboard()}
      </main>
    </>
  );
}

    
