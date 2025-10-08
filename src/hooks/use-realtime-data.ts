'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDB } from '@/lib/firebase-client-provider';
import type { User, UserProfile, Borrower, Loan, Payment, Account, JournalEntry, SituationReport } from '@/types';
import { onSnapshot, collection, query, where, doc, orderBy } from 'firebase/firestore';

export function useRealtimeData(user: User | null) {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [situationReports, setSituationReports] = useState<SituationReport[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const db = useDB();

  useEffect(() => {
    if (!user || !db) {
        setLoading(false);
        return;
    };
    
    setLoading(true);

    const userUnsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      const profile = { uid: doc.id, ...doc.data() } as UserProfile;
      setUserProfile(profile);
      // Let other listeners proceed now that profile is loaded
    }, (error) => {
      console.error("User Profile listener error:", error);
      setLoading(false);
    });

    return () => { userUnsub(); };
  }, [user, db]);

  useEffect(() => {
    if (!userProfile || !db) {
        setLoading(false);
        return;
    };

    const isManager = userProfile.role === 'admin' || userProfile.role === 'ceo' || userProfile.role === 'cfo';

    // 1. Borrowers Listener
    const borrowersQuery = isManager
      ? collection(db, 'borrowers')
      : query(collection(db, 'borrowers'), where('loanOfficerId', '==', userProfile.uid));

    const borrowersUnsub = onSnapshot(borrowersQuery, (snapshot) => {
      const borrowersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Borrower));
      setBorrowers(borrowersData);
      setLoading(false);
    }, (error) => {
        console.error("Borrowers listener error:", error);
        setLoading(false);
    });

    // 2. Payments Listener (Collection Group) - Fetches all payments. Will be filtered later.
    const paymentsUnsub = onSnapshot(collection(db, 'payments'), (snapshot) => {
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
    let reportsUnsub = () => {};

    if(isManager) {
        accountsUnsub = onSnapshot(collection(db, 'accounts'), (snapshot) => {
            setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)).sort((a,b) => a.name.localeCompare(b.name)));
        }, (error) => console.error("Accounts listener error:", error));

        journalUnsub = onSnapshot(query(collection(db, 'journal'), orderBy('date', 'desc')), (snapshot) => {
            setJournalEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry)));
        }, (error) => console.error("Journal listener error:", error));

        reportsUnsub = onSnapshot(query(collection(db, 'situationReports'), orderBy('reportDate', 'desc')), (snapshot) => {
            setSituationReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SituationReport)));
        }, (error) => console.error("Situation Reports listener error:", error));
    }


    return () => {
      borrowersUnsub();
      paymentsUnsub();
      accountsUnsub();
      journalUnsub();
      reportsUnsub();
    };
    
  }, [db, userProfile]);


  // Derived State for Loans based on Borrowers (for loan officers)
  useEffect(() => {
    if (!db || !userProfile) return;

    if (userProfile.role === 'admin' || userProfile.role === 'ceo' || userProfile.role === 'cfo') {
        const unsub = onSnapshot(collection(db, 'loans'), (snapshot) => {
            setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
        }, (error) => console.error("All Loans listener error:", error));
        return () => unsub();
    } else {
        const myBorrowerIds = borrowers.map(b => b.id);
        if (myBorrowerIds.length > 0) {
            // Firestore 'in' query is limited to 30 items. If more, this would need batching.
            const loansQuery = query(collection(db, 'loans'), where('borrowerId', 'in', myBorrowerIds.slice(0, 30)));
            const unsub = onSnapshot(loansQuery, (snapshot) => {
                setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
            }, (error) => console.error("Filtered Loans listener error:", error));
            return () => unsub();
        } else {
            setLoans([]); // No borrowers, so no loans
        }
    }
  }, [borrowers, db, userProfile]);

  const filteredPayments = useMemo(() => {
    if (!userProfile) return [];
    if (userProfile.role === 'admin' || userProfile.role === 'ceo' || userProfile.role === 'cfo') {
        return payments;
    }
    const myLoanIds = loans.map(l => l.id);
    return payments.filter(p => myLoanIds.includes(p.loanId));
  }, [payments, loans, userProfile]);

  return { borrowers, loans, payments: filteredPayments, accounts, journalEntries, situationReports, loading };
}
