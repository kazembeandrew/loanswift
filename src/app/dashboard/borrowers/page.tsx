'use client';

import { Header } from '@/components/header';
import BorrowerList from './components/borrower-list';
import { useAuth } from '@/context/auth-context';
import { useDB } from '@/lib/firebase-client-provider';
import { useQuery } from '@tanstack/react-query';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { Loader2 } from 'lucide-react';


export default function BorrowersPage() {
  const db = useDB();
  const { userProfile } = useAuth();
  
  const isManager = userProfile?.role === 'admin' || userProfile?.role === 'ceo' || userProfile?.role === 'cfo';

  const { data: borrowers = [], isLoading: isLoadingBorrowers } = useQuery({
      queryKey: ['borrowers', userProfile?.uid, isManager],
      queryFn: () => getBorrowers(db, isManager ? undefined : userProfile?.uid),
      enabled: !!userProfile,
  });

  const { data: allLoans = [], isLoading: isLoadingLoans } = useQuery({
      queryKey: ['loans'],
      queryFn: () => getLoans(db),
  });

  const { data: allPayments = [], isLoading: isLoadingPayments } = useQuery({
      queryKey: ['allPayments'],
      queryFn: () => getAllPayments(db),
  });

  const isLoading = isLoadingBorrowers || isLoadingLoans || isLoadingPayments;

  // Filter loans and payments to match the fetched borrowers
  const borrowerIds = new Set(borrowers.map(b => b.id));
  const loans = allLoans.filter(l => borrowerIds.has(l.borrowerId));
  const loanIds = new Set(loans.map(l => l.id));
  const payments = allPayments.filter(p => loanIds.has(p.loanId));


  return (
    <>
      <Header title="Borrowers" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <BorrowerList 
              borrowers={borrowers} 
              loans={loans} 
              payments={payments} 
          />
        )}
      </main>
    </>
  );
}
