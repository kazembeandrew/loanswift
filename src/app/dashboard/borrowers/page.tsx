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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


function BorrowerListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
         <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px] sm:w-auto"><Skeleton className="h-5 w-20" /></TableHead>
                  <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-28" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-16" /></div></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
      </CardContent>
    </Card>
  )
}

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
          <BorrowerListSkeleton />
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
