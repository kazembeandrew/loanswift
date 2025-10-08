'use client';

import { useState, useEffect } from 'react';
import { useDB } from '@/lib/firebase-client-provider';
import type { UserProfile, Borrower, Loan, Payment } from '@/types';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { getAllPayments } from '@/services/payment-service';
import { onSnapshot, collection, query, where } from 'firebase/firestore';

export function useRealtimeData(userProfile: UserProfile | null) {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useDB();

  useEffect(() => {
    if (!userProfile || !db) {
        setLoading(false);
        return;
    };
    
    setLoading(true);

    const isManager = userProfile.role === 'admin' || userProfile.role === 'ceo' || userProfile.role === 'cfo';

    // 1. Borrowers Listener
    const borrowersQuery = isManager
      ? query(collection(db, 'borrowers'))
      : query(collection(db, 'borrowers'), where('loanOfficerId', '==', userProfile.uid));

    const borrowersUnsub = onSnapshot(borrowersQuery, (snapshot) => {
      const borrowersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Borrower));
      setBorrowers(borrowersData);
      setLoading(false);
    }, (error) => {
        console.error("Borrowers listener error:", error);
        setLoading(false);
    });

    // 2. Loans Listener
    const loansQuery = query(collection(db, 'loans'));
    const loansUnsub = onSnapshot(loansQuery, (snapshot) => {
      let loansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
      if (!isManager) {
        const myBorrowerIds = borrowers.map(b => b.id);
        loansData = loansData.filter(loan => myBorrowerIds.includes(loan.borrowerId));
      }
      setLoans(loansData);
    }, (error) => {
        console.error("Loans listener error:", error);
    });

    // 3. Payments Listener (Collection Group)
    const paymentsQuery = query(collection(db, 'payments'));
    const paymentsUnsub = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const paymentsData: (Payment & { loanId: string })[] = [];
      snapshot.forEach((doc) => {
            const loanDocRef = doc.ref.parent.parent;
            if (loanDocRef) {
                const loanId = loanDocRef.id;
                paymentsData.push({ loanId, id: doc.id, ...doc.data() } as Payment & { loanId: string });
            }
        });

      if (!isManager) {
        const myLoanIds = loans.map(l => l.id);
        const filteredPayments = paymentsData.filter(p => myLoanIds.includes(p.loanId));
        setPayments(filteredPayments);
      } else {
        setPayments(paymentsData);
      }
    }, (error) => {
        console.error("Payments listener error:", error);
    });

    return () => {
      borrowersUnsub();
      loansUnsub();
      paymentsUnsub();
    };
    
  }, [db, userProfile, borrowers, loans, userProfile?.uid]); // Dependencies are important to re-run listeners if user or their role changes.

  return { borrowers, loans, payments, loading };
}
