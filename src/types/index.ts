import { z } from 'zod';
import { 
    BorrowerSchema, 
    LoanSchema, 
    PaymentSchema, 
    CollateralItemSchema, 
    RepaymentScheduleItemSchema,
    SituationReportSchema,
} from '@/lib/schemas';


export type UserProfile = {
  uid: string;
  email: string;
  role: 'admin' | 'ceo' | 'loan_officer' | 'cfo' | 'hr';
  displayName: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
};

export type CollateralItem = z.infer<typeof CollateralItemSchema>;
export type RepaymentScheduleItem = z.infer<typeof RepaymentScheduleItemSchema>;
export type Loan = z.infer<typeof LoanSchema>;
export type Borrower = z.infer<typeof BorrowerSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type SituationReport = z.infer<typeof SituationReportSchema>;


export type BusinessSettings = {
  id: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  reserveAmount: number;
};

export type ChatMessage = {
  id: string;
  senderId: string; // Corresponds to UserProfile['uid']
  senderEmail: string;
  text: string;
  timestamp: string; // ISO string format
};

export type Conversation = {
  id: string;
  participants: string[]; // Array of UserProfile['uid']
  participantEmails: string[];
  createdAt: string; // ISO string format
  lastMessage: {
    text: string;
    timestamp: string;
    senderId: string;
  } | null;
};

export type Account = {
  id: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  balance: number;
};

export type TransactionLine = {
  accountId: string;
  accountName: string;
  type: 'debit' | 'credit';
  amount: number;
};

export type JournalEntry = {
  id: string;
  date: string;
  description: string;
  lines: TransactionLine[];
};

export type MonthEndClosure = {
  id: string; // Format: "YYYY-MM"
  initiatedBy: string; // UID of the CFO
  initiatedByEmail?: string;
  initiatedAt: string; // ISO String
  approvedBy?: string; // UID of the CEO
  approvedByEmail?: string;
  approvedAt?: string; // ISO String
  processedBy?: string; // UID of the CFO who processed it
  processedByEmail?: string;
  processedAt?: string; // ISO String
  status: 'pending_approval' | 'approved' | 'processed' | 'rejected';
  closingJournalEntryId?: string;
};

export type AuditLog = {
    id: string;
    timestamp: string; // ISO string
    userEmail: string; // Email of the user who performed the action
    action: string; // e.g., "USER_CREATE", "LOAN_DISBURSE", "ROLE_UPDATE"
    details: Record<string, any>; // e.g., { userId: "...", newRole: "admin" }
};
