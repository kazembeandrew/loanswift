'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import type { Customer, Loan, Payment } from '@/types';
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
import { addCustomer, getCustomers } from '@/services/customer-service';
import { addLoan, getLoansByCustomerId, getLoans } from '@/services/loan-service';
import { addPayment, getPayments, getPaymentsByLoanId } from '@/services/payment-service';

const customerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  idUpload: z.any().optional(),
  applicationForm: z.any().optional(),
  loanAmount: z.coerce.number().positive('Loan amount must be a positive number').optional(),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative').optional(),
  dateTaken: z.string().optional(),
  paymentPeriod: z.string().optional(),
});

const newLoanFormSchema = z.object({
  loanAmount: z.coerce.number().positive('Loan amount must be a positive number'),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative'),
  dateTaken: z.string().min(1, 'Date is required'),
  paymentPeriod: z.string().min(1, 'Payment period is required'),
});

const customerFormDefaultValues = {
  name: '',
  email: '',
  phone: '',
  address: '',
  loanAmount: 0,
  interestRate: 0,
  dateTaken: '',
  paymentPeriod: '',
};

const newLoanFormDefaultValues = {
  loanAmount: 0,
  interestRate: 0,
  dateTaken: '',
  paymentPeriod: '',
};

type CustomerListProps = {
  isAddCustomerOpen?: boolean;
  setAddCustomerOpen?: (isOpen: boolean) => void;
};

