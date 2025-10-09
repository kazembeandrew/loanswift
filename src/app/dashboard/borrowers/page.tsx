
'use client';

import { Header } from '@/components/header';
import BorrowerList from './components/borrower-list';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRealtimeData } from '@/hooks/use-realtime-data';

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
  const { user } = useAuth();
  const { borrowers, loans, payments, loading } = useRealtimeData(user);

  return (
    <>
      <Header title="Borrowers" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {loading ? (
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
