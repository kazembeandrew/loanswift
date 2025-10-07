'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import BorrowerList from './components/borrower-list';
import type { Borrower, Loan, Payment } from '@/types';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { useDB } from '@/lib/firebase-client-provider';
import { useAuth } from '@/context/auth-context';

export default function BorrowersPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  const db = useDB();
  const { userProfile } = useAuth();
  
  const isManager = userProfile?.role === 'admin' || userProfile?.role === 'ceo' || userProfile?.role === 'cfo';

  const fetchData = useCallback(async () => {
    // Managers see all borrowers, loan officers see only their own.
    const borrowersData = await getBorrowers(db, isManager ? undefined : userProfile?.uid);
    const [loansData, paymentsData] = await Promise.all([
      getLoans(db),
      getAllPayments(db),
    ]);
    
    setBorrowers(borrowersData);

    // Filter loans and payments to match the fetched borrowers
    const borrowerIds = new Set(borrowersData.map(b => b.id));
    const filteredLoans = loansData.filter(l => borrowerIds.has(l.borrowerId));
    const loanIds = new Set(filteredLoans.map(l => l.id));
    const filteredPayments = paymentsData.filter(p => loanIds.has(p.loanId));
    
    setLoans(filteredLoans);
    setPayments(filteredPayments);

  }, [db, userProfile, isManager]);

  useEffect(() => {
    if (userProfile) {
        fetchData();
    }
  }, [fetchData, userProfile]);

  return (
    <>
      <Header title="Borrowers" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <BorrowerList borrowers={borrowers} loans={loans} payments={payments} fetchData={fetchData} />
      </main>
    </>
  );
}
