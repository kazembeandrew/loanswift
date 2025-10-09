
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDB } from '@/lib/firebase-client-provider';
import type { User, UserProfile, Borrower, Loan, Payment, Account, JournalEntry, SituationReport } from '@/types';
import { onSnapshot, collection, query, where, doc, orderBy, collectionGroup } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';

export function useRealtimeData(user: User | null) {
  const { userProfile } = useAuth();
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [situationReports, setSituationReports] = useState<SituationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useDB();

  useEffect(() => {
    if (!user || !db || !userProfile) {
        setLoading(false);
        return;
    };
    
    setLoading(true);
    const isManager = userProfile.role === 'admin' || userProfile.role === 'ceo' || userProfile.role === 'cfo';

    // 1. Borrowers Listener
    const borrowersQuery = isManager
      ? query(collection(db, 'borrowers'), orderBy('joinDate', 'desc'))
      : query(collection(db, 'borrowers'), where('loanOfficerId', '==', userProfile.uid), orderBy('joinDate', 'desc'));

    const borrowersUnsub = onSnapshot(borrowersQuery, (snapshot) => {
      const borrowersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Borrower));
      setBorrowers(borrowersData);
      setLoading(false); // Consider loading complete after first data set arrives
    }, (error) => {
        console.error("Borrowers listener error:", error);
        setLoading(false);
    });

    // 2. Payments Listener (Collection Group)
    const paymentsQuery = isManager
      ? query(collectionGroup(db, 'payments'), orderBy('date', 'desc'))
      : query(collectionGroup(db, 'payments')); // No initial filter for L.O, will filter client side

    const paymentsUnsub = onSnapshot(paymentsQuery, (snapshot) => {
      const paymentsData: (Payment & { loanId: string })[] = [];
      snapshot.forEach((doc) => {
        const loanDocRef = doc.ref.parent.parent;
        if (loanDocRef) {
            const loanId = loanDocRef.id;
            paymentsData.push({ loanId, id: doc.id, ...doc.data() } as Payment & { loanId: string });
        }
      });
      setPayments(paymentsData);
    }, (error) => console.error("Payments listener error:", error));
    
    // 3. Financials & Global Reports Listeners (only for managers)
    let accountsUnsub = () => {};
    let journalUnsub = () => {};
    
    if(isManager) {
        accountsUnsub = onSnapshot(query(collection(db, 'accounts'), orderBy('name')), (snapshot) => {
            setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)));
        }, (error) => console.error("Accounts listener error:", error));

        journalUnsub = onSnapshot(query(collection(db, 'journal'), orderBy('date', 'desc')), (snapshot) => {
            setJournalEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry)));
        }, (error) => console.error("Journal listener error:", error));
    }
    
    // 4. Situation Reports Listener (All Staff)
    const reportsUnsub = onSnapshot(query(collection(db, 'situationReports'), orderBy('reportDate', 'desc')), (snapshot) => {
        setSituationReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SituationReport)));
    }, (error) => console.error("Situation Reports listener error:", error));


    return () => {
      borrowersUnsub();
      paymentsUnsub();
      accountsUnsub();
      journalUnsub();
      reportsUnsub();
    };
    
  }, [db, user, userProfile]);


  // Derived State for Loans based on Borrowers (for loan officers)
  useEffect(() => {
    if (!db || !userProfile) return;

    // Managers get all loans
    if (userProfile.role === 'admin' || userProfile.role === 'ceo' || userProfile.role === 'cfo') {
        const unsub = onSnapshot(query(collection(db, 'loans'), orderBy('startDate', 'desc')), (snapshot) => {
            setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
        }, (error) => console.error("All Loans listener error:", error));
        return () => unsub();
    }
    
    // Loan Officers get loans based on their borrowers
    const myBorrowerIds = borrowers.map(b => b.id);
    if (myBorrowerIds.length > 0) {
        // Firestore 'in' queries are limited to 30 elements. Chunk if necessary.
        const loansQuery = query(collection(db, 'loans'), where('borrowerId', 'in', myBorrowerIds.slice(0, 30)));
        const unsub = onSnapshot(loansQuery, (snapshot) => {
            setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
        }, (error) => console.error("Filtered Loans listener error:", error));
        return () => unsub();
    } else {
        setLoans([]); // No borrowers, so no loans for this officer
    }
    
  }, [borrowers, db, userProfile]);
  
  // Memoized payments filtered by role
  const filteredPayments = useMemo(() => {
    if (!userProfile) return [];
    if (userProfile.role === 'admin' || userProfile.role === 'ceo' || userProfile.role === 'cfo') {
        return payments; // Managers see all payments
    }
    // Loan officers only see payments for their loans
    const myLoanIds = new Set(loans.map(l => l.id));
    return payments.filter(p => myLoanIds.has(p.loanId));
  }, [payments, loans, userProfile]);
  
  // Memoized situation reports filtered by role
  const filteredSituationReports = useMemo(() => {
    if (!userProfile) return [];
     if (userProfile.role === 'admin' || userProfile.role === 'ceo' || userProfile.role === 'cfo') {
        return situationReports; // Managers see all reports
    }
    // Loan officers only see reports for their assigned borrowers
    const myBorrowerIds = new Set(borrowers.map(b => b.id));
    return situationReports.filter(report => myBorrowerIds.has(report.borrowerId));

  }, [situationReports, borrowers, userProfile]);

  // The hook returns data scoped to the user's role
  return { 
      borrowers, 
      loans, 
      payments: filteredPayments, 
      accounts, 
      journalEntries, 
      situationReports: filteredSituationReports,
      loading 
  };
}
