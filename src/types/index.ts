export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface BankAccount {
  id: string;
  bankName?: string; // Legacy field
  bank_name?: string; // Database field
  accountType?: 'Savings' | 'Checking' | 'Credit Card' | 'Loan' | 'Cash' | 'Other'; // Legacy field
  account_type?: 'Savings' | 'Checking' | 'Credit Card' | 'Loan' | 'Cash' | 'Other'; // Database field
  accountNumber?: string; // Legacy field
  account_number?: string; // Database field
  ifscCode?: string; // Legacy field
  ifsc_code?: string; // Database field
  balance: number;
  currency: string;
  notes?: string;
  creditLimit?: number; // Legacy field
  credit_limit?: number; // Database field
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  date: string;
  source: string;
  amount: number;
  currency: string;
  frequency: 'Monthly' | 'Bi-Weekly' | 'Weekly' | 'Yearly' | 'One-time';
  notes?: string;
  accountId?: string; // Legacy field
  account_id?: string; // Database field
  isLoanIncome?: boolean; // Legacy field
  is_loan_income?: boolean; // Database field
  linkedLoanId?: string; // Legacy field
  linked_loan_id?: string; // Database field
  settlementStatus?: string; // Legacy field
  settlement_status?: string; // Database field
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description?: string;
  amount: number;
  currency: string;
  type: 'Mandatory' | 'Need' | 'Want';
  accountId?: string; // Legacy field
  account_id?: string; // Database field
  isRepaymentTransfer: boolean;
  paymentStatus?: string; // Legacy field
  payment_status?: string; // Database field
  paymentDate?: string; // Legacy field
  payment_date?: string; // Database field
  linkedTransferId?: string; // Legacy field
  linked_transfer_id?: string; // Database field
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Investment {
  id: string;
  date: string;
  type: string;
  name: string;
  originalAmount?: number; // Legacy field
  original_amount?: number; // Database field
  currency: string;
  currentValue?: number; // Legacy field
  current_value?: number; // Database field
  totalInvested?: number; // Legacy field
  total_invested?: number; // Database field
  realizedGain?: number; // Legacy field
  realized_gain?: number; // Database field
  notes?: string;
  linkedAccountId?: string; // Legacy field
  linked_account_id?: string; // Database field
  status: 'Active' | 'Liquidated';
  liquidationDate?: string; // Legacy field
  liquidation_date?: string; // Database field
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount?: number; // Legacy field
  target_amount?: number; // Database field
  targetCurrency?: string; // Legacy field
  target_currency?: string; // Database field
  savedAmount?: number; // Legacy field
  saved_amount?: number; // Database field
  targetDate?: string; // Legacy field
  target_date?: string; // Database field
  type: 'Short-term (<1 year)' | 'Medium-term (1-5 years)' | 'Long-term (>5 years)';
  notes?: string;
  status: 'Active' | 'Fulfilled';
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  rates: Record<string, number>;
  fetchDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId?: string;
  amount: number;
  currency: string;
  type: 'Self' | 'External' | 'Cash Withdrawal' | 'Debt Repayment';
  description?: string;
  date: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

export interface Loan {
  id: string;
  lender_name: string;
  loan_type: string;
  principal_amount: number;
  interest_rate?: number;
  start_date: string;
  term_months?: number;
  monthly_payment?: number;
  remaining_balance: number;
  status: 'Active' | 'Closed';
  linked_account_id?: string;
  notes?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}