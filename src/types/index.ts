

export type UserProfile = {
  uid: string;
  email: string;
  role: 'admin' | 'ceo' | 'loan_officer' | 'cfo' | 'hr';
  displayName: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
};

export type Borrower = {
  id: string;
  name: string;
  phone: string;
  idNumber: string;
  guarantorName: string;
  guarantorPhone: string;
  address: string;
  joinDate: string;
  loanOfficerId: string; // The UID of the loan officer who manages this borrower
};

export type CollateralItem = {
  name: string;
  value: number;
};

export type RepaymentScheduleItem = {
  dueDate: string;
  amountDue: number;
};

export type Loan = {
  id:string;
  borrowerId: string;
  principal: number;
  interestRate: number;
  repaymentPeriod: number; // in months
  startDate: string;
  outstandingBalance: number;
  collateral?: CollateralItem[];
  repaymentSchedule: RepaymentScheduleItem[];
};

export type Payment = {
    id: string;
    loanId: string;
    amount: number;
    date: string;
    method: 'cash' | 'bank' | 'mobile_money';
    recordedBy: string;
};

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

export type SituationReport = {
  id: string;
  borrowerId: string;
  loanId?: string;
  reportDate: string; // ISO string
  reportedBy: string; // UID of the loan officer
  situationType: 'Client Dispute' | 'Business Disruption' | 'Collateral Issue' | 'Personal Emergency' | 'Fraud Concern' | 'Other';
  summary: string;
  details: string;
  resolutionPlan: string;
  status: 'Open' | 'Under Review' | 'Resolved' | 'Closed';
  updatedAt?: string; // ISO string
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
