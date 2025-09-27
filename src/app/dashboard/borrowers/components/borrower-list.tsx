'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
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
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
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
import { addBorrower, getBorrowers, updateBorrower } from '@/services/borrower-service';
import { addLoan, getLoans } from '@/services/loan-service';
import { addPayment, getAllPayments } from '@/services/payment-service';

const collateralSchema = z.object({
  name: z.string().min(1, 'Collateral name is required'),
  value: z.coerce.number().positive('Value must be positive'),
});

const borrowerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  idNumber: z.string().min(1, 'ID number is required'),
  address: z.string().min(1, 'Address is required'),
  guarantorName: z.string().min(1, 'Guarantor name is required'),
  guarantorPhone: z.string().min(1, 'Guarantor phone is required'),

  loanAmount: z.coerce.number().positive('Loan amount must be a positive number').optional(),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative').optional(),
  repaymentPeriod: z.coerce.number().int().positive('Repayment period must be a positive integer').optional(),
  startDate: z.string().optional(),
  collateral: z.array(collateralSchema).optional(),
});

const newLoanFormSchema = z.object({
  loanAmount: z.coerce.number().positive('Loan amount must be a positive number'),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative'),
  repaymentPeriod: z.coerce.number().int().positive('Repayment period must be a positive integer'),
  startDate: z.string().min(1, 'Date is required'),
  collateral: z.array(collateralSchema).optional(),
});

const borrowerFormDefaultValues = {
  name: '',
  phone: '',
  idNumber: '',
  address: '',
  guarantorName: '',
  guarantorPhone: '',
  loanAmount: undefined,
  interestRate: undefined,
  repaymentPeriod: undefined,
  startDate: '',
  collateral: [],
};

const newLoanFormDefaultValues = {
    loanAmount: undefined,
    interestRate: undefined,
    repaymentPeriod: undefined,
    startDate: '',
    collateral: [],
};

type BorrowerListProps = {
  isAddBorrowerOpen?: boolean;
  setAddBorrowerOpen?: (isOpen: boolean) => void;
};

