'use client';

import { useState, useEffect } from 'react';
import { useDB } from '@/lib/firebase-client-provider';
import type { UserProfile, Borrower, Loan, Payment } from '@/types';
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
      ? collection(db, 'borrowers')
      : query(collection(db, 'borrowers'), where('loanOfficerId', '==', userProfile.uid));

    const borrowersUnsub = onSnapshot(borrowersQuery, (snapshot) => {
      const borrowersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Borrower));
      setBorrowers(borrowersData);
      // We set loading to false only after the primary data (borrowers) is loaded.
      setLoading(false);
    }, (error) => {
        console.error("Borrowers listener error:", error);
        setLoading(false);
    });

    // 2. Loans Listener
    // For managers, fetch all loans. For others, fetch loans related to their borrowers.
    const borrowerIds = borrowers.map(b => b.id);
    const shouldFetchAllLoans = isManager || borrowerIds.length === 0;

    const loansQuery = shouldFetchAllLoans 
      ? collection(db, 'loans')
      // Note: Firestore 'in' queries are limited to 30 elements. For larger sets, multiple queries would be needed.
      // For this app's scale, we assume a loan officer won't have >30 borrowers assigned at once.
      : query(collection(db, 'loans'), where('borrowerId', 'in', borrowerIds));

    const loansUnsub = onSnapshot(loansQuery, (snapshot) => {
      const loansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
      setLoans(loansData);
    }, (error) => {
        console.error("Loans listener error:", error);
    });

    // 3. Payments Listener (Collection Group)
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
    
  }, [db, userProfile, userProfile?.uid, borrowers.map(b=>b.id).join(','), loans.map(l=>l.id).join(',')]); // Rerun if user or their list of borrowers/loans change

  return { borrowers, loans, payments, loading };
}
