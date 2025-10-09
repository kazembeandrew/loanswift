
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, CircleDollarSign, Loader2, ShieldCheck, Scale, CalendarDays, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useTransition, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import type { Borrower, Loan, Payment, RepaymentScheduleItem, SituationReport } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import ReceiptGenerator from '../components/receipt-generator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { handleRecordPayment } from '@/app/actions/payment';
import { getBorrowerAvatar } from '@/lib/placeholder-images';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { addSituationReport, updateSituationReportStatus } from '@/services/situation-report-service';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDB } from '@/lib/firebase-client-provider';
import { SituationReportSchema } from '@/lib/schemas';
import { useRealtimeData } from '@/hooks/use-realtime-data';

const situationReportFormSchema = SituationReportSchema.pick({
  situationType: true,
  summary: true,
  details: true,
  resolutionPlan: true,
  loanId: true,
});

// Type-safe payment state
interface PaymentState {
  loan: Loan | null;
  amount: string;
  date: string;
}

// Type-safe receipt state
interface ReceiptState {
  isOpen: boolean;
  borrower: Borrower | null;
  loan: Loan | null;
  paymentAmount: number;
  paymentDate: string;
  newBalance: number;
}

export default function BorrowerDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const defaultTab = searchParams.get('tab') || 'loans';
  
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const db = useDB();
  
  // Data hooks
  const { borrowers, loans, payments, situationReports, loading } = useRealtimeData(user);

  // Memoized data transformations
  const borrower = useMemo(() => borrowers.find(b => b.id === id), [borrowers, id]);
  const borrowerLoans = useMemo(() => loans.filter(loan => loan.borrowerId === id), [loans, id]);
  const borrowerSituationReports = useMemo(() => 
    situationReports.filter(report => report.borrowerId === id), 
    [situationReports, id]
  );
  
  const borrowerLoanIds = useMemo(() => new Set(borrowerLoans.map(l => l.id)), [borrowerLoans]);
  const allPaymentsForBorrower = useMemo(() => 
    payments.filter(p => borrowerLoanIds.has(p.loanId)), 
    [payments, borrowerLoanIds]
  );

  // State management
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isFileReportOpen, setFileReportOpen] = useState(false);
  const [isViewReportOpen, setViewReportOpen] = useState(false);
  const [isSubmittingPayment, startPaymentTransition] = useTransition();
  const [isSubmittingReport, startReportTransition] = useTransition();
  
  const [selectedReport, setSelectedReport] = useState<SituationReport | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>({ 
    loan: null, 
    amount: '', 
    date: new Date().toISOString().split('T')[0] 
  });
  
  const [receiptInfo, setReceiptInfo] = useState<ReceiptState>({
    isOpen: false,
    borrower: null,
    loan: null,
    paymentAmount: 0,
    paymentDate: '',
    newBalance: 0
  });

  // Auth checks
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'ceo' || userProfile?.role === 'cfo';
  const isAuthenticated = !!user && !!userProfile;

  // Form handling
  const reportForm = useForm<z.infer<typeof situationReportFormSchema>>({
    resolver: zodResolver(situationReportFormSchema),
    defaultValues: {
      summary: "",
      details: "",
      resolutionPlan: "",
    },
  });

  // Utility functions
  const getLoanBalance = useCallback((loan: Loan): number => {
    if (!loan) return 0;
    
    const totalPaid = allPaymentsForBorrower
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    return Math.max(0, totalOwed - totalPaid);
  }, [allPaymentsForBorrower]);

  const getLoanStatus = useCallback((loan: Loan): 'approved' | 'active' | 'closed' => {
    const balance = getLoanBalance(loan);
    if (balance <= 0.01) return 'closed';

    const paymentsForLoan = allPaymentsForBorrower.filter(p => p.loanId === loan.id);
    if (paymentsForLoan.length > 0) return 'active';

    return 'approved';
  }, [getLoanBalance, allPaymentsForBorrower]);

  // Event handlers
  const handleRecordPaymentClick = useCallback((loan: Loan) => {
    if (!loan) {
      toast({
        title: 'Error',
        description: 'Invalid loan selected',
        variant: 'destructive',
      });
      return;
    }

    setPaymentState({ 
      loan, 
      amount: '', 
      date: new Date().toISOString().split('T')[0] 
    });
    setRecordPaymentOpen(true);
  }, [toast]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to record payments',
        variant: 'destructive',
      });
      return;
    }

    if (!paymentState.amount || !paymentState.loan || !borrower) {
      toast({
        title: 'Missing Information',
        description: 'Please select a loan and enter payment amount',
        variant: 'destructive',
      });
      return;
    }

    const paymentAmount = parseFloat(paymentState.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    startPaymentTransition(async () => {
      try {
        const paymentDate = paymentState.date || new Date().toISOString().split('T')[0];
        const result = await handleRecordPayment({
          loanId: paymentState.loan!.id, // We validated above
          amount: paymentAmount,
          date: paymentDate,
          recordedByEmail: userProfile!.email, // We validated authentication
        });

        if (result.success) {
          setReceiptInfo({
            isOpen: true,
            borrower: borrower,
            loan: paymentState.loan,
            paymentAmount: paymentAmount,
            paymentDate: paymentDate,
            newBalance: result.newBalance,
          });
          
          toast({
            title: 'Payment Recorded',
            description: `Payment of MWK ${paymentAmount.toLocaleString()} recorded successfully.`,
          });
          
          setRecordPaymentOpen(false);
          setPaymentState({ loan: null, amount: '', date: '' });
        } else {
          throw new Error(result.message || 'Payment failed');
        }
      } catch (error: any) {
        toast({
          title: 'Payment Failed',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    });
  };

  const handleFileReportSubmit = async (values: z.infer<typeof situationReportFormSchema>) => {
    if (!isAuthenticated || !borrower) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to file reports',
        variant: 'destructive',
      });
      return;
    }

    startReportTransition(async () => {
      try {
        await addSituationReport(db, {
          ...values,
          borrowerId: borrower.id,
          reportedBy: user!.uid,
        });
        
        toast({
          title: "Report Filed",
          description: "The situation report has been successfully filed.",
        });
        
        setFileReportOpen(false);
        reportForm.reset();
      } catch (error: any) {
        toast({
          title: "Failed to File Report",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  const handleViewReport = useCallback((report: SituationReport) => {
    setSelectedReport(report);
    setViewReportOpen(true);
  }, []);

  const handleUpdateReportStatus = async (reportId: string, status: SituationReport['status']) => {
    if (!isAdmin) {
      toast({ 
        title: 'Permission Denied', 
        description: "You don't have permission to update report status.", 
        variant: 'destructive' 
      });
      return;
    }
    
    try {
      await updateSituationReportStatus(db, reportId, status);
      toast({ 
        title: 'Status Updated', 
        description: `Report status changed to ${status}.` 
      });
      
      // Update local state
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, status } : null);
      }
    } catch (error: any) {
      toast({ 
        title: 'Update Failed', 
        description: error.message || "Could not update status.", 
        variant: 'destructive' 
      });
    }
  };

  // UI helper functions
  const getLoanStatusVariant = (status: 'approved' | 'active' | 'closed') => {
    switch (status) {
      case 'active': return 'default';
      case 'closed': return 'secondary';
      case 'approved': return 'outline';
      default: return 'default';
    }
  };

  const getReportStatusVariant = (status: SituationReport['status']) => {
    switch(status) {
      case 'Open': return 'outline';
      case 'Under Review': return 'default';
      case 'Resolved': return 'secondary';
      case 'Closed': return 'secondary';
      default: return 'default';
    }
  };

  const getRepaymentScheduleWithStatus = useCallback((loan: Loan) => {
    if (!loan?.repaymentSchedule) return [];
      
    const totalPaid = allPaymentsForBorrower
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);

    let cumulativeDue = 0;

    return loan.repaymentSchedule.map(item => {
      cumulativeDue += item.amountDue;
      
      let status: 'paid' | 'pending' | 'overdue';
      if (totalPaid >= cumulativeDue - 0.01) {
        status = 'paid';
      } else if (new Date() > new Date(item.dueDate) && totalPaid < cumulativeDue) {
        status = 'overdue';
      } else {
        status = 'pending';
      }

      return { ...item, status };
    });
  }, [allPaymentsForBorrower]);

  const getScheduleStatusVariant = (status: 'paid' | 'pending' | 'overdue') => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'outline';
      case 'overdue': return 'destructive';
      default: return 'default';
    }
  };

  // Loading and error states
  if (loading) {
    return (
      <>
        <Header title="Loading Borrower..." />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
      </>
    );
  }

  if (!borrower) {
    return (
      <>
        <Header title="Borrower Not Found" />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">The requested borrower could not be found.</p>
              <Button asChild>
                <a href="/dashboard/borrowers">Back to Borrowers</a>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  // Computed values
  const avatarFallback = borrower.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const totalAmountLoaned = borrowerLoans.reduce((sum, loan) => sum + loan.principal, 0);
  const totalAmountRepaid = allPaymentsForBorrower.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <Header title="Borrower Dashboard" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Header Section */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={getBorrowerAvatar(borrower.id)} alt={borrower.name} />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-headline text-3xl font-semibold">{borrower.name}</h1>
            <p className="text-muted-foreground">{borrower.idNumber}</p>
          </div>
          <Button 
            variant="outline" 
            className="ml-auto" 
            onClick={() => setFileReportOpen(true)}
            disabled={!isAuthenticated}
          >
            <Flag className="mr-2 h-4 w-4" />
            File Situation Report
          </Button>
        </div>

        {/* Info Cards */}
        <div className="grid gap-6 mt-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Phone:</strong> {borrower.phone}</p>
              <p><strong>Address:</strong> {borrower.address}</p>
              <p><strong>Guarantor:</strong> {borrower.guarantorName} ({borrower.guarantorPhone})</p>
              <p><strong>Joined:</strong> {new Date(borrower.joinDate).toLocaleDateString()}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <Scale className="h-5 w-5"/> Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Loaned</p>
                <p className="text-2xl font-bold">MWK {totalAmountLoaned.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Repaid</p>
                <p className="text-2xl font-bold text-green-600">MWK {totalAmountRepaid.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList>
            <TabsTrigger value="loans">Loan History ({borrowerLoans.length})</TabsTrigger>
            <TabsTrigger value="reports">Situation Reports ({borrowerSituationReports.length})</TabsTrigger>
          </TabsList>
          
          {/* Loans Tab */}
          <TabsContent value="loans">
            <Card>
              <CardHeader>
                <CardTitle>Loan History</CardTitle>
                <CardDescription>
                  {borrowerLoans.length > 0 
                    ? "Select a loan to view details and repayment schedule" 
                    : "No loans found for this borrower"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {borrowerLoans.length > 0 ? (
                  <Tabs defaultValue={borrowerLoans[0]?.id}>
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {borrowerLoans.map(loan => (
                        <TabsTrigger key={loan.id} value={loan.id}>
                          {loan.id}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {borrowerLoans.map(loan => {
                      const balance = getLoanBalance(loan);
                      const status = getLoanStatus(loan);
                      const schedule = getRepaymentScheduleWithStatus(loan);
                      
                      return (
                        <TabsContent key={loan.id} value={loan.id} className="mt-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <div className="flex-1">
                                  <p className="font-semibold text-lg">{loan.id}</p>
                                  <p className="text-sm">Principal: MWK {loan.principal.toLocaleString()}</p>
                                  <p className={`text-sm font-medium ${
                                    balance <= 0 ? 'text-green-600' : 'text-destructive'
                                  }`}>
                                    Balance: MWK {balance.toLocaleString(undefined, {
                                      minimumFractionDigits: 2, 
                                      maximumFractionDigits: 2
                                    })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <Badge variant={getLoanStatusVariant(status)} className="justify-center">
                                    {status}
                                  </Badge>
                                  {status !== 'closed' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleRecordPaymentClick(loan)}
                                      className="w-full sm:w-auto"
                                    >
                                      <CircleDollarSign className="mr-2 h-4 w-4" />
                                      Record Payment
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              {schedule.length > 0 && (
                                <div>
                                  <h4 className="font-semibold flex items-center gap-2 mb-4">
                                    <CalendarDays className="h-4 w-4" />
                                    Repayment Schedule
                                  </h4>
                                  <div className="rounded-md border">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Due Date</TableHead>
                                          <TableHead>Amount Due</TableHead>
                                          <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {schedule.map((item, index) => (
                                          <TableRow key={index}>
                                            <TableCell>
                                              {format(new Date(item.dueDate), 'PPP')}
                                            </TableCell>
                                            <TableCell>
                                              MWK {item.amountDue.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <Badge variant={getScheduleStatusVariant(item.status)}>
                                                {item.status}
                                              </Badge>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Situation Reports</CardTitle>
                <CardDescription>
                  Qualitative reports filed for this borrower
                </CardDescription>
              </CardHeader>
              <CardContent>
                {borrowerSituationReports.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Summary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {borrowerSituationReports.map(report => (
                        <TableRow key={report.id}>
                          <TableCell>
                            {format(new Date(report.reportDate), 'PPP')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{report.situationType}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {report.summary}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getReportStatusVariant(report.status)}>
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewReport(report)}
                            >
                              View Report
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">
                      No situation reports filed for this borrower.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Location Card */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="font-headline">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-64 w-full rounded-lg overflow-hidden border">
              <iframe 
                src={`https://www.openstreetmap.org/export/embed.html?bbox=33.7823%2C-13.9626%2C33.7923%2C-13.9526&layer=mapnik&marker=-13.9576,33.7873`} 
                style={{ border: 0, width: '100%', height: '100%' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Borrower Location"
              />
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Payment Dialog */}
      <Dialog open={isRecordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            {paymentState.loan && (
              <DialogDescription>
                For loan {paymentState.loan.id} of {borrower.name}.
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01"
                  className="col-span-3" 
                  value={paymentState.amount} 
                  onChange={(e) => setPaymentState(d => ({...d, amount: e.target.value}))}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <Input 
                  id="date" 
                  type="date" 
                  className="col-span-3" 
                  value={paymentState.date} 
                  onChange={(e) => setPaymentState(d => ({...d, date: e.target.value}))}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmittingPayment}>
                {isSubmittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receipt Generator */}
      {receiptInfo.isOpen && receiptInfo.borrower && receiptInfo.loan && (
        <ReceiptGenerator 
          isOpen={receiptInfo.isOpen}
          setIsOpen={(isOpen) => setReceiptInfo(prev => ({ ...prev, isOpen }))}
          borrower={receiptInfo.borrower}
          loan={receiptInfo.loan}
          paymentAmount={receiptInfo.paymentAmount}
          paymentDate={receiptInfo.paymentDate}
          newBalance={receiptInfo.newBalance}
        />
      )}

      {/* File Report Dialog */}
      <Dialog open={isFileReportOpen} onOpenChange={setFileReportOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>File Situation Report</DialogTitle>
            <DialogDescription>
              Document a specific situation regarding {borrower.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={reportForm.handleSubmit(handleFileReportSubmit)}>
            <div className="grid gap-4 py-4">
              <Controller
                name="situationType"
                control={reportForm.control}
                render={({ field }) => (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Situation Type</Label>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Client Dispute">Client Dispute</SelectItem>
                        <SelectItem value="Business Disruption">Business Disruption</SelectItem>
                        <SelectItem value="Collateral Issue">Collateral Issue</SelectItem>
                        <SelectItem value="Personal Emergency">Personal Emergency</SelectItem>
                        <SelectItem value="Fraud Concern">Fraud Concern</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
              
              <Controller
                name="loanId"
                control={reportForm.control}
                render={({ field }) => (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Related Loan</Label>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a related loan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {borrowerLoans.map(loan => (
                          <SelectItem key={loan.id} value={loan.id}>
                            {loan.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
              
              <Controller
                name="summary"
                control={reportForm.control}
                render={({ field }) => (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="summary" className="text-right">Summary</Label>
                    <Input id="summary" className="col-span-3" {...field} />
                  </div>
                )}
              />
              
              <Controller
                name="details"
                control={reportForm.control}
                render={({ field }) => (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="details" className="text-right pt-2">Details</Label>
                    <Textarea id="details" className="col-span-3" {...field} />
                  </div>
                )}
              />
              
              <Controller
                name="resolutionPlan"
                control={reportForm.control}
                render={({ field }) => (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="resolutionPlan" className="text-right pt-2">Resolution Plan</Label>
                    <Textarea id="resolutionPlan" className="col-span-3" {...field} />
                  </div>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmittingReport}>
                {isSubmittingReport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                File Report
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={isViewReportOpen} onOpenChange={setViewReportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Situation Report Details</DialogTitle>
            {selectedReport && (
              <DialogDescription>
                Report filed on {format(new Date(selectedReport.reportDate), 'PPP')}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-lg">{selectedReport.summary}</span>
                  <p className="text-sm text-muted-foreground">
                    Type: <Badge variant="secondary">{selectedReport.situationType}</Badge>
                  </p>
                </div>
                <Badge 
                  variant={getReportStatusVariant(selectedReport.status)} 
                  className="text-base px-3 py-1"
                >
                  {selectedReport.status}
                </Badge>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Details</h4>
                <p className="text-muted-foreground bg-muted p-3 rounded-md">
                  {selectedReport.details}
                </p>
              </div>

              {selectedReport.resolutionPlan && (
                <div>
                  <h4 className="font-semibold mb-2">Proposed Resolution</h4>
                  <p className="text-muted-foreground bg-muted p-3 rounded-md">
                    {selectedReport.resolutionPlan}
                  </p>
                </div>
              )}

              {isAdmin && selectedReport.status !== 'Closed' && (
                <div className="space-y-2 border-t pt-4">
                  <Label>Update Status</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleUpdateReportStatus(selectedReport.id, 'Under Review')}
                      disabled={selectedReport.status === 'Under Review'}
                    >
                      Under Review
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleUpdateReportStatus(selectedReport.id, 'Resolved')}
                      disabled={selectedReport.status === 'Resolved'}
                    >
                      Mark as Resolved
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => handleUpdateReportStatus(selectedReport.id, 'Closed')}
                    >
                      Close Report
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
