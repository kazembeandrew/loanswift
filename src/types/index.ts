

export type UserProfile = {
  uid: string;
  email: string;
  role: 'admin' | 'ceo' | 'loan_officer';
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
};

export type CollateralItem = {
  name: string;
  value: number;
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