export default function BorrowerList({ isAddBorrowerOpen: isAddBorrowerOpenProp, setAddBorrowerOpen: setAddBorrowerOpenProp }: BorrowerListProps) {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<(Payment & { loanId: string })[]>([]);
  const [internalIsAddBorrowerOpen, setInternalIsAddBorrowerOpen] = useState(false);
  
  const isAddBorrowerOpen = isAddBorrowerOpenProp !== undefined ? isAddBorrowerOpenProp : internalIsAddBorrowerOpen;
  const setAddBorrowerOpen = setAddBorrowerOpenProp !== undefined ? setAddBorrowerOpenProp : setInternalIsAddBorrowerOpen;

  const [isEditBorrowerOpen, setEditBorrowerOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isReceiptGeneratorOpen, setReceiptGeneratorOpen] = useState(false);
  const [isAddNewLoanOpen, setAddNewLoanOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({ amount: '', date: '' });
  const { toast } = useToast();
  const [addBorrowerStep, setAddBorrowerStep] = useState(1);
  const [receiptBalance, setReceiptBalance] = useState(0);

  const fetchData = useCallback(async () => {
    const [borrowersData, loansData, paymentsData] = await Promise.all([
      getBorrowers(),
      getLoans(),
      getAllPayments(),
    ]);
    setBorrowers(borrowersData);
    setLoans(loansData);
    setPayments(paymentsData);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const borrowerForm = useForm<z.infer<typeof borrowerFormSchema>>({
    resolver: zodResolver(borrowerFormSchema),
    defaultValues: borrowerFormDefaultValues,
  });

  const { fields: borrowerCollateralFields, append: appendBorrowerCollateral, remove: removeBorrowerCollateral } = useFieldArray({
    control: borrowerForm.control,
    name: "collateral",
  });

  const newLoanForm = useForm<z.infer<typeof newLoanFormSchema>>({
    resolver: zodResolver(newLoanFormSchema),
    defaultValues: newLoanFormDefaultValues,
  });
  
  const { fields: newLoanCollateralFields, append: appendNewLoanCollateral, remove: removeNewLoanCollateral } = useFieldArray({
      control: newLoanForm.control,
      name: "collateral",
  });

  const getLoanBalance = (loan: Loan) => {
    const totalPaid = payments
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    return totalOwed - totalPaid;
  };

  const handleRecordPayment = (borrower: Borrower, loan: Loan) => {
    setSelectedBorrower(borrower);
    setSelectedLoan(loan);
    setPaymentDetails({ amount: '', date: new Date().toISOString().split('T')[0] });
    setRecordPaymentOpen(true);
  };
  
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBorrower || !selectedLoan || !paymentDetails.amount) return;

    const newPaymentAmount = parseFloat(paymentDetails.amount);
    const balance = getLoanBalance(selectedLoan);

    if (newPaymentAmount > balance) {
      toast({
        title: 'Overpayment Warning',
        description: `This payment of MWK ${newPaymentAmount.toLocaleString()} exceeds the outstanding balance of MWK ${balance.toLocaleString()}. The payment was not recorded.`,
        variant: 'destructive',
      });
      return;
    }

    const newPaymentData: Omit<Payment, 'id'> = {
      loanId: selectedLoan.id,
      amount: newPaymentAmount,
      date: paymentDetails.date || new Date().toISOString().split('T')[0],
      recordedBy: 'Staff Admin',
      method: 'cash',
    };

    await addPayment(selectedLoan.id, newPaymentData);
    
    setReceiptBalance(balance - newPaymentAmount);

    toast({
      title: 'Payment Recorded',
      description: `Payment of MWK ${newPaymentData.amount} for loan ${selectedLoan.id} has been recorded.`,
    });

    setRecordPaymentOpen(false);
    setReceiptGeneratorOpen(true);
    
    await fetchData();
  }

  const handleEditBorrowerClick = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    borrowerForm.reset(borrower);
    setEditBorrowerOpen(true);
  };

  const handleEditBorrowerSubmit = async (values: z.infer<typeof borrowerFormSchema>) => {
    if (!selectedBorrower) return;

    await updateBorrower(selectedBorrower.id, values);
    
    setEditBorrowerOpen(false);
    borrowerForm.reset(borrowerFormDefaultValues);
    toast({
      title: 'Borrower Updated',
      description: `${values.name}'s details have been successfully updated.`,
    });
    await fetchData();
  };
  
  const handleAddBorrowerSubmit = async (values: z.infer<typeof borrowerFormSchema>) => {
    
    const newBorrowerData: Omit<Borrower, 'id' | 'joinDate'> = {
      name: values.name,
      phone: values.phone,
      idNumber: values.idNumber,
      address: values.address,
      guarantorName: values.guarantorName,
      guarantorPhone: values.guarantorPhone,
    };
    
    const newBorrowerId = await addBorrower(newBorrowerData);

    if (values.loanAmount && values.startDate && values.repaymentPeriod) {
        const newLoanData: Omit<Loan, 'id'> = {
          borrowerId: newBorrowerId,
          principal: values.loanAmount,
          interestRate: values.interestRate || 0,
          repaymentPeriod: values.repaymentPeriod,
          startDate: values.startDate,
          outstandingBalance: values.loanAmount,
          collateral: values.collateral,
        };
        await addLoan(newLoanData);
    }
    
    await fetchData();
    setAddBorrowerOpen(false);
    borrowerForm.reset(borrowerFormDefaultValues);
    setAddBorrowerStep(1);
    toast({
      title: 'Borrower Added',
      description: `${values.name} has been successfully added.`,
    });
  };

  const handleAddNewLoanClick = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    newLoanForm.reset(newLoanFormDefaultValues);
    setAddNewLoanOpen(true);
  };
  
  const handleAddNewLoanSubmit = async (values: z.infer<typeof newLoanFormSchema>) => {
    if (!selectedBorrower) return;
    
    const newLoanData: Omit<Loan, 'id'> = {
      borrowerId: selectedBorrower.id,
      principal: values.loanAmount,
      interestRate: values.interestRate,
      repaymentPeriod: values.repaymentPeriod,
      startDate: values.startDate,
      outstandingBalance: values.loanAmount,
      collateral: values.collateral,
    };
    
    await addLoan(newLoanData);
    await fetchData();
    setAddNewLoanOpen(false);
    newLoanForm.reset(newLoanFormDefaultValues);
    toast({
      title: 'New Loan Added',
      description: `A new loan has been added for ${selectedBorrower.name}.`,
    });
  };

  const getLoanStatus = (loan: Loan): 'approved' | 'active' | 'closed' => {
      const balance = getLoanBalance(loan);
      if (balance <= 0) return 'closed';

      const paymentsForLoan = payments.filter(p => p.loanId === loan.id);
      if (paymentsForLoan.length > 0) return 'active';

      return 'approved';
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

  useEffect(() => {
    if (!isAddBorrowerOpen) {
      borrowerForm.reset(borrowerFormDefaultValues);
      setAddBorrowerStep(1);
    }
  }, [isAddBorrowerOpen, borrowerForm]);

  useEffect(() => {
    if (!isEditBorrowerOpen) {
       borrowerForm.reset(borrowerFormDefaultValues);
    }
  }, [isEditBorrowerOpen, borrowerForm]);
  
  useEffect(() => {
    if (!isAddNewLoanOpen) {
      newLoanForm.reset(newLoanFormDefaultValues);
    }
  }, [isAddNewLoanOpen, newLoanForm]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-2xl font-semibold">Borrowers</h1>
        <Dialog open={isAddBorrowerOpen} onOpenChange={setAddBorrowerOpen}>
          <DialogTrigger asChild>
             { setAddBorrowerOpenProp === undefined && (
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Borrower
                </Button>
              )
            }
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Borrower</DialogTitle>
              <DialogDescription>
                {addBorrowerStep === 1 ? 'Step 1: Fill in the borrower details.' : 'Step 2: Add an optional initial loan.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...borrowerForm}>
              <form onSubmit={borrowerForm.handleSubmit(handleAddBorrowerSubmit)} className="grid gap-4 py-4">
                 {addBorrowerStep === 1 && (
                    <>
                        <FormField control={borrowerForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={borrowerForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={borrowerForm.control} name="idNumber" render={({ field }) => (<FormItem><FormLabel>ID Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={borrowerForm.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={borrowerForm.control} name="guarantorName" render={({ field }) => (<FormItem><FormLabel>Guarantor's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={borrowerForm.control} name="guarantorPhone" render={({ field }) => (<FormItem><FormLabel>Guarantor's Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </>
                 )}
                 {addBorrowerStep === 2 && (
                    <>
                        <FormField control={borrowerForm.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Loan Amount</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={borrowerForm.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={borrowerForm.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={borrowerForm.control} name="repaymentPeriod" render={({ field }) => (<FormItem><FormLabel>Repayment Period (Months)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        <div>
                          <Label>Collateral</Label>
                          {borrowerCollateralFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2 mt-2">
                               <FormField control={borrowerForm.control} name={`collateral.${index}.name`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="Item Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                               <FormField control={borrowerForm.control} name={`collateral.${index}.value`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="number" placeholder="Item Value" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeBorrowerCollateral(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendBorrowerCollateral({ name: '', value: 0 })}>Add Collateral</Button>
                        </div>
                    </>
                 )}
                <DialogFooter className="mt-4">
                  {addBorrowerStep === 1 && (
                      <Button type="button" onClick={async () => {
                          const isValid = await borrowerForm.trigger(['name', 'phone', 'idNumber', 'address', 'guarantorName', 'guarantorPhone']);
                          if (isValid) setAddBorrowerStep(2);
                      }}>Next</Button>
                  )}
                  {addBorrowerStep === 2 && (
                    <>
                      <Button type="button" variant="outline" onClick={() => setAddBorrowerStep(1)}>Back</Button>
                      <Button type="submit">Save Borrower</Button>
                    </>
                  )}
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Borrower</TableHead>
              <TableHead>ID Number</TableHead>
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
                  <TableCell>{borrower.idNumber}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {borrowerLoans.map((loan) => {
                        const status = getLoanStatus(loan);
                        return (
                          <Badge
                            key={loan.id}
                            variant={getLoanStatusVariant(status)}
                            className="cursor-pointer"
                            onClick={() => status !== 'closed' && handleRecordPayment(borrower, loan)}
                          >
                            {loan.id} ({status})
                          </Badge>
                        )
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
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
                            <DropdownMenuItem key={loan.id} onClick={() => handleRecordPayment(borrower, loan)}>
                              For Loan {loan.id}
                            </DropdownMenuItem>
                         ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isEditBorrowerOpen} onOpenChange={setEditBorrowerOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Borrower</DialogTitle>
              <DialogDescription>
                Update the details for {selectedBorrower?.name}.
              </DialogDescription>
            </DialogHeader>
            <Form {...borrowerForm}>
              <form onSubmit={borrowerForm.handleSubmit(handleEditBorrowerSubmit)} className="grid gap-4 py-4">
                 <FormField control={borrowerForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={borrowerForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={borrowerForm.control} name="idNumber" render={({ field }) => (<FormItem><FormLabel>ID Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={borrowerForm.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={borrowerForm.control} name="guarantorName" render={({ field }) => (<FormItem><FormLabel>Guarantor's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={borrowerForm.control} name="guarantorPhone" render={({ field }) => (<FormItem><FormLabel>Guarantor's Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <DialogFooter>
                  <Button type="submit">Save Changes</Button>
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
              <Button type="submit">Generate Receipt</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {selectedBorrower && (
        <Dialog open={isAddNewLoanOpen} onOpenChange={setAddNewLoanOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Loan</DialogTitle>
                    <DialogDescription>
                        For borrower {selectedBorrower.name}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...newLoanForm}>
                    <form onSubmit={newLoanForm.handleSubmit(handleAddNewLoanSubmit)} className="grid gap-4 py-4">
                        <FormField control={newLoanForm.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={newLoanForm.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Interest (%)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={newLoanForm.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={newLoanForm.control} name="repaymentPeriod" render={({ field }) => (<FormItem><FormLabel>Repayment Period (Months)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                         <div>
                          <Label>Collateral</Label>
                          {newLoanCollateralFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2 mt-2">
                               <FormField control={newLoanForm.control} name={`collateral.${index}.name`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="Item Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                               <FormField control={newLoanForm.control} name={`collateral.${index}.value`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="number" placeholder="Item Value" {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeNewLoanCollateral(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendNewLoanCollateral({ name: '', value: 0 })}> Add Collateral </Button>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Save loan</Button>
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
    </>
  );
}

    