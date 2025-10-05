'use client';

import { useTransition } from 'react';
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
import { performMonthEndClose } from '@/app/actions/accounting';
import { Loader2, BookLock } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function AccountingPage() {
  const [isClosing, startClosingTransition] = useTransition();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const canPerformClose = userProfile?.role === 'admin' || userProfile?.role === 'cfo' || userProfile?.role === 'ceo';


  const handleMonthEndClose = () => {
    startClosingTransition(async () => {
      try {
        const result = await performMonthEndClose();
        toast({
          title: 'Month-End Close Successful',
          description: `Period closed. Profit/Loss has been moved to equity. Entry: ${result.description}`,
        });
      } catch (error) {
         console.error('Failed to perform month-end close:', error);
        toast({
          title: 'Error Closing Month',
          description: error instanceof Error ? error.message : 'Could not perform month-end close. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Accounting Procedures" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle>Periodic Procedures</CardTitle>
                <CardDescription>Perform periodic accounting procedures like closing the books.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                 <div>
                    <h3 className="font-semibold">Month-End Close</h3>
                    <p className="text-sm text-muted-foreground">Transfer net profit/loss to equity and reset income/expense accounts.</p>
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={isClosing || !canPerformClose} title={!canPerformClose ? "You don't have permission for this action." : ""}>
                            {isClosing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookLock className="mr-2 h-4 w-4" />}
                            Perform Month-End Close
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will calculate net profit/loss for the current period, transfer it to your equity account, and reset all income and expense accounts to zero. This action cannot be undone for the period being closed.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleMonthEndClose}>
                                Yes, close the books
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>

      </main>
    </div>
  );
}
