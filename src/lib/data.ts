import type { Customer, Loan, Payment } from '@/types';

export const customers: Customer[] = [
  {
    id: 'CUST-001',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    address: '123 Main St, Anytown, USA',
    joinDate: '2023-01-15',
  },
  {
    id: 'CUST-002',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '987-654-3210',
    address: '456 Oak Ave, Somewhere, USA',
    joinDate: '2023-02-20',
  },
  {
    id: 'CUST-003',
    name: 'Peter Jones',
    email: 'peter.jones@example.com',
    phone: '555-123-4567',
    address: '789 Pine Ln, Otherville, USA',
    joinDate: '2023-03-10',
  },
  {
    id: 'CUST-004',
    name: 'Mary Johnson',
    email: 'mary.johnson@example.com',
    phone: '555-987-6543',
    address: '321 Elm Rd, Anytown, USA',
    joinDate: '2023-04-05',
  },
];

export const loans: Loan[] = [
  {
    id: 'LOAN-001',
    customerId: 'CUST-001',
    principal: 5000,
    interestRate: 5,
    term: 12,
    startDate: '2023-02-01',
    status: 'Active',
  },
  {
    id: 'LOAN-002',
    customerId: 'CUST-002',
    principal: 10000,
    interestRate: 7,
    term: 24,
    startDate: '2023-03-01',
    status: 'Active',
  },
  {
    id: 'LOAN-003',
    customerId: 'CUST-001',
    principal: 2000,
    interestRate: 10,
    term: 6,
    startDate: '2023-05-10',
    status: 'Overdue',
  },
  {
    id: 'LOAN-004',
    customerId: 'CUST-003',
    principal: 15000,
    interestRate: 4.5,
    term: 36,
    startDate: '2023-04-01',
    status: 'Paid',
  },
  {
    id: 'LOAN-005',
    customerId: 'CUST-004',
    principal: 7500,
    interestRate: 6,
    term: 18,
    startDate: '2023-06-01',
    status: 'Pending',
  },
];

export const payments: Payment[] = [
    {
        id: 'PAY-001',
        loanId: 'LOAN-001',
        amount: 428,
        date: '2023-03-01',
        recordedBy: 'Admin',
    },
    {
        id: 'PAY-002',
        loanId: 'LOAN-001',
        amount: 428,
        date: '2023-04-01',
        recordedBy: 'Admin',
    },
    {
        id: 'PAY-003',
        loanId: 'LOAN-002',
        amount: 448,
        date: '2023-04-01',
        recordedBy: 'Admin',
    },
];
