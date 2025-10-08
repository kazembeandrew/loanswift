import { z } from 'zod';

export const CollateralItemSchema = z.object({
  name: z.string().min(1, 'Collateral name is required'),
  value: z.coerce.number().positive('Value must be a positive number'),
});

export const RepaymentScheduleItemSchema = z.object({
  dueDate: z.string(),
  amountDue: z.coerce.number(),
});

export const LoanSchema = z.object({
  id: z.string(),
  borrowerId: z.string(),
  principal: z.coerce.number().positive('Principal must be a positive number'),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative'),
  repaymentPeriod: z.coerce.number().int().positive('Repayment period must be a positive integer in months'),
  startDate: z.string().min(1, 'Start date is required'),
  outstandingBalance: z.coerce.number(),
  collateral: z.array(CollateralItemSchema).optional(),
  repaymentSchedule: z.array(RepaymentScheduleItemSchema).optional(),
});

export const BorrowerSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
    phone: z.string().min(1, 'Phone number is required'),
    idNumber: z.string().min(1, 'ID number is required').max(30, 'ID number must be 30 characters or less'),
    address: z.string().min(1, 'Address is required'),
    guarantorName: z.string().min(1, 'Guarantor name is required'),
    guarantorPhone: z.string().min(1, 'Guarantor phone is required'),
    joinDate: z.string(),
    loanOfficerId: z.string(),
});

export const PaymentSchema = z.object({
    id: z.string(),
    loanId: z.string(),
    amount: z.coerce.number().positive('Payment amount must be positive'),
    date: z.string(),
    method: z.enum(['cash', 'bank', 'mobile_money']),
    recordedBy: z.string(),
});

export const SituationReportSchema = z.object({
  id: z.string(),
  borrowerId: z.string(),
  loanId: z.string().optional(),
  reportDate: z.string(), // ISO string
  reportedBy: z.string(), // UID of the loan officer
  situationType: z.enum(['Client Dispute', 'Business Disruption', 'Collateral Issue', 'Personal Emergency', 'Fraud Concern', 'Other']),
  summary: z.string().min(1, "Summary is required").max(100, "Summary must be 100 characters or less"),
  details: z.string().min(1, "Details are required"),
  resolutionPlan: z.string().min(1, "Resolution plan is required"),
  status: z.enum(['Open', 'Under Review', 'Resolved', 'Closed']),
  updatedAt: z.string().optional(), // ISO string
});
