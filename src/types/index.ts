export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
};

export type Loan = {
  id: string;
  customerId: string;
  principal: number;
  interestRate: number;
  term: number; // in months
  startDate: string;
  status: 'Active' | 'Overdue' | 'Paid' | 'Pending';
};

export type Payment = {
    id: string;
    loanId: string;
    amount: number;
    date: string;
    recordedBy: string;
};
