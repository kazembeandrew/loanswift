'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  getAllSituationReports,
  updateSituationReportStatus,
} from '@/services/situation-report-service';
import { getBorrowers } from '@/services/borrower-service';
import type { SituationReport, Borrower } from '@/types';
import { Loader2, ClipboardList, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { useDB } from '@/lib/firebase-client-provider';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function SituationReportsPage() {
  const [reports, setReports] = useState<SituationReport[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userProfile } = useAuth();
  const db = useDB();
  const { toast } = useToast();

  const isManager = userProfile?.role === 'admin' || userProfile?.role === 'ceo' || userProfile?.role === 'cfo';

  const fetchData = useCallback(async () => {
    if (!isManager) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const [reportsData, borrowersData] = await Promise.all([
        getAllSituationReports(db),
        getBorrowers(db),
      ]);
      setReports(reportsData);
      setBorrowers(borrowersData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: 'Error',
        description: 'Could not load situation reports.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [db, toast, isManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getBorrowerName = (borrowerId: string) => {
    return borrowers.find((b) => b.id === borrowerId)?.name || 'Unknown Borrower';
  };

  const handleUpdateStatus = async (reportId: string, status: SituationReport['status']) => {
    if (!isManager) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to update status.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await updateSituationReportStatus(db, reportId, status);
      toast({ title: 'Status Updated', description: `Report status set to ${status}.` });
      fetchData(); // Refresh data
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const getReportStatusVariant = (
    status: SituationReport['status']
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'Open':
        return 'outline';
      case 'Under Review':
        return 'default';
      case 'Resolved':
        return 'secondary';
      case 'Closed':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Situation Reports" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
      </>
    );
  }

  if (!isManager) {
    return (
        <>
            <Header title="Situation Reports" />
            <main className="flex flex-1 items-center justify-center p-4 md:p-8">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                       <div className="flex justify-center">
                         <ShieldAlert className="h-12 w-12 text-destructive" />
                       </div>
                        <CardTitle className="mt-4">Access Denied</CardTitle>
                        <CardDescription>
                            You do not have permission to view this page. This feature is for managerial roles only.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </main>
        </>
    );
  }

  return (
    <>
      <Header title="Situation Reports" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Situation Reports</CardTitle>
            <CardDescription>A centralized log of all qualitative reports filed for all borrowers.</CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{format(new Date(report.reportDate), 'PPP')}</TableCell>
                        <TableCell>
                            <Link href={`/dashboard/borrowers/${report.borrowerId}`} className="hover:underline text-primary">
                                {getBorrowerName(report.borrowerId)}
                            </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{report.situationType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{report.summary}</TableCell>
                        <TableCell>
                          <Badge variant={getReportStatusVariant(report.status)}>{report.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/borrowers/${report.borrowerId}?tab=reports`} passHref>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-10">
                <div className="flex flex-col items-center gap-1 text-center">
                  <ClipboardList className="h-12 w-12 text-muted-foreground" />
                  <h3 className="font-headline text-2xl font-bold tracking-tight mt-4">
                    No Situation Reports Found
                  </h3>
                  <p className="text-sm text-muted-foreground">Reports filed by loan officers will appear here.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
