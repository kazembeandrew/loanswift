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
import {
  initiateMonthEndClose,
  approveMonthEndClose,
  processApprovedMonthEndClose,
  getMonthEndClosure,
} from '@/app/actions/accounting';
import { Loader2, BookLock, CheckCircle, Hourglass, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { MonthEndClosure } from '@/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useDB } from '@/lib/firebase-provider';

export default function AccountingPage() {
  const [isProcessing, startTransition] = useTransition();
  const [closure, setClosure] = useState<MonthEndClosure | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const db = useDB();

  const isCfo = userProfile?.role === 'cfo';
  const isCeo = userProfile?.role === 'ceo';
  const periodId = format(new Date(), 'yyyy-MM');

  const fetchClosureStatus = useCallback(async () => {
    setIsLoading(true);
    const closureData = await getMonthEndClosure(periodId);
    setClosure(closureData);
    setIsLoading(false);
  }, [periodId]);

  useEffect(() => {
    if (userProfile) {
        fetchClosureStatus();
    }
  }, [userProfile, fetchClosureStatus]);

  const handleInitiate = () => {
    startTransition(async () => {
      if (!user) return;
      try {
        const result = await initiateMonthEndClose(user.uid);
        setClosure(result);
        toast({
          title: 'Month-End Close Initiated',
          description: `The closing process for ${periodId} has been initiated and is awaiting CEO approval.`,
        });
      } catch (error) {
        handleError(error, 'Failed to initiate month-end close');
      }
    });
  };
  
  const handleApprove = () => {
     startTransition(async () => {
      if (!user) return;
      try {
        const result = await approveMonthEndClose(periodId, user.uid);
        setClosure(result);
        toast({
          title: 'Month-End Close Approved',
          description: `The closing process for ${periodId} has been approved and is ready for final processing by the CFO.`,
        });
      } catch (error) {
        handleError(error, 'Failed to approve month-end close');
      }
    });
  };
  
  const handleProcess = () => {
     startTransition(async () => {
      if (!user) return;
      try {
        const result = await processApprovedMonthEndClose(periodId, user.uid);
        await fetchClosureStatus(); // Refetch to get the 'processed' state
        toast({
          title: 'Month-End Close Successful',
          description: `Period ${periodId} closed. Profit/Loss has been moved to equity. Entry: ${result.description}`,
        });
      } catch (error) {
        handleError(error, 'Failed to process month-end close');
      }
    });
  };

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

    // CFO View
    if (isCfo) {
        if (!closure) {
            return <Button onClick={handleInitiate} disabled={isProcessing}> <BookLock className="mr-2 h-4 w-4" /> Initiate Month-End Close</Button>;
        }
        if (closure.status === 'pending_approval') {
            return <p className="text-sm text-muted-foreground">Waiting for CEO approval...</p>;
        }
        if (closure.status === 'approved') {
            return (
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button onClick={handleProcess} disabled={isProcessing}><CheckCircle className="mr-2 h-4 w-4"/>Process Approved Close</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will finalize the month-end close, post the journal entry, and reset income/expense accounts. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleProcess}>Yes, process close</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        }
    }

    // CEO View
    if (isCeo) {
        if (closure?.status === 'pending_approval') {
            return (
                 <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="outline" onClick={handleApprove} disabled={isProcessing}><ShieldCheck className="mr-2 h-4 w-4"/>Approve Month-End Close</Button></AlertDialogTrigger>
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

  if (!isCfo && !isCeo && userProfile?.role !== 'admin') {
     return (
        <>
            <Header title="Accounting Procedures" />
            <main className="flex-1 flex items-center justify-center">
                <Card><CardHeader><CardTitle>Access Denied</CardTitle><CardDescription>You do not have permission to view this page.</CardDescription></CardHeader></Card>
            </main>
        </>
    );
  }

  return (
    <>
      <Header title="Accounting Procedures" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
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
      </main>
    </>
  );
}
