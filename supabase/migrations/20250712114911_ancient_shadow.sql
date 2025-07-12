/*
  # Personal Finance Database Schema

  1. New Tables
    - `user_settings` - User preferences and settings
    - `bank_accounts` - Bank account information
    - `incomes` - Income records
    - `expenses` - Expense records
    - `investments` - Investment portfolio
    - `goals` - Financial goals
    - `loans` - Loan management
    - `loan_repayments` - Loan repayment history
    - `transfers` - Money transfers between accounts
    - `exchange_rates` - Currency exchange rates cache
    - `transaction_conversions` - Currency conversion records

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  default_currency text DEFAULT 'INR',
  display_currency text DEFAULT 'INR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bank_name text NOT NULL,
  account_type text NOT NULL DEFAULT 'Savings',
  account_number text,
  ifsc_code text,
  balance numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'INR',
  notes text,
  credit_limit numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bank accounts"
  ON bank_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Incomes Table
CREATE TABLE IF NOT EXISTS incomes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  source text NOT NULL,
  amount numeric(15,2) NOT NULL,
  currency text DEFAULT 'INR',
  frequency text DEFAULT 'Monthly',
  notes text,
  account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  is_loan_income boolean DEFAULT false,
  linked_loan_id uuid,
  settlement_status text DEFAULT 'Not Settled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own incomes"
  ON incomes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  category text NOT NULL,
  description text,
  amount numeric(15,2) NOT NULL,
  currency text DEFAULT 'INR',
  type text DEFAULT 'Need',
  account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  is_repayment_transfer boolean DEFAULT false,
  payment_status text DEFAULT 'Unpaid',
  payment_date date,
  linked_transfer_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own expenses"
  ON expenses
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Investments Table
CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  type text NOT NULL,
  name text NOT NULL,
  original_amount numeric(15,2) NOT NULL,
  currency text DEFAULT 'INR',
  current_value numeric(15,2) NOT NULL,
  total_invested numeric(15,2) NOT NULL,
  realized_gain numeric(15,2) DEFAULT 0,
  notes text,
  linked_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  status text DEFAULT 'Active',
  liquidation_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own investments"
  ON investments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Goals Table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  target_amount numeric(15,2) NOT NULL,
  target_currency text DEFAULT 'INR',
  saved_amount numeric(15,2) DEFAULT 0,
  target_date date NOT NULL,
  type text NOT NULL,
  notes text,
  status text DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals"
  ON goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Loans Table
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lender_name text NOT NULL,
  loan_type text NOT NULL,
  principal_amount numeric(15,2) NOT NULL,
  interest_rate numeric(5,2) DEFAULT 0,
  start_date date NOT NULL,
  term_months integer,
  monthly_payment numeric(15,2),
  remaining_balance numeric(15,2) NOT NULL,
  status text DEFAULT 'Active',
  linked_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own loans"
  ON loans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Loan Repayments Table
CREATE TABLE IF NOT EXISTS loan_repayments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  payment_amount numeric(15,2) NOT NULL,
  payment_date date NOT NULL,
  principal_amount numeric(15,2) NOT NULL,
  interest_amount numeric(15,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own loan repayments"
  ON loan_repayments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Transfers Table
CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_account_id uuid REFERENCES bank_accounts(id) ON DELETE CASCADE NOT NULL,
  to_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL,
  currency text DEFAULT 'INR',
  type text NOT NULL,
  description text,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own transfers"
  ON transfers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Exchange Rates Table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency text NOT NULL,
  rates jsonb NOT NULL,
  fetch_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(base_currency)
);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read exchange rates"
  ON exchange_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- Transaction Conversions Table
CREATE TABLE IF NOT EXISTS transaction_conversions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id uuid NOT NULL,
  transaction_type text NOT NULL,
  original_amount numeric(15,2) NOT NULL,
  original_currency text NOT NULL,
  converted_amount numeric(15,2) NOT NULL,
  converted_currency text NOT NULL,
  exchange_rate numeric(10,6) NOT NULL,
  conversion_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transaction_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read conversion data for their transactions"
  ON transaction_conversions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert conversion data"
  ON transaction_conversions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add foreign key constraint for loans to incomes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'incomes_linked_loan_id_fkey'
  ) THEN
    ALTER TABLE incomes ADD CONSTRAINT incomes_linked_loan_id_fkey 
    FOREIGN KEY (linked_loan_id) REFERENCES loans(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key constraint for transfers to expenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'expenses_linked_transfer_id_fkey'
  ) THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_linked_transfer_id_fkey 
    FOREIGN KEY (linked_transfer_id) REFERENCES transfers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_user_id ON loan_repayments(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_conversions_transaction ON transaction_conversions(transaction_id, transaction_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'user_settings', 'bank_accounts', 'incomes', 'expenses', 
    'investments', 'goals', 'loans', 'loan_repayments', 
    'transfers', 'exchange_rates', 'transaction_conversions'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;