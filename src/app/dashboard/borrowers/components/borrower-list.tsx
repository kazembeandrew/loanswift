'use client';

import { useState, useTransition } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import type { Borrower, Loan, Payment } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ReceiptGenerator from './receipt-generator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { addBorrower, updateBorrower } from '@/services/borrower-service';
import { handleAddLoan } from '@/app/actions/loan';
import { handleRecordPayment } from '@/app/actions/payment';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { useDB } from '@/lib/firebase-client-provider';
import { BorrowerSchema, LoanSchema } from '@/lib/schemas';


const borrowerFormSchema = BorrowerSchema.omit({ id: true, joinDate: true, loanOfficerId: true });
const newLoanFormSchema = LoanSchema.pick({ 
    principal: true, 
    interestRate: true,
    repaymentPeriod: true,
    startDate: true,
    collateral: true,
}).rename({principal: 'loanAmount'});

type BorrowerFormData = z.infer<typeof borrowerFormSchema>;
type NewLoanFormData = z.infer<typeof newLoanFormSchema>;


const borrowerFormDefaultValues: BorrowerFormData = {
  name: '',
  phone: '',
  idNumber: '',
  address: '',
  guarantorName: '',
  guarantorPhone: '',
};

const newLoanFormDefaultValues: NewLoanFormData = {
    loanAmount: 0,
    interestRate: 0,
    repaymentPeriod: 0,
    startDate: '',
    collateral: [],
};

type BorrowerListProps = {
  borrowers: Borrower[];
  loans: Loan[];
  payments: (Payment & { loanId: string })[];
};

export default function BorrowerList({ borrowers, loans, payments }: BorrowerListProps) {
  
  const [isAddBorrowerOpen, setAddBorrowerOpen] = useState(false);
  const [isEditBorrowerOpen, setEditBorrowerOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isReceiptGeneratorOpen, setReceiptGeneratorOpen] = useState(false);
  const [isAddNewLoanOpen, setAddNewLoanOpen] = useState(false);
  const [isSubmitting, startTransition] = useTransition();

  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({ amount: '', date: '' });
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [receiptBalance, setReceiptBalance] = useState(0);
  const router = useRouter();
  const db = useDB();

  const borrowerForm = useForm<BorrowerFormData>({
    resolver: zodResolver(borrowerFormSchema),
    defaultValues: borrowerFormDefaultValues,
  });

  const newLoanForm = useForm<NewLoanFormData>({
    resolver: zodResolver(newLoanFormSchema),
    defaultValues: newLoanFormDefaultValues,
  });
  
  const { fields: newLoanCollateralFields, append: appendNewLoanCollateral, remove: removeNewLoanCollateral } = useFieldArray({
      control: newLoanForm.control,
      name: "collateral",
  });
  

  const handleAddBorrowerSubmit: SubmitHandler<BorrowerFormData> = (values) => {
    if (!userProfile) return;
    startTransition(async () => {
        try {
            const newBorrower = await addBorrower(db, { ...values, loanOfficerId: userProfile.uid });
            setAddBorrowerOpen(false);
            borrowerForm.reset();
            toast({
                title: 'Borrower Added',
                description: `${newBorrower.name} has been successfully added. Redirecting...`,
            });
            router.push(`/dashboard/borrowers/${newBorrower.id}`);
        } catch (error) {
            toast({ title: 'Error', description: (error as Error).message, variant: 'destructive'});
        }
    });
  };

  const handleEditBorrowerSubmit: SubmitHandler<BorrowerFormData> = (values) => {
    if (!selectedBorrower) return;
    startTransition(async () => {
        try {
            await updateBorrower(db, selectedBorrower.id, values);
            setEditBorrowerOpen(false);
            borrowerForm.reset();
            toast({
                title: 'Borrower Updated',
                description: `${values.name}'s details have been successfully updated.`,
            });
        } catch (error) {
            toast({ title: 'Error', description: (error as Error).message, variant: 'destructive'});
        }
    });
  };
  
  const handleAddNewLoanSubmit: SubmitHandler<NewLoanFormData> = (values) => {
    if (!selectedBorrower || !userProfile) return;
     startTransition(async () => {
        try {
            const newLoanData: Omit<Loan, 'id' | 'repaymentSchedule'> = {
                borrowerId: selectedBorrower.id,
                principal: values.loanAmount,
                interestRate: values.interestRate,
                repaymentPeriod: values.repaymentPeriod,
                startDate: values.startDate,
                outstandingBalance: values.loanAmount * (1 + values.interestRate / 100),
                collateral: values.collateral,
            };
            const result = await handleAddLoan(newLoanData, userProfile.email);
            if (result.success) {
                setAddNewLoanOpen(false);
                newLoanForm.reset();
                toast({
                    title: 'New Loan Added',
                    description: `A new loan has been added for ${selectedBorrower?.name}.`,
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            toast({
                title: 'Failed to Add Loan',
                description: (error as Error).message,
                variant: 'destructive',
            });
        }
    });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBorrower || !selectedLoan || !paymentDetails.amount || !userProfile) return;
    startTransition(async () => {
        try {
            const result = await handleRecordPayment({
                loanId: selectedLoan.id,
                amount: parseFloat(paymentDetails.amount),
                date: paymentDetails.date || new Date().toISOString().split('T')[0],
                recordedByEmail: userProfile.email,
            });
            if (result.success) {
                setReceiptBalance(result.newBalance);
                setRecordPaymentOpen(false);
                setReceiptGeneratorOpen(true);
                toast({
                    title: 'Payment Recorded',
                    description: `Payment has been recorded.`,
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            toast({
                title: 'Payment Failed',
                description: (error as Error).message,
                variant: 'destructive',
            });
        }
    });
  };

  const getLoanBalance = (loan: Loan) => {
    const totalPaid = payments
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    return totalOwed - totalPaid;
  };

  const handleRecordPaymentClick = (borrower: Borrower, loan: Loan) => {
    setSelectedBorrower(borrower);
    setSelectedLoan(loan);
    setPaymentDetails({ amount: '', date: new Date().toISOString().split('T')[0] });
    setRecordPaymentOpen(true);
  };
  
  const handleEditBorrowerClick = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    borrowerForm.reset(borrower);
    setEditBorrowerOpen(true);
  };

  const handleAddNewLoanClick = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    newLoanForm.reset({
        ...newLoanFormDefaultValues,
        startDate: new Date().toISOString().split('T')[0]
    });
    setAddNewLoanOpen(true);
  };

  const getLoanStatus = (loan: Loan): 'approved' | 'active' | 'closed' => {
      const balance = getLoanBalance(loan);
      if (balance <= 0) return 'closed';

      const paymentsForLoan = payments.filter(p => p.loanId === loan.id);
      if (paymentsForLoan.length > 0) return 'active';

      return 'approved';
  };

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


  const renderActionsDropdown = (borrower: Borrower, borrowerLoans: Loan[]) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" aria-label={`Open menu for ${borrower.name}`}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleAddNewLoanClick(borrower)}>Add New Loan</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEditBorrowerClick(borrower)}>Edit Borrower</DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/borrowers/${borrower.id}`}>View Dashboard</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Record Payment</DropdownMenuLabel>
        {borrowerLoans.filter(l => getLoanBalance(l) > 0).map((loan) => (
          <DropdownMenuItem key={loan.id} onClick={() => handleRecordPaymentClick(borrower, loan)}>
            For Loan {loan.id}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
            <CardTitle>Borrowers</CardTitle>
            <CardDescription>Manage all borrowers in the system.</CardDescription>
        </div>
        <Dialog open={isAddBorrowerOpen} onOpenChange={(open) => { setAddBorrowerOpen(open); if(!open) borrowerForm.reset(borrowerFormDefaultValues); }}>
          <DialogTrigger asChild>
            <Button className="ml-auto gap-1">
                <PlusCircle className="h-4 w-4" /> Add Borrower
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Borrower</DialogTitle>
              <DialogDescription>
                Fill in the borrower's personal details below. You will be assigned as the loan officer.
              </DialogDescription>
            </DialogHeader>
            <Form {...borrowerForm}>
              <form onSubmit={borrowerForm.handleSubmit(handleAddBorrowerSubmit)} className="grid gap-4 py-4">
                <FormField control={borrowerForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={borrowerForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={borrowerForm.control} name="idNumber" render={({ field }) => (<FormItem><FormLabel>ID Number</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={borrowerForm.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={borrowerForm.control} name="guarantorName" render={({ field }) => (<FormItem><FormLabel>Guarantor's Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={borrowerForm.control} name="guarantorPhone" render={({ field }) => (<FormItem><FormLabel>Guarantor's Phone</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                <DialogFooter className="mt-4">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Borrower
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {borrowers.map((borrower) => {
              const borrowerLoans = loans.filter((loan) => loan.borrowerId === borrower.id);
              return (
                <Card key={borrower.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>
                                <Link href={`/dashboard/borrowers/${borrower.id}`} className="hover:underline">
                                    {borrower.name}
                                </Link>
                            </CardTitle>
                            <CardDescription>{borrower.idNumber}</CardDescription>
                        </div>
                        {renderActionsDropdown(borrower, borrowerLoans)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h4 className="text-sm font-semibold mb-2">Active Loans</h4>
                    <div className="flex flex-wrap gap-1">
                      {borrowerLoans.length > 0 ? borrowerLoans.map((loan) => {
                        const status = getLoanStatus(loan);
                        return (
                          <Badge
                            key={loan.id}
                            variant={getLoanStatusVariant(status)}
                            className="cursor-pointer"
                            onClick={() => status !== 'closed' && handleRecordPaymentClick(borrower, loan)}
                          >
                            {loan.id} ({status})
                          </Badge>
                        )
                      }) : <p className="text-xs text-muted-foreground">No active loans.</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop View */}
          <div className="rounded-lg border hidden md:block">
              <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead className="w-[150px] sm:w-auto">Borrower</TableHead>
                  <TableHead className="hidden md:table-cell">ID Number</TableHead>
                  <TableHead>Active Loans</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {borrowers.map((borrower) => {
                  const borrowerLoans = loans.filter((loan) => loan.borrowerId === borrower.id);
                  return (
                      <TableRow key={borrower.id}>
                      <TableCell className="font-medium">
                          <Link href={`/dashboard/borrowers/${borrower.id}`} className="hover:underline">
                          {borrower.name}
                          </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{borrower.idNumber}</TableCell>
                      <TableCell>
                          <div className="flex flex-wrap gap-1">
                          {borrowerLoans.map((loan) => {
                              const status = getLoanStatus(loan);
                              return (
                              <Badge
                                  key={loan.id}
                                  variant={getLoanStatusVariant(status)}
                                  className="cursor-pointer"
                                  onClick={() => status !== 'closed' && handleRecordPaymentClick(borrower, loan)}
                              >
                                  {loan.id} ({status})
                              </Badge>
                              )
                          })}
                          </div>
                      </TableCell>
                      <TableCell className="text-right">
                          {renderActionsDropdown(borrower, borrowerLoans)}
                      </TableCell>
                      </TableRow>
                  );
                  })}
              </TableBody>
              </Table>
          </div>
      </CardContent>

       <Dialog open={isEditBorrowerOpen} onOpenChange={(open) => { setEditBorrowerOpen(open); if(!open) borrowerForm.reset(borrowerFormDefaultValues); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Borrower</DialogTitle>
              <DialogDescription>
                Update the details for {selectedBorrower?.name}.
              </DialogDescription>
            </DialogHeader>
            <Form {...borrowerForm}>
              <form onSubmit={borrowerForm.handleSubmit(handleEditBorrowerSubmit)} className="grid gap-4 py-4">
                 <FormField control={borrowerForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={borrowerForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={borrowerForm.control} name="idNumber" render={({ field }) => (<FormItem><FormLabel>ID Number</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={borrowerForm.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={borrowerForm.control} name="guarantorName" render={({ field }) => (<FormItem><FormLabel>Guarantor's Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={borrowerForm.control} name="guarantorPhone" render={({ field }) => (<FormItem><FormLabel>Guarantor's Phone</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      <Dialog open={isRecordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              For loan {selectedLoan?.id} of {selectedBorrower?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <Input id="amount" type="number" className="col-span-3" value={paymentDetails.amount} onChange={(e) => setPaymentDetails(d => ({...d, amount: e.target.value}))}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <Input id="date" type="date" className="col-span-3" value={paymentDetails.date} onChange={(e) => setPaymentDetails(d => ({...d, date: e.target.value}))}/>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {selectedBorrower && (
        <Dialog open={isAddNewLoanOpen} onOpenChange={(open) => { setAddNewLoanOpen(open); if(!open) newLoanForm.reset(newLoanFormDefaultValues); }}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Loan</DialogTitle>
                    <DialogDescription>
                        For borrower {selectedBorrower.name}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...newLoanForm}>
                    <form onSubmit={newLoanForm.handleSubmit(handleAddNewLoanSubmit)} className="grid gap-4 py-4">
                        <FormField control={newLoanForm.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} disabled={isSubmitting} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={newLoanForm.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Interest (%)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} disabled={isSubmitting} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={newLoanForm.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={newLoanForm.control} name="repaymentPeriod" render={({ field }) => (<FormItem><FormLabel>Repayment Period (Months)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} disabled={isSubmitting} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                         <div>
                          <Label>Collateral</Label>
                          {newLoanCollateralFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2 mt-2">
                               <FormField control={newLoanForm.control} name={`collateral.${index}.name`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="Item Name" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                               <FormField control={newLoanForm.control} name={`collateral.${index}.value`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="number" placeholder="Item Value" {...field} value={field.value || ''} disabled={isSubmitting} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeNewLoanCollateral(index)} disabled={isSubmitting}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendNewLoanCollateral({ name: '', value: 0 })} disabled={isSubmitting}> Add Collateral </Button>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save loan
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      )}

      {selectedBorrower && selectedLoan && (
        <ReceiptGenerator 
          isOpen={isReceiptGeneratorOpen}
          setIsOpen={setReceiptGeneratorOpen}
          borrower={selectedBorrower}
          loan={selectedLoan}
          paymentAmount={parseFloat(paymentDetails.amount) || 0}
          paymentDate={paymentDetails.date || new Date().toISOString().split('T')[0]}
          balance={receiptBalance}
        />
      )}
    </Card>
  );
}
