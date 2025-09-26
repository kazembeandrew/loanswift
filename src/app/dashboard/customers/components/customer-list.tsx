'use client';

import { useState } from 'react';
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
import { customers as initialCustomers, loans as initialLoans } from '@/lib/data';
import type { Customer, Loan } from '@/types';
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

const customerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  idUpload: z.any().optional(),
  applicationForm: z.any().optional(),
  loanAmount: z.coerce.number().min(1, 'Loan amount is required'),
  interestRate: z.coerce.number().min(0, 'Interest rate is required'),
  dateTaken: z.string().min(1, 'Date is required'),
  paymentPeriod: z.string().min(1, 'Payment period is required'),
});

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [isAddCustomerOpen, setAddCustomerOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isReceiptGeneratorOpen, setReceiptGeneratorOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({ amount: '', date: '' });
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      loanAmount: 0,
      interestRate: 0,
      dateTaken: '',
      paymentPeriod: '',
    },
  });

  const handleRecordPayment = (customer: Customer, loan: Loan) => {
    setSelectedCustomer(customer);
    setSelectedLoan(loan);
    setRecordPaymentOpen(true);
  };
  
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecordPaymentOpen(false);
    setReceiptGeneratorOpen(true);
  }
  
  const handleAddCustomerSubmit = (values: z.infer<typeof customerFormSchema>) => {
    const newCustomerId = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
    const newLoanId = `LOAN-${String(loans.length + 1).padStart(3, '0')}`;
    
    const newCustomer: Customer = {
      id: newCustomerId,
      name: values.name,
      email: values.email,
      phone: '', // Not in form, can be added
      address: '', // Not in form, can be added
      joinDate: new Date().toISOString().split('T')[0],
    };
    
    const newLoan: Loan = {
      id: newLoanId,
      customerId: newCustomerId,
      principal: values.loanAmount,
      interestRate: values.interestRate,
      term: parseInt(values.paymentPeriod, 10),
      startDate: values.dateTaken,
      status: 'Pending',
    };
    
    setCustomers(prev => [...prev, newCustomer]);
    setLoans(prev => [...prev, newLoan]);
    setAddCustomerOpen(false);
    form.reset();
    toast({
      title: 'Customer Added',
      description: `${values.name} has been successfully added.`,
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

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-2xl font-semibold">Customers</h1>
        <Dialog open={isAddCustomerOpen} onOpenChange={setAddCustomerOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Fill in the details to add a new customer and their initial loan.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddCustomerSubmit)} className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="col-span-3" />
                      </FormControl>
                      <FormMessage className="col-span-4 col-start-2" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} className="col-span-3" />
                      </FormControl>
                      <FormMessage className="col-span-4 col-start-2" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idUpload"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">ID Upload</FormLabel>
                      <FormControl>
                        <Input type="file" {...form.register('idUpload')} className="col-span-3" />
                      </FormControl>
                      <FormMessage className="col-span-4 col-start-2" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="applicationForm"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Application Form</FormLabel>
                      <FormControl>
                        <Input type="file" {...form.register('applicationForm')} className="col-span-3" />
                      </FormControl>
                       <FormMessage className="col-span-4 col-start-2" />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  <Button type="submit">Save customer</Button>
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
                      {customerLoans.map((loan) => (
                        <Badge
                          key={loan.id}
                          variant={getLoanStatusVariant(loan.status)}
                          className="cursor-pointer"
                           onClick={() => handleRecordPayment(customer, loan)}
                        >
                          {loan.id} ({loan.status})
                        </Badge>
                      ))}
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
                        <DropdownMenuItem>Add New Loan</DropdownMenuItem>
                        <DropdownMenuItem>Edit Customer</DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/customers/${customer.id}`}>View Dashboard</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Record Payment</DropdownMenuLabel>
                         {customerLoans.map((loan) => (
                          <DropdownMenuItem key={loan.id} onClick={() => handleRecordPayment(customer, loan)}>
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
