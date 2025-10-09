'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, CircleDollarSign, Loader2, ShieldCheck, Scale, CalendarDays, Flag } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useTransition } from 'react';
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
import { getBorrowerById } from '@/services/borrower-service';
import { handleRecordPayment } from '@/app/actions/payment';
import { getBorrowerAvatar } from '@/lib/placeholder-images';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getSituationReportsByBorrower, addSituationReport, updateSituationReportStatus } from '@/services/situation-report-service';
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


export default function BorrowerDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const defaultTab = searchParams.get('tab') || 'loans';
  const { user, userProfile } = useAuth();
  const { loans, payments, loading: isRealtimeDataLoading } = useRealtimeData(user);

  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [situationReports, setSituationReports] = useState<SituationReport[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [receiptInfo, setReceiptInfo] = useState<{
      isOpen: boolean;
      borrower: Borrower | null;
      loan: Loan | null;
      paymentAmount: number;
      paymentDate: string;
      balance: number;
  }>({ isOpen: false, borrower: null, loan: null, paymentAmount: 0, paymentDate: '', balance: 0 });

  const [isFileReportOpen, setFileReportOpen] = useState(false);
  const [isViewReportOpen, setViewReportOpen] = useState(false);
  const [isSubmittingPayment, startPaymentTransition] = useTransition();

  const [selectedReport, setSelectedReport] = useState<SituationReport | null>(null);
  const [paymentState, setPaymentState] = useState<{
    loan: Loan | null,
    amount: string,
    date: string,
  }>({ loan: null, amount: '', date: '' });
  
  const { toast } = useToast();
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'ceo' || userProfile?.role === 'cfo';
  const db = useDB();

  const borrowerLoans = loans.filter(loan => loan.borrowerId === id);
  const allPayments = payments.filter(payment => borrowerLoans.some(loan => loan.id === payment.loanId));


  const reportForm = useForm<z.infer<typeof situationReportFormSchema>>({
    resolver: zodResolver(situationReportFormSchema),
    defaultValues: {
      summary: "",
      details: "",
      resolutionPlan: "",
    },
  });

  const fetchData = useCallback(async () => {
    if (!id || !user) return;
    setIsDataLoading(true);
    
    try {
        const [borrowerData, reportsData] = await Promise.all([
            getBorrowerById(db, id),
            getSituationReportsByBorrower(db, id),
        ]);
        setBorrower(borrowerData);
        setSituationReports(reportsData);
    } catch (error) {
        toast({ title: "Error", description: "Failed to fetch borrower details.", variant: 'destructive'});
    } finally {
        setIsDataLoading(false);
    }

  }, [id, db, user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  if (isDataLoading || isRealtimeDataLoading) {
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
            <p>The requested borrower could not be found.</p>
        </main>
      </>
    )
  }

  const getLoanBalance = (loan: Loan) => {
    const totalPaid = allPayments
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    return totalOwed - totalPaid;
  };
  
  const handleRecordPaymentClick = (loan: Loan) => {
    setPaymentState({ loan, amount: '', date: new Date().toISOString().split('T')[0] });
    setRecordPaymentOpen(true);
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentState.loan || !paymentState.amount || !userProfile || !borrower) return;

    startPaymentTransition(async () => {
        const paymentAmount = parseFloat(paymentState.amount);
        const paymentDate = paymentState.date || new Date().toISOString().split('T')[0];
        const result = await handleRecordPayment({
            loanId: paymentState.loan.id,
            amount: paymentAmount,
            date: paymentDate,
            recordedByEmail: userProfile.email,
        });

        if (result.success) {
            setReceiptInfo({
                isOpen: true,
                borrower: borrower,
                loan: paymentState.loan,
                paymentAmount: paymentAmount,
                paymentDate: paymentDate,
                balance: result.newBalance,
            });
            toast({
                title: 'Payment Recorded',
                description: `Payment of MWK ${paymentAmount.toLocaleString()} for loan ${paymentState.loan.id} has been recorded.`,
            });
            setRecordPaymentOpen(false);
        } else {
            toast({
                title: 'Payment Failed',
                description: result.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
    });
  };

  const handleFileReportSubmit = async (values: z.infer<typeof situationReportFormSchema>) => {
    if (!user || !borrower) return;
    try {
      await addSituationReport(db, {
        ...values,
        borrowerId: borrower.id,
        reportedBy: user.uid,
      });
      toast({
        title: "Report Filed",
        description: "The situation report has been successfully filed.",
      });
      setFileReportOpen(false);
      reportForm.reset();
      await fetchData(); // Re-fetch reports
    } catch (error: any) {
      toast({
        title: "Failed to File Report",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleViewReport = (report: SituationReport) => {
    setSelectedReport(report);
    setViewReportOpen(true);
  };

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
      toast({ title: 'Status Updated', description: `Report status changed to ${status}.` });
      await fetchData(); // Re-fetch reports
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, status } : null);
      }
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message || "Could not update status.", variant: 'destructive' });
    }
  }


  const getLoanStatus = (loan: Loan): 'approved' | 'active' | 'closed' => {
      const balance = getLoanBalance(loan);
      if (balance <= 0.01) return 'closed';

      const paymentsForLoan = allPayments.filter(p => p.loanId === loan.id);
      if (paymentsForLoan.length > 0) return 'active';

      return 'approved';
  }
  
  const getRepaymentScheduleWithStatus = (loan: Loan): (RepaymentScheduleItem & { status: 'paid' | 'pending' | 'overdue' })[] => {
    if (!loan.repaymentSchedule) return [];
      
    const paymentsForLoan = allPayments.filter(p => p.loanId === loan.id);
    const totalPaid = paymentsForLoan.reduce((sum, p) => sum + p.amount, 0);

    let cumulativeDue = 0;

    return loan.repaymentSchedule.map(item => {
        cumulativeDue += item.amountDue;
        
        let status: 'paid' | 'pending' | 'overdue';

        if (totalPaid >= cumulativeDue - 0.01) { // Tolerance for float issues
            status = 'paid';
        } else if (new Date() > new Date(item.dueDate) && totalPaid < cumulativeDue) {
            status = 'overdue';
        } else {
            status = 'pending';
        }

        return { ...item, status };
    });
  }

  const getLoanStatusVariant = (
    status: 'approved' | 'active' | 'closed'
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active':
        return 'default';
      case 'closed':
        return 'secondary';
      case 'approved':
        return 'outline';
      default:
          return 'default';
    }
  };
  
  const getScheduleStatusVariant = (
    status: 'paid' | 'pending' | 'overdue'
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
     switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'outline';
      case 'overdue':
        return 'destructive';
      default:
        return 'default';
    }
  }

  const getReportStatusVariant = (
    status: SituationReport['status']
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch(status) {
      case 'Open': return 'outline';
      case 'Under Review': return 'default';
      case 'Resolved': return 'secondary';
      case 'Closed': return 'secondary';
      default: return 'default';
    }
  }

  const avatarFallback = borrower.name.split(' ').map(n => n[0]).join('');

  const totalAmountLoaned = borrowerLoans.reduce((sum, loan) => sum + loan.principal, 0);
  const totalAmountRepaid = allPayments
    .filter(p => borrowerLoans.some(l => l.id === p.loanId))
    .reduce((sum, p) => sum + p.amount, 0);


  return (
    <>
      <Header title="Borrower Dashboard" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={getBorrowerAvatar(borrower.id)} alt="Avatar" data-ai-hint="user avatar" />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-headline text-3xl font-semibold">{borrower.name}</h1>
            <p className="text-muted-foreground">{borrower.idNumber}</p>
          </div>
           <Button variant="outline" className="ml-auto" onClick={() => setFileReportOpen(true)}>
            <Flag className="mr-2 h-4 w-4" />
            File Situation Report
          </Button>
        </div>

        <div className="grid gap-6 mt-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="md:col-span-1">
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
           <Card className="md:col-span-1">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 font-headline"><Scale className="h-5 w-5"/> Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-muted-foreground">Total Loaned to Borrower</p>
                    <p className="text-2xl font-bold">MWK {totalAmountLoaned.toLocaleString()}</p>
                </div>
                 <div>
                    <p className="text-sm text-muted-foreground">Total Repaid by Borrower</p>
                    <p className="text-2xl font-bold text-green-600">MWK {totalAmountRepaid.toLocaleString()}</p>
                </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList>
            <TabsTrigger value="loans">Loan History</TabsTrigger>
            <TabsTrigger value="reports">Situation Reports ({situationReports.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="loans">
            <Card>
              <CardHeader>
                <CardTitle>Loan History</CardTitle>
                <CardDescription>Select a loan to view its details and repayment schedule.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {borrowerLoans.length > 0 ? (
                  <Tabs defaultValue={borrowerLoans[0]?.id} className="w-full">
                      <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {borrowerLoans.map(loan => (
                              <TabsTrigger key={loan.id} value={loan.id}>{loan.id}</TabsTrigger>
                          ))}
                      </TabsList>
                      {borrowerLoans.map(loan => {
                          const balance = getLoanBalance(loan);
                          const status = getLoanStatus(loan);
                          const schedule = getRepaymentScheduleWithStatus(loan);
                          
                          return (
                              <TabsContent key={loan.id} value={loan.id}>
                                  <div className="mt-4 p-4 border rounded-lg">
                                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex-1">
                                          <p className="font-semibold">{loan.id}</p>
                                          <p className="text-sm">Principal: MWK {loan.principal.toLocaleString()}</p>
                                          <p className={`text-sm font-medium ${balance <= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                            Balance: MWK {balance.toLocaleString()}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                          <Badge variant={getLoanStatusVariant(status)} className="w-full sm:w-auto justify-center">{status}</Badge>
                                          {status !== 'closed' && (
                                            <Button variant="outline" size="sm" onClick={() => handleRecordPaymentClick(loan)} className="w-full sm:w-auto">
                                              <CircleDollarSign className="mr-2 h-4 w-4" />
                                              Record Payment
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="mt-6">
                                          <h4 className="font-semibold flex items-center gap-2 mb-2"><CalendarDays className="h-4 w-4" />Repayment Schedule</h4>
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
                                                          <TableCell>{format(new Date(item.dueDate), 'PPP')}</TableCell>
                                                          <TableCell>MWK {item.amountDue.toLocaleString()}</TableCell>
                                                          <TableCell className="text-right">
                                                              <Badge variant={getScheduleStatusVariant(item.status)}>{item.status}</Badge>
                                                          </TableCell>
                                                      </TableRow>
                                                  ))}
                                              </TableBody>
                                          </Table>
                                          </div>
                                      </div>

                                  </div>
                              </TabsContent>
                          )
                      })}
                  </Tabs>
                ) : (
                  <p className="text-muted-foreground text-center py-10">No loans found for this borrower.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reports">
             <Card>
                <CardHeader>
                  <CardTitle>Situation Reports</CardTitle>
                  <CardDescription>A log of all qualitative reports filed for this borrower.</CardDescription>
                </CardHeader>
                <CardContent>
                  {situationReports.length > 0 ? (
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
                        {situationReports.map(report => (
                          <TableRow key={report.id}>
                            <TableCell>{format(new Date(report.reportDate), 'PPP')}</TableCell>
                            <TableCell><Badge variant="secondary">{report.situationType}</Badge></TableCell>
                            <TableCell>{report.summary}</TableCell>
                            <TableCell><Badge variant={getReportStatusVariant(report.status)}>{report.status}</Badge></TableCell>
                             <TableCell className="text-right">
                               <Button variant="outline" size="sm" onClick={() => handleViewReport(report)}>
                                 View Report
                               </Button>
                             </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-10">No situation reports filed for this borrower.</p>
                  )}
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
        
        <Card>
            <CardHeader className="flex flex-row items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="font-headline">Location</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="relative h-64 w-full rounded-lg overflow-hidden border">
                <iframe 
                src={`https://www.openstreetmap.org/export/embed.html?bbox=33.7823%2C-13.9626%2C33.7923%2C-13.9526&layer=mapnik&marker=-13.9576,33.7873`} 
                style={{border: 0, width: '100%', height: '100%'}}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
            </div>
        </CardContent>
        </Card>
        
      </main>
      
      <Dialog open={isRecordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            {paymentState.loan && <DialogDescription>
              For loan {paymentState.loan.id} of {borrower?.name}.
            </DialogDescription>}
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <Input id="amount" type="number" className="col-span-3" value={paymentState.amount} onChange={(e) => setPaymentState(d => ({...d, amount: e.target.value}))}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <Input id="date" type="date" className="col-span-3" value={paymentState.date} onChange={(e) => setPaymentState(d => ({...d, date: e.target.value}))}/>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmittingPayment}>
                {isSubmittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {receiptInfo.isOpen && receiptInfo.borrower && receiptInfo.loan && (
          <ReceiptGenerator 
            isOpen={receiptInfo.isOpen}
            setIsOpen={(isOpen) => setReceiptInfo(prev => ({ ...prev, isOpen }))}
            borrower={receiptInfo.borrower}
            loan={receiptInfo.loan}
            paymentAmount={receiptInfo.paymentAmount}
            paymentDate={receiptInfo.paymentDate}
            balance={receiptInfo.balance}
          />
      )}

      <Dialog open={isFileReportOpen} onOpenChange={setFileReportOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>File Situation Report</DialogTitle>
            <DialogDescription>
              Document a specific situation regarding {borrower.name}. This will be visible to management.
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
                    <Label className="text-right">Related Loan (Optional)</Label>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a related loan" />
                      </SelectTrigger>
                      <SelectContent>
                        {borrowerLoans.map(loan => (
                          <SelectItem key={loan.id} value={loan.id}>{loan.id}</SelectItem>
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
              <Button type="submit">File Report</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isViewReportOpen} onOpenChange={setViewReportOpen}>
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Situation Report Details</DialogTitle>
                  {selectedReport && <DialogDescription>Report filed on {format(new Date(selectedReport.reportDate), 'PPP')}</DialogDescription>}
              </DialogHeader>
              {selectedReport && (
                  <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                      <div className="flex items-center justify-between">
                          <div>
                              <span className="font-semibold text-lg">{selectedReport.summary}</span>
                               <p className="text-sm text-muted-foreground">Type: <Badge variant="secondary">{selectedReport.situationType}</Badge></p>
                          </div>
                          <Badge variant={getReportStatusVariant(selectedReport.status)} className="text-base px-3 py-1">{selectedReport.status}</Badge>
                      </div>
                      
                      <div>
                          <h4 className="font-semibold mb-1">Details</h4>
                          <p className="text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md">{selectedReport.details}</p>
                      </div>

                      <div>
                          <h4 className="font-semibold mb-1">Proposed Resolution</h4>
                          <p className="text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md">{selectedReport.resolutionPlan}</p>
                      </div>

                     {isAdmin && selectedReport.status !== 'Closed' && (
                        <div className="space-y-2 border-t pt-4">
                            <Label>Update Status</Label>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleUpdateReportStatus(selectedReport.id, 'Under Review')} disabled={selectedReport.status === 'Under Review'}>Under Review</Button>
                                <Button size="sm" variant="outline" onClick={() => handleUpdateReportStatus(selectedReport.id, 'Resolved')} disabled={selectedReport.status === 'Resolved'}>Mark as Resolved</Button>
                                <Button size="sm" variant="secondary" onClick={() => handleUpdateReportStatus(selectedReport.id, 'Closed')}>Close Report</Button>
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
