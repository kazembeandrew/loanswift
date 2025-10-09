
'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Header } from '@/components/header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookLock, CheckCircle, Hourglass, ShieldCheck, User, Calendar, ExternalLink, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { MonthEndClosure } from '@/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function AccountingPage() {
  const [isProcessing, startTransition] = useTransition();
  const [closure, setClosure] = useState<MonthEndClosure | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  const isCfoOrAdmin = userProfile?.role === 'cfo' || userProfile?.role === 'admin';
  const isCeoOrAdmin = userProfile?.role === 'ceo' || userProfile?.role === 'admin';
  const canViewPage = isCfoOrAdmin || isCeoOrAdmin;

  const periodId = format(new Date(), 'yyyy-MM');

  const fetchClosureStatus = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/accounting/month-end?periodId=${periodId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch status.');
      }
      const data = await response.json();
      setClosure(data.data);
    } catch (error) {
      // toast is handled in handleError
    } finally {
      setIsLoading(false);
    }
  }, [periodId, user]);

  useEffect(() => {
    if (userProfile && canViewPage) {
        fetchClosureStatus();
    } else {
        setIsLoading(false);
    }
  }, [userProfile, canViewPage, fetchClosureStatus]);

  const performAction = (action: 'initiate' | 'approve' | 'process') => {
    startTransition(async () => {
        if (!user) return;
        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/accounting/month-end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ action, periodId }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `Failed to ${action}.`);
            }
            setClosure(result.data);
            toast({
                title: result.title,
                description: result.description,
            });
            if (action === 'process') {
              await fetchClosureStatus();
            }
        } catch (error) {
            handleError(error, `Failed to ${action} month-end close`);
        }
    });
  }

  const handleInitiate = () => performAction('initiate');
  const handleApprove = () => performAction('approve');
  const handleProcess = () => performAction('process');

  const handleError = (error: unknown, title: string) => {
    console.error(`${title}:`, error);
    toast({
      title,
      description: error instanceof Error ? error.message : `An unknown error occurred.`,
      variant: 'destructive',
    });
  };

  const renderStatusBadge = () => {
    if (!closure) return <Badge variant="secondary">Not Initiated</Badge>;
    switch (closure.status) {
      case 'pending_approval':
        return <Badge variant="outline"><Hourglass className="mr-1 h-3 w-3"/>Pending CEO Approval</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3"/>Approved</Badge>;
      case 'processed':
        return <Badge className="bg-green-600 hover:bg-green-700"><ShieldCheck className="mr-1 h-3 w-3"/>Processed</Badge>;
      default:
        return <Badge variant="secondary">{closure.status}</Badge>;
    }
  };

  const renderActionButtons = () => {
    if (!userProfile) return null;

    if (closure?.status === 'processed') {
      return <p className="text-sm text-green-600 font-medium flex items-center"><ShieldCheck className="mr-2 h-4 w-4"/>This period has been closed.</p>;
    }

    // CFO or Admin View
    if (isCfoOrAdmin) {
        if (!closure) {
            return <Button onClick={handleInitiate} disabled={isProcessing}> <BookLock className="mr-2 h-4 w-4" /> Initiate Month-End Close</Button>;
        }
        if (closure.status === 'pending_approval') {
            return <p className="text-sm text-muted-foreground">Waiting for CEO approval...</p>;
        }
        if (closure.status === 'approved') {
            return (
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button disabled={isProcessing}><CheckCircle className="mr-2 h-4 w-4"/>Process Approved Close</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will finalize the month-end close, post the journal entry, and reset income/expense accounts. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleProcess}>Yes, process close</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        }
    }

    // CEO or Admin View
    if (isCeoOrAdmin) {
        if (closure?.status === 'pending_approval') {
            return (
                 <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="outline" disabled={isProcessing}><ShieldCheck className="mr-2 h-4 w-4"/>Approve Month-End Close</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                         <AlertDialogHeader><AlertDialogTitle>Approve Month-End Close?</AlertDialogTitle><AlertDialogDescription>You are about to approve the month-end closing for period {periodId}. This will allow the CFO to finalize the process.</AlertDialogDescription></AlertDialogHeader>
                         <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleApprove}>Yes, Approve</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        }
    }
    
    // Default view for other roles or other states
    return <p className="text-sm text-muted-foreground">Month-end procedure is in progress.</p>;
  };
  
  const renderClosureDetails = () => {
    if (!closure) return null;

    return (
        <Card>
            <CardHeader><CardTitle>Closure Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                    <Hourglass className="h-4 w-4 text-muted-foreground" />
                    <p>Initiated by <span className="font-semibold">{closure.initiatedByEmail || '...'}</span> on <span className="font-semibold">{format(parseISO(closure.initiatedAt), 'PPP')}</span></p>
                </div>

                {closure.status === 'approved' || closure.status === 'processed' ? (
                     <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <p>Approved by <span className="font-semibold">{closure.approvedByEmail || '...'}</span> on <span className="font-semibold">{closure.approvedAt ? format(parseISO(closure.approvedAt), 'PPP') : 'N/A'}</span></p>
                    </div>
                ) : <p className="text-muted-foreground ml-7">Pending CEO approval...</p>}

                {closure.status === 'processed' ? (
                     <div className="flex items-center gap-3">
                        <ShieldCheck className="h-4 w-4 text-blue-500" />
                        <p>Processed by <span className="font-semibold">{closure.processedByEmail || '...'}</span> on <span className="font-semibold">{closure.processedAt ? format(parseISO(closure.processedAt), 'PPP') : 'N/A'}</span></p>
                    </div>
                ) : <p className="text-muted-foreground ml-7">Pending final processing by CFO...</p>}

                {closure.closingJournalEntryId && (
                     <div className="flex items-center gap-3 pt-2">
                         <Link href="/dashboard/journal" className="text-primary hover:underline flex items-center gap-2">
                            <ExternalLink className="h-4 w-4" /> View Closing Journal Entry
                         </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
  }

  if (isLoading) {
    return (
        <>
            <Header title="Accounting Procedures" />
            <main className="flex-1 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </main>
        </>
    );
  }

  if (!canViewPage) {
     return (
        <>
            <Header title="Accounting Procedures" />
            <main className="flex-1 flex items-center justify-center p-4">
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
      <Header title="Accounting Procedures" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle>Month-End Close for {periodId}</CardTitle>
                <CardDescription>
                A two-step process for closing the books, requiring CFO initiation and CEO approval.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <h3 className="font-semibold">Current Status</h3>
                        {renderStatusBadge()}
                    </div>
                    <div className="flex items-center">
                        {isProcessing ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : renderActionButtons()}
                    </div>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Workflow:</strong></p>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>The CFO initiates the month-end close for the current period.</li>
                        <li>The CEO receives a notification and must approve the closure request on this page.</li>
                        <li>Once approved, the CFO can finalize and process the closure, which posts the accounting entries.</li>
                    </ol>
                </div>
            </CardContent>
            </Card>

            {renderClosureDetails()}
        </div>
      </main>
    </>
  );
}
