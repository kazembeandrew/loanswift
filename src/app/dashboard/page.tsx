'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Header } from '@/components/header';
import CeoDashboard from './components/ceo-dashboard';
import LoanOfficerDashboard from './components/loan-officer-dashboard';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [isAddBorrowerOpen, setAddBorrowerOpen] = useState(false);
  const { userProfile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header 
        title="Dashboard" 
        showAddBorrowerButton 
        onAddBorrowerClick={() => setAddBorrowerOpen(true)}
      />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {userProfile?.role === 'ceo' || userProfile?.role === 'admin' ? (
          <CeoDashboard isAddBorrowerOpen={isAddBorrowerOpen} setAddBorrowerOpen={setAddBorrowerOpen} />
        ) : (
          <LoanOfficerDashboard isAddBorrowerOpen={isAddBorrowerOpen} setAddBorrowerOpen={setAddBorrowerOpen} />
        )}
      </main>
    </div>
  );
}