export default function CustomerList({ isAddCustomerOpen: isAddCustomerOpenProp, setAddCustomerOpen: setAddCustomerOpenProp }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [internalIsAddCustomerOpen, setInternalIsAddCustomerOpen] = useState(false);
  
  const isAddCustomerOpen = isAddCustomerOpenProp !== undefined ? isAddCustomerOpenProp : internalIsAddCustomerOpen;
  const setAddCustomerOpen = setAddCustomerOpenProp !== undefined ? setAddCustomerOpenProp : setInternalIsAddCustomerOpen;

  const [isEditCustomerOpen, setEditCustomerOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isReceiptGeneratorOpen, setReceiptGeneratorOpen] = useState(false);
  const [isAddNewLoanOpen, setAddNewLoanOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({ amount: '', date: '' });
  const { toast } = useToast();
  const [addCustomerStep, setAddCustomerStep] = useState(1);

  const fetchData = useCallback(async () => {
    const [customersData, loansData, paymentsData] = await Promise.all([
      getCustomers(),
      getLoans(),
      getPayments(),
    ]);
    setCustomers(customersData);
    setLoans(loansData);
    setPayments(paymentsData);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const customerForm = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: customerFormDefaultValues,
  });

  const newLoanForm = useForm<z.infer<typeof newLoanFormSchema>>({
    resolver: zodResolver(newLoanFormSchema),
    defaultValues: newLoanFormDefaultValues,
  });

  const getLoanBalance = (loan: Loan) => {
    const totalPaid = payments
      .filter(p => p.loanId === loan.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalOwed = loan.principal * (1 + loan.interestRate / 100);
    return totalOwed - totalPaid;
  };

  const handleRecordPayment = (customer: Customer, loan: Loan) => {
    setSelectedCustomer(customer);
    setSelectedLoan(loan);
    setPaymentDetails({ amount: '', date: new Date().toISOString().split('T')[0] });
    setRecordPaymentOpen(true);
  };
  
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedLoan || !paymentDetails.amount) return;

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
    };

    await addPayment(newPaymentData);
    await fetchData();

    toast({
      title: 'Payment Recorded',
      description: `Payment of MWK ${newPaymentData.amount} for loan ${selectedLoan.id} has been recorded.`,
    });

    setRecordPaymentOpen(false);
    setReceiptGeneratorOpen(true);
  }

  const handleEditCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    customerForm.reset(customer);
    setEditCustomerOpen(true);
  };

  const handleEditCustomerSubmit = (values: z.infer<typeof customerFormSchema>) => {
    if (!selectedCustomer) return;

    // In a real app, you'd call an updateCustomer service function here.
    // For now, we'll just update the local state for demonstration.
    
    setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? {...c, ...values} : c));
    setEditCustomerOpen(false);
    customerForm.reset();
    toast({
      title: 'Customer Updated',
      description: `${values.name}'s details have been successfully updated.`,
    });
  };
  
  const handleAddCustomerSubmit = async (values: z.infer<typeof customerFormSchema>) => {
    
    const newCustomerData: Omit<Customer, 'id' | 'joinDate'> = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      address: values.address,
    };
    
    const newCustomerId = await addCustomer(newCustomerData);

    if (values.loanAmount && values.dateTaken && values.paymentPeriod) {
        const newLoanData: Omit<Loan, 'id'> = {
          customerId: newCustomerId,
          principal: values.loanAmount,
          interestRate: values.interestRate || 0,
          term: parseInt(values.paymentPeriod, 10),
          startDate: values.dateTaken,
          status: 'Pending',
        };
        await addLoan(newLoanData);
    }
    
    await fetchData();
    setAddCustomerOpen(false);
    customerForm.reset(customerFormDefaultValues);
    setAddCustomerStep(1);
    toast({
      title: 'Customer Added',
      description: `${values.name} has been successfully added.`,
    });
  };

  const handleAddNewLoanClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    newLoanForm.reset(newLoanFormDefaultValues);
    setAddNewLoanOpen(true);
  };
  
  const handleAddNewLoanSubmit = async (values: z.infer<typeof newLoanFormSchema>) => {
    if (!selectedCustomer) return;
    
    const newLoanData: Omit<Loan, 'id'> = {
      customerId: selectedCustomer.id,
      principal: values.loanAmount,
      interestRate: values.interestRate,
      term: parseInt(values.paymentPeriod, 10),
      startDate: values.dateTaken,
      status: 'Pending',
    };
    
    await addLoan(newLoanData);
    await fetchData();
    setAddNewLoanOpen(false);
    newLoanForm.reset(newLoanFormDefaultValues);
    toast({
      title: 'New Loan Added',
      description: `A new loan has been added for ${selectedCustomer.name}.`,
    });
  };

  const getLoanStatusVariant = (
    status: 'Active' | 'Overdue' | 'Paid' | 'Pending'
  ) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Overdue':
        return 'destructive';
      case 'Paid':
        return 'secondary';
      case 'Pending':
        return 'outline';
    }
  };

  useEffect(() => {
    if (!isAddCustomerOpen) {
      customerForm.reset(customerFormDefaultValues);
      setAddCustomerStep(1);
    }
  }, [isAddCustomerOpen, customerForm]);

  useEffect(() => {
    if (!isEditCustomerOpen) {
       customerForm.reset(customerFormDefaultValues);
    }
  }, [isEditCustomerOpen, customerForm]);
  
  useEffect(() => {
    if (!isAddNewLoanOpen) {
      newLoanForm.reset(newLoanFormDefaultValues);
    }
  }, [isAddNewLoanOpen, newLoanForm]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-2xl font-semibold">Customers</h1>
        <Dialog open={isAddCustomerOpen} onOpenChange={setAddCustomerOpen}>
          <DialogTrigger asChild>
             { setAddCustomerOpenProp === undefined && (
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
                </Button>
              )
            }
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                {addCustomerStep === 1 ? 'Step 1: Fill in the customer details.' : 'Step 2: Add an optional initial loan.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...customerForm}>
              <form onSubmit={customerForm.handleSubmit(handleAddCustomerSubmit)} className="grid gap-4 py-4">
                 {addCustomerStep === 1 && (
                    <>
                         <FormField
                          control={customerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={customerForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customerForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </>
                 )}
                 {addCustomerStep === 2 && (
                    <>
                         <FormField
                          control={customerForm.control}
                          name="loanAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Loan Amount</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                               <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customerForm.control}
                          name="interestRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Interest Rate (%)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                               <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customerForm.control}
                          name="dateTaken"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date Taken</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                               <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customerForm.control}
                          name="paymentPeriod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Period (Months)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 12" {...field} />
                              </FormControl>
                               <FormMessage />
                            </FormItem>
                          )}
                        />
                    </>
                 )}
                <DialogFooter className="mt-4">
                  {addCustomerStep === 1 && (
                      <Button type="button" onClick={async () => {
                          const isValid = await customerForm.trigger(['name', 'email', 'phone', 'address']);
                          if (isValid) setAddCustomerStep(2);
                      }}>Next</Button>
                  )}
                  {addCustomerStep === 2 && (
                    <>
                      <Button type="button" variant="outline" onClick={() => setAddCustomerStep(1)}>Back</Button>
                      <Button type="submit">Save Customer</Button>
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
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Active Loans</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const customerLoans = loans.filter(
                (loan) => loan.customerId === customer.id
              );
              return (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                     <Link href={`/dashboard/customers/${customer.id}`} className="hover:underline">
                      {customer.name}
                    </Link>
                  </TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {customerLoans.map((loan) => {
                        const isPaid = getLoanBalance(loan) <= 0;
                        const status = isPaid ? 'Paid' : loan.status;
                        return (
                          <Badge
                            key={loan.id}
                            variant={getLoanStatusVariant(status)}
                            className="cursor-pointer"
                            onClick={() => !isPaid && handleRecordPayment(customer, loan)}
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
                        <DropdownMenuItem onClick={() => handleAddNewLoanClick(customer)}>Add New Loan</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditCustomerClick(customer)}>Edit Customer</DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/customers/${customer.id}`}>View Dashboard</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Record Payment</DropdownMenuLabel>
                         {customerLoans.map((loan) => {
                           const isPaid = getLoanBalance(loan) <= 0;
                           return (
                            <DropdownMenuItem key={loan.id} onClick={() => handleRecordPayment(customer, loan)} disabled={isPaid}>
                              For Loan {loan.id} {isPaid ? '(Paid)' : ''}
                            </DropdownMenuItem>
                           )
                         })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isEditCustomerOpen} onOpenChange={setEditCustomerOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
              <DialogDescription>
                Update the details for {selectedCustomer?.name}.
              </DialogDescription>
            </DialogHeader>
            <Form {...customerForm}>
              <form onSubmit={customerForm.handleSubmit(handleEditCustomerSubmit)} className="grid gap-4 py-4">
                 <FormField
                  control={customerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={customerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={customerForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={customerForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              For loan {selectedLoan?.id} of {selectedCustomer?.name}.
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
      
      {selectedCustomer && (
        <Dialog open={isAddNewLoanOpen} onOpenChange={setAddNewLoanOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Loan</DialogTitle>
                    <DialogDescription>
                        For customer {selectedCustomer.name}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...newLoanForm}>
                    <form onSubmit={newLoanForm.handleSubmit(handleAddNewLoanSubmit)} className="grid gap-4 py-4">
                        <FormField
                            control={newLoanForm.control}
                            name="loanAmount"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4">
                                    <FormLabel className="text-right">Amount</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} className="col-span-3" />
                                    </FormControl>
                                    <FormMessage className="col-span-4 col-start-2" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={newLoanForm.control}
                            name="interestRate"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4">
                                    <FormLabel className="text-right">Interest (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} className="col-span-3" />
                                    </FormControl>
                                    <FormMessage className="col-span-4 col-start-2" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={newLoanForm.control}
                            name="dateTaken"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4">
                                    <FormLabel className="text-right">Date Taken</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} className="col-span-3" />
                                    </FormControl>
                                    <FormMessage className="col-span-4 col-start-2" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={newLoanForm.control}
                            name="paymentPeriod"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4">
                                    <FormLabel className="text-right">Payment Period</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 12 months" {...field} className="col-span-3" />
                                    </FormControl>
                                    <FormMessage className="col-span-4 col-start-2" />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">Save loan</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      )}

      {selectedCustomer && selectedLoan && (
        <ReceiptGenerator 
          isOpen={isReceiptGeneratorOpen}
          setIsOpen={setReceiptGeneratorOpen}
          customer={selectedCustomer}
          loan={selectedLoan}
          paymentAmount={parseFloat(paymentDetails.amount) || 0}
          paymentDate={paymentDetails.date || new Date().toISOString().split('T')[0]}
        />
      )}
    </>
  );
}
