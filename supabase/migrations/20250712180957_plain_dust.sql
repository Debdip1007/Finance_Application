/*
  # Add CASCADE DELETE constraints for user account deletion

  1. Security
    - Ensures all user data is properly deleted when account is removed
    - Maintains data integrity and privacy compliance
    
  2. Changes
    - Add ON DELETE CASCADE to all foreign key constraints referencing users
    - Ensures complete data cleanup when user account is deleted
*/

-- Update user_settings table
ALTER TABLE user_settings 
DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;

ALTER TABLE user_settings 
ADD CONSTRAINT user_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update bank_accounts table
ALTER TABLE bank_accounts 
DROP CONSTRAINT IF EXISTS bank_accounts_user_id_fkey;

ALTER TABLE bank_accounts 
ADD CONSTRAINT bank_accounts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update incomes table
ALTER TABLE incomes 
DROP CONSTRAINT IF EXISTS incomes_user_id_fkey;

ALTER TABLE incomes 
ADD CONSTRAINT incomes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update expenses table
ALTER TABLE expenses 
DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update investments table
ALTER TABLE investments 
DROP CONSTRAINT IF EXISTS investments_user_id_fkey;

ALTER TABLE investments 
ADD CONSTRAINT investments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update goals table
ALTER TABLE goals 
DROP CONSTRAINT IF EXISTS goals_user_id_fkey;

ALTER TABLE goals 
ADD CONSTRAINT goals_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update loans table
ALTER TABLE loans 
DROP CONSTRAINT IF EXISTS loans_user_id_fkey;

ALTER TABLE loans 
ADD CONSTRAINT loans_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update loan_repayments table
ALTER TABLE loan_repayments 
DROP CONSTRAINT IF EXISTS loan_repayments_user_id_fkey;

ALTER TABLE loan_repayments 
ADD CONSTRAINT loan_repayments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update transfers table
ALTER TABLE transfers 
DROP CONSTRAINT IF EXISTS transfers_user_id_fkey;

ALTER TABLE transfers 
ADD CONSTRAINT transfers_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create storage bucket for user files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for user files
CREATE POLICY "Users can upload their own files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" ON storage.objects
FOR SELECT USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);