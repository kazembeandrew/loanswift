'use client';

import { useState, useEffect } from 'react';
import { useDB } from '@/lib/firebase-client-provider';
import type { User, UserProfile, Borrower, Loan, Payment, Account, JournalEntry, SituationReport } from '@/types';
import { onSnapshot, collection, query, where } from 'firebase/firestore';

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

    // User Profile Listener
    const userUnsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      const profile = { uid: doc.id, ...doc.data() } as UserProfile;
      setUserProfile(profile);
    }, (error) => {
      console.error("User Profile listener error:", error);
    });

    if (!userProfile) {
        // Wait for user profile to load before setting up other listeners
        setLoading(false);
        return () => { userUnsub(); };
    }

    const isManager = userProfile.role === 'admin' || userProfile.role === 'ceo' || userProfile.role === 'cfo';

    // 1. Borrowers Listener
    const borrowersQuery = isManager
      ? collection(db, 'borrowers')
      : query(collection(db, 'borrowers'), where('loanOfficerId', '==', userProfile.uid));

    const borrowersUnsub = onSnapshot(borrowersQuery, (snapshot) => {
      const borrowersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Borrower));
      setBorrowers(borrowersData);
      setLoading(false); // Main data loaded
    }, (error) => {
        console.error("Borrowers listener error:", error);
        setLoading(false);
    });

    // 2. Loans Listener (dependent on borrowers for loan officers)
    let loansUnsub = () => {};
    if (isManager) {
        loansUnsub = onSnapshot(collection(db, 'loans'), (snapshot) => {
            setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
        }, (error) => console.error("All Loans listener error:", error));
    } else {
        const borrowerIds = borrowers.map(b => b.id);
        if (borrowerIds.length > 0) {
            const loansQuery = query(collection(db, 'loans'), where('borrowerId', 'in', borrowerIds));
            loansUnsub = onSnapshot(loansQuery, (snapshot) => {
                setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
            }, (error) => console.error("Filtered Loans listener error:", error));
        } else {
            setLoans([]); // No borrowers, so no loans
        }
    }

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
      setPayments(paymentsData);
    }, (error) => console.error("Payments listener error:", error));
    
    // 4. Financials Listeners (only for managers)
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
      userUnsub();
      borrowersUnsub();
      loansUnsub();
      paymentsUnsub();
      accountsUnsub();
      journalUnsub();
      reportsUnsub();
    };
    
  }, [db, user, userProfile?.uid]);

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
