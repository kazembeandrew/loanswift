'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import BorrowerList from './components/borrower-list';
import type { Borrower, Loan, Payment } from '@/types';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { useDB } from '@/lib/firebase-provider';

export default function BorrowersPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  const db = useDB();

  const fetchData = useCallback(async () => {
    const [borrowersData, loansData, paymentsData] = await Promise.all([
      getBorrowers(db),
      getLoans(db),
      getAllPayments(db),
    ]);
    setBorrowers(borrowersData);
    setLoans(loansData);
    setPayments(paymentsData);
  }, [db]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      <Header title="Borrowers" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <BorrowerList borrowers={borrowers} loans={loans} payments={payments} fetchData={fetchData} />
      </main>
    </>
  );
}
