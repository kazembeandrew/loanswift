'use client';

import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Borrower, Loan } from '@/types';
import { handleAddLoan } from '@/app/actions/loan';
import { Loader2, Trash2 } from 'lucide-react';
import { LoanSchema } from '@/lib/schemas';
import { useAuth } from '@/context/auth-context';

const newLoanFormSchema = LoanSchema.pick({ 
    principal: true, 
    interestRate: true,
    repaymentPeriod: true,
    startDate: true,
    collateral: true,
}).rename({principal: 'loanAmount'});

type NewLoanFormData = z.infer<typeof newLoanFormSchema>;

type NewLoanFormProps = {
    borrower: Borrower;
    onLoanAdded: () => void;
};

const newLoanFormDefaultValues: NewLoanFormData = {
    loanAmount: 0,
    interestRate: 0,
    repaymentPeriod: 0,
    startDate: new Date().toISOString().split('T')[0],
    collateral: [],
};


export default function NewLoanForm({ borrower, onLoanAdded }: NewLoanFormProps) {
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const form = useForm<NewLoanFormData>({
        resolver: zodResolver(newLoanFormSchema),
        defaultValues: newLoanFormDefaultValues,
    });

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "collateral",
    });

    const isSubmitting = form.formState.isSubmitting;
  
    const handleAddNewLoanSubmit: SubmitHandler<NewLoanFormData> = async (values) => {
      if (!borrower || !userProfile) return;
      const newLoanData: Omit<Loan, 'id' | 'repaymentSchedule'> = {
          borrowerId: borrower.id,
          principal: values.loanAmount,
          interestRate: values.interestRate,
          repaymentPeriod: values.repaymentPeriod,
          startDate: values.startDate,
          outstandingBalance: values.loanAmount * (1 + values.interestRate / 100),
          collateral: values.collateral,
      };
      
      const result = await handleAddLoan(newLoanData, userProfile.email);
      
      if (result.success) {
        toast({
            title: 'New Loan Added',
            description: `A new loan has been added for ${borrower.name}.`,
        });
        form.reset();
        onLoanAdded();
      } else {
         toast({
            title: 'Failed to Add Loan',
            description: result.message,
            variant: 'destructive',
        });
      }
    };
  
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddNewLoanSubmit)} className="grid gap-4 py-4">
                <FormField control={form.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} disabled={isSubmitting} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="interestRate" render={({ field }) => (<FormItem><FormLabel>Interest (%)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} disabled={isSubmitting} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="repaymentPeriod" render={({ field }) => (<FormItem><FormLabel>Repayment Period (Months)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} disabled={isSubmitting} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                    <div>
                    <Label>Collateral</Label>
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2 mt-2">
                            <FormField control={form.control} name={`collateral.${index}.name`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="Item Name" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`collateral.${index}.value`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="number" placeholder="Item Value" {...field} value={field.value || ''} disabled={isSubmitting} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isSubmitting}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ name: '', value: 0 })} disabled={isSubmitting}> Add Collateral </Button>
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save loan
                    </Button>
                </div>
            </form>
        </Form>
    );
  }
  