
export type UserProfile = {
  uid: string;
  email: string;
  role: 'admin' | 'staff';
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

export type Capital = {
  id: string;
  date: string;
  amount: number;
  type: 'initial' | 'additional';
};

export type Income = {
  id: string;
  date: string;
  amount: number;
  source: 'interest' | 'fees' | 'penalty' | 'other';
  loanId?: string; 
};

export type Expense = {
  id: string;
  date: string;
  category: 'rent' | 'salaries' | 'utilities' | 'other';
  amount: number;
  description: string;
};

export type Drawing = {
  id: string;
  date: string;
  amount: number;
  description: string;
};

export type BusinessSettings = {
  id: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  reserveAmount: number;
};

export type Message = {
  id: string;
  authorEmail: string;
  content: string;
  createdAt: string; // ISO string format
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
