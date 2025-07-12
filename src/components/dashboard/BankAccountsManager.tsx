import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, ArrowUpRight, ArrowDownLeft, Banknote, CreditCard, DollarSign, Archive, Globe } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Table from '../ui/Table';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { useCurrencySettings } from '../../hooks/useCurrencySettings';
import { currencyConverter } from '../../lib/currencyConverter';
import { formatCurrency, CURRENCIES } from '../../lib/currencies';
import { calculateCompleteTransferBreakdown, TransferBreakdown } from '../../lib/transferCalculations';
import { BankAccount, Loan } from '../../types';

const ACCOUNT_TYPES = [
  { value: 'Savings', label: 'Savings' },
  { value: 'Checking', label: 'Checking' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Loan', label: 'Loan' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Other', label: 'Other' },
];

interface AccountFormData {
  bankName: string;
  accountType: string;
  accountNumber: string;
  ifscCode: string;
  balance: string;
  currency: string;
  notes: string;
  creditLimit: string;
}

interface TransferFormData {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  description: string;
  type: 'Self' | 'External' | 'Cash Withdrawal' | 'Debt Repayment';
}

interface InternationalTransferFormData {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  description: string;
  exchangeRate: string;
  useCustomRate: boolean;
  percentageMarkupFee: string;
  fixedMarkupFee: string;
  extraFeeAmount: string;
  extraFeeCurrency: 'source' | 'destination';
  makeupAmount: string;
}

interface LoanFormData {
  lenderName: string;
  loanType: string;
  principalAmount: string;
  interestRate: string;
  startDate: string;
  termMonths: string;
  monthlyPayment: string;
  linkedAccountId: string;
  notes: string;
}

const LOAN_TYPES = [
  { value: 'Personal', label: 'Personal Loan' },
  { value: 'Home', label: 'Home Loan' },
  { value: 'Car', label: 'Car Loan' },
  { value: 'Education', label: 'Education Loan' },
  { value: 'Business', label: 'Business Loan' },
  { value: 'Credit Line', label: 'Credit Line' },
  { value: 'Other', label: 'Other' },
];

export default function BankAccountsManager() {
  const { user } = useAuth();
  const { convert, rates } = useExchangeRates();
  const { settings } = useCurrencySettings();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [archivedLoans, setArchivedLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showInternationalTransferModal, setShowInternationalTransferModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showArchivedLoans, setShowArchivedLoans] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [transferBreakdown, setTransferBreakdown] = useState<TransferBreakdown | null>(null);
  
  const [accountForm, setAccountForm] = useState<AccountFormData>({
    bankName: '',
    accountType: 'Savings',
    accountNumber: '',
    ifscCode: '',
    balance: '0.00',
    currency: 'INR',
    notes: '',
    creditLimit: '0.00',
  });

  const [transferForm, setTransferForm] = useState<TransferFormData>({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
    type: 'Self',
  });

  const [internationalTransferForm, setInternationalTransferForm] = useState<InternationalTransferFormData>({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
    exchangeRate: '',
    useCustomRate: false,
    percentageMarkupFee: '0',
    fixedMarkupFee: '0',
    extraFeeAmount: '0',
    extraFeeCurrency: 'source',
    makeupAmount: '0',
  });

  const [loanForm, setLoanForm] = useState<LoanFormData>({
    lenderName: '',
    loanType: 'Personal',
    principalAmount: '',
    interestRate: '0',
    startDate: new Date().toISOString().split('T')[0],
    termMonths: '',
    monthlyPayment: '',
    linkedAccountId: '',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      loadAccounts();
      loadLoans();
    }
  }, [user]);

  // Calculate current exchange rate for international transfers
  const currentExchangeRate = useMemo(() => {
    if (!internationalTransferForm.fromAccountId || !internationalTransferForm.toAccountId || !rates) {
      return 1;
    }
    
    const fromAccount = accounts.find(acc => acc.id === internationalTransferForm.fromAccountId);
    const toAccount = accounts.find(acc => acc.id === internationalTransferForm.toAccountId);
    
    if (!fromAccount || !toAccount) return 1;
    
    const fromCurrency = fromAccount.currency || 'INR';
    const toCurrency = toAccount.currency || 'INR';
    
    if (fromCurrency === toCurrency) return 1;
    
    // Convert 1 unit from source to destination currency
    const converted = convert?.(1, fromCurrency, toCurrency);
    return converted || 1;
  }, [internationalTransferForm.fromAccountId, internationalTransferForm.toAccountId, accounts, rates, convert]);

  // Calculate transfer breakdown when form changes
  useEffect(() => {
    if (internationalTransferForm.amount && 
        internationalTransferForm.fromAccountId && 
        internationalTransferForm.toAccountId && 
        currentExchangeRate > 0) {
      
      const fromAccount = accounts.find(acc => acc.id === internationalTransferForm.fromAccountId);
      const toAccount = accounts.find(acc => acc.id === internationalTransferForm.toAccountId);
      
      if (fromAccount && toAccount) {
        const breakdown = calculateCompleteTransferBreakdown(
          parseFloat(internationalTransferForm.amount) || 0,
          fromAccount.currency,
          toAccount.currency,
          internationalTransferForm.useCustomRate ? 
            (parseFloat(internationalTransferForm.customExchangeRate) || 0) : 
            currentExchangeRate,
          parseFloat(internationalTransferForm.percentageMarkup) || 0,
          parseFloat(internationalTransferForm.fixedMarkupFee) || 0,
          parseFloat(internationalTransferForm.extraFee) || 0,
          internationalTransferForm.extraFeeCurrency,
          parseFloat(internationalTransferForm.bufferAmount) || 0
        );
        
        setTransferBreakdown(breakdown);
      }
    } else {
      setTransferBreakdown(null);
    }
  }, [
    internationalTransferForm.amount,
    internationalTransferForm.fromAccountId,
    internationalTransferForm.toAccountId,
    internationalTransferForm.useCustomRate,
    internationalTransferForm.customExchangeRate,
    internationalTransferForm.percentageMarkup,
    internationalTransferForm.fixedMarkupFee,
    internationalTransferForm.extraFee,
    internationalTransferForm.extraFeeCurrency,
    internationalTransferForm.bufferAmount,
    currentExchangeRate,
    accounts
  ]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading accounts:', error);
        throw error;
      }
      
      console.log('Loaded accounts:', data); // Debug log
      setAccounts(data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
      alert('Error loading bank accounts. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading loans:', error);
        throw error;
      }
      
      const activeLoans = (data || []).filter(loan => loan.status === 'Active');
      const closedLoans = (data || []).filter(loan => loan.status === 'Closed');
      
      setLoans(activeLoans);
      setArchivedLoans(closedLoans);
    } catch (error) {
      console.error('Error loading accounts:', error);
      alert('Error loading bank accounts. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Get international accounts (different currency from default)
  const getInternationalAccounts = () => {
    return accounts.filter(acc => acc.currency !== settings.defaultCurrency);
  };

  // Check if transfer is international
  const isInternationalTransfer = (fromAccountId: string, toAccountId: string) => {
    const fromAccount = accounts.find(acc => acc.id === fromAccountId);
    const toAccount = accounts.find(acc => acc.id === toAccountId);
    return fromAccount && toAccount && fromAccount.currency !== toAccount.currency;
  };

  // Get current exchange rate between two currencies
  const getCurrentExchangeRate = async (fromCurrency: string, toCurrency: string) => {
    const rate = await currencyConverter.getExchangeRate(fromCurrency, toCurrency);
    return rate || 1;
  };

  // Update exchange rate when accounts change
  useEffect(() => {
    const updateExchangeRate = async () => {
      if (internationalTransferForm.fromAccountId && internationalTransferForm.toAccountId && !internationalTransferForm.useCustomRate) {
        const fromAccount = accounts.find(acc => acc.id === internationalTransferForm.fromAccountId);
        const toAccount = accounts.find(acc => acc.id === internationalTransferForm.toAccountId);
        
        if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
          const rate = await getCurrentExchangeRate(fromAccount.currency, toAccount.currency);
          setInternationalTransferForm(prev => ({
            ...prev,
            exchangeRate: rate.toString()
          }));
        }
      }
    };

    updateExchangeRate();
  }, [internationalTransferForm.fromAccountId, internationalTransferForm.toAccountId, internationalTransferForm.useCustomRate, accounts]);

  const handleSaveAccount = async () => {
    try {
      // Validate required fields
      if (!accountForm.bankName.trim()) {
        alert('Bank name is required');
        return;
      }

      if (!accountForm.balance || isNaN(parseFloat(accountForm.balance))) {
        alert('Valid balance is required');
        return;
      }

      const accountData = {
        bank_name: accountForm.bankName.trim(),
        account_type: accountForm.accountType,
        account_number: accountForm.accountNumber.trim() || null,
        ifsc_code: accountForm.ifscCode.trim() || null,
        balance: ['Credit Card', 'Loan'].includes(accountForm.accountType) 
          ? -Math.abs(parseFloat(accountForm.balance))
          : parseFloat(accountForm.balance),
        currency: accountForm.currency,
        notes: accountForm.notes.trim() || null,
        credit_limit: parseFloat(accountForm.creditLimit) || 0,
        user_id: user?.id,
      };

      console.log('Saving account data:', accountData); // Debug log

      let result;
      if (editingAccount) {
        result = await supabase
          .from('bank_accounts')
          .update(accountData)
          .eq('id', editingAccount.id)
          .eq('user_id', user?.id);
      } else {
        result = await supabase
          .from('bank_accounts')
          .insert([accountData])
          .select();
      }

      if (result.error) {
        console.error('Database error:', result.error);
        throw result.error;
      }

      console.log('Account saved successfully:', result.data); // Debug log
      
      await loadAccounts();
      setShowAccountModal(false);
      resetAccountForm();
      
      alert(editingAccount ? 'Account updated successfully!' : 'Account added successfully!');
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Error saving account. Please try again.');
    }
  };

  const handleDeleteAccount = async (account: BankAccount) => {
    if (!confirm(`Are you sure you want to delete ${account.bank_name || account.bankName}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', account.id)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      await loadAccounts();
      alert('Account deleted successfully!');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error deleting account. Please try again.');
    }
  };

  const handleSaveLoan = async () => {
    try {
      if (!loanForm.lenderName.trim()) {
        alert('Lender name is required');
        return;
      }

      if (!loanForm.principalAmount || isNaN(parseFloat(loanForm.principalAmount))) {
        alert('Valid principal amount is required');
        return;
      }

      const principalAmount = parseFloat(loanForm.principalAmount);
      const interestRate = parseFloat(loanForm.interestRate) || 0;
      const termMonths = parseInt(loanForm.termMonths) || null;
      const monthlyPayment = parseFloat(loanForm.monthlyPayment) || null;

      const loanData = {
        lender_name: loanForm.lenderName.trim(),
        loan_type: loanForm.loanType,
        principal_amount: principalAmount,
        interest_rate: interestRate,
        start_date: loanForm.startDate,
        term_months: termMonths,
        monthly_payment: monthlyPayment,
        remaining_balance: principalAmount,
        status: 'Active',
        linked_account_id: loanForm.linkedAccountId || null,
        notes: loanForm.notes.trim() || null,
        user_id: user?.id,
      };

      let result;
      if (editingLoan) {
        result = await supabase
          .from('loans')
          .update(loanData)
          .eq('id', editingLoan.id)
          .eq('user_id', user?.id);
      } else {
        result = await supabase
          .from('loans')
          .insert([loanData])
          .select();

        // If linked to an account, add the loan amount as income and update account balance
        if (loanForm.linkedAccountId && !editingLoan) {
          const account = accounts.find(acc => acc.id === loanForm.linkedAccountId);
          if (account) {
            // Update account balance
            const { error: balanceError } = await supabase
              .from('bank_accounts')
              .update({
                balance: account.balance + principalAmount
              })
              .eq('id', loanForm.linkedAccountId)
              .eq('user_id', user?.id);
            
            if (balanceError) throw balanceError;

            // Add as loan income
            const { error: incomeError } = await supabase
              .from('incomes')
              .insert([{
                date: loanForm.startDate,
                source: `Loan from ${loanForm.lenderName}`,
                amount: principalAmount,
                currency: account.currency,
                frequency: 'One-time',
                notes: `Loan income - ${loanForm.loanType} loan`,
                account_id: loanForm.linkedAccountId,
                is_loan_income: true,
                linked_loan_id: result.data?.[0]?.id,
                settlement_status: 'Not Settled',
                user_id: user?.id,
              }]);
            
            if (incomeError) throw incomeError;
          }
        }
      }

      if (result.error) throw result.error;
      
      await loadLoans();
      await loadAccounts();
      setShowLoanModal(false);
      resetLoanForm();
      
      alert(editingLoan ? 'Loan updated successfully!' : 'Loan added successfully!');
    } catch (error) {
      console.error('Error saving loan:', error);
      alert('Error saving loan. Please try again.');
    }
  };

  const handleDeleteLoan = async (loan: Loan) => {
    if (!confirm(`Are you sure you want to delete the loan from ${loan.lender_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loan.id)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      await loadLoans();
      alert('Loan deleted successfully!');
    } catch (error) {
      console.error('Error deleting loan:', error);
      alert('Error deleting loan. Please try again.');
    }
  };

  const handleLoanRepayment = async (loan: Loan) => {
    const repaymentAmount = prompt(
      `Enter repayment amount for ${loan.lender_name}:\n\nRemaining balance: ${formatCurrency(loan.remaining_balance, 'INR')}`,
      loan.monthly_payment?.toString() || ''
    );
    
    if (!repaymentAmount || isNaN(parseFloat(repaymentAmount))) {
      return;
    }

    const amount = parseFloat(repaymentAmount);
    const newBalance = Math.max(0, loan.remaining_balance - amount);
    const isFullyPaid = newBalance === 0;

    try {
      // Update loan balance
      const { error: loanError } = await supabase
        .from('loans')
        .update({ 
          remaining_balance: newBalance,
          status: isFullyPaid ? 'Closed' : 'Active'
        })
        .eq('id', loan.id)
        .eq('user_id', user?.id);
      
      if (loanError) throw loanError;

      // Add repayment record
      const { error: repaymentError } = await supabase
        .from('loan_repayments')
        .insert([{
          loan_id: loan.id,
          payment_amount: amount,
          payment_date: new Date().toISOString().split('T')[0],
          principal_amount: amount, // Simplified - could be split between principal and interest
          interest_amount: 0,
          notes: `Repayment for ${loan.lender_name}`,
          user_id: user?.id,
        }]);
      
      if (repaymentError) throw repaymentError;

      // Add as expense
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert([{
          date: new Date().toISOString().split('T')[0],
          category: 'Loan Repayment',
          description: `Repayment to ${loan.lender_name}`,
          amount: amount,
          currency: 'INR',
          type: 'Mandatory',
          account_id: loan.linked_account_id,
          payment_status: 'Paid',
          payment_date: new Date().toISOString().split('T')[0],
          user_id: user?.id,
        }]);
      
      if (expenseError) throw expenseError;

      // Update linked account balance if exists
      if (loan.linked_account_id) {
        const account = accounts.find(acc => acc.id === loan.linked_account_id);
        if (account) {
          const { error: balanceError } = await supabase
            .from('bank_accounts')
            .update({
              balance: account.balance - amount
            })
            .eq('id', loan.linked_account_id)
            .eq('user_id', user?.id);
          
          if (balanceError) throw balanceError;
        }
      }

      // If fully paid, update loan income settlement status
      if (isFullyPaid) {
        await supabase
          .from('incomes')
          .update({ settlement_status: 'Settled' })
          .eq('linked_loan_id', loan.id)
          .eq('user_id', user?.id);
      }
      
      await loadLoans();
      await loadAccounts();
      alert(isFullyPaid ? 'Loan fully repaid and closed!' : 'Repayment recorded successfully!');
    } catch (error) {
      console.error('Error processing loan repayment:', error);
      alert('Error processing loan repayment. Please try again.');
    }
  };

  const handleTransfer = async () => {
    try {
      const amount = parseFloat(transferForm.amount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const fromAccount = accounts.find(acc => acc.id === transferForm.fromAccountId);
      
      // Handle both regular accounts and loan accounts
      let toAccount = null;
      let isLoanRepayment = false;
      let targetLoan = null;
      
      if (transferForm.toAccountId) {
        if (transferForm.toAccountId.startsWith('loan-')) {
          // This is a loan repayment
          const loanId = transferForm.toAccountId.replace('loan-', '');
          targetLoan = loans.find(loan => loan.id === loanId);
          isLoanRepayment = true;
        } else {
          // This is a regular account
          toAccount = accounts.find(acc => acc.id === transferForm.toAccountId);
        }
      }

      if (!fromAccount) {
        alert('Please select a source account');
        return;
      }

      // Convert amount to account currencies using currency converter
      const fromConversion = await currencyConverter.convertAmount(
        amount,
        'INR', // Assuming transfer amounts are entered in default currency
        fromAccount.currency
      );
      
      const amountInFromCurrency = fromConversion ? fromConversion.convertedAmount : amount;
      
      // Update source account balance
      const newFromBalance = fromAccount.balance - amountInFromCurrency;
      const { error: fromError } = await supabase
        .from('bank_accounts')
        .update({ balance: newFromBalance })
        .eq('id', fromAccount.id)
        .eq('user_id', user?.id);
      
      if (fromError) throw fromError;

      // If transferring to another account (not external)
      if ((toAccount || isLoanRepayment) && (transferForm.type === 'Self' || transferForm.type === 'Debt Repayment')) {
        if (isLoanRepayment && targetLoan) {
          // Handle loan repayment
          const newBalance = Math.max(0, targetLoan.remaining_balance - amount);
          const isFullyPaid = newBalance === 0;

          // Update loan balance
          const { error: loanError } = await supabase
            .from('loans')
            .update({ 
              remaining_balance: newBalance,
              status: isFullyPaid ? 'Closed' : 'Active'
            })
            .eq('id', targetLoan.id)
            .eq('user_id', user?.id);
          
          if (loanError) throw loanError;

          // Add repayment record
          const { error: repaymentError } = await supabase
            .from('loan_repayments')
            .insert([{
              loan_id: targetLoan.id,
              payment_amount: amount,
              payment_date: new Date().toISOString().split('T')[0],
              principal_amount: amount, // Simplified - could be split between principal and interest
              interest_amount: 0,
              notes: `Transfer repayment for ${targetLoan.lender_name}`,
              user_id: user?.id,
            }]);
          
          if (repaymentError) throw repaymentError;

          // Add as expense
          const { error: expenseError } = await supabase
            .from('expenses')
            .insert([{
              date: new Date().toISOString().split('T')[0],
              category: 'Loan Repayment',
              description: `Transfer repayment to ${targetLoan.lender_name}`,
              amount: amount,
              currency: 'INR',
              type: 'Mandatory',
              account_id: targetLoan.linked_account_id,
              payment_status: 'Paid',
              payment_date: new Date().toISOString().split('T')[0],
              user_id: user?.id,
            }]);
          
          if (expenseError) throw expenseError;

          // If fully paid, update loan income settlement status
          if (isFullyPaid) {
            await supabase
              .from('incomes')
              .update({ settlement_status: 'Settled' })
              .eq('linked_loan_id', targetLoan.id)
              .eq('user_id', user?.id);
          }
        } else if (toAccount) {
        const toConversion = await currencyConverter.convertAmount(
          amount,
          'INR',
          toAccount.currency
        );
        
        const amountInToCurrency = toConversion ? toConversion.convertedAmount : amount;
        const newToBalance = toAccount.balance + amountInToCurrency;
        
        const { error: toError } = await supabase
          .from('bank_accounts')
          .update({ balance: newToBalance })
          .eq('id', toAccount.id)
          .eq('user_id', user?.id);
        
        if (toError) throw toError;
        }
      }

      // Record the transfer
      const { data: transferData, error: transferError } = await supabase
        .from('transfers')
        .insert([{
          from_account_id: fromAccount.id,
          to_account_id: isLoanRepayment ? null : (toAccount?.id || null),
          amount,
          currency: 'INR',
          type: transferForm.type,
          description: isLoanRepayment 
            ? `Loan repayment to ${targetLoan?.lender_name}` 
            : (transferForm.description || null),
          date: new Date().toISOString().split('T')[0],
          user_id: user?.id,
        }])
        .select()
        .single();
      
      if (transferError) throw transferError;
      
      // Store conversion data for the transfer
      if (fromConversion && transferData) {
        await supabase
          .from('transaction_conversions')
          .insert([{
            transaction_id: transferData.id,
            transaction_type: 'transfer',
            original_amount: fromConversion.originalAmount,
            original_currency: fromConversion.originalCurrency,
            converted_amount: fromConversion.convertedAmount,
            converted_currency: fromConversion.convertedCurrency,
            exchange_rate: fromConversion.exchangeRate,
            conversion_date: fromConversion.conversionDate,
          }]);
      }

      // Handle debt repayment to credit cards
      if (transferForm.type === 'Debt Repayment' && toAccount && !isLoanRepayment) {
        const accountType = toAccount.account_type || toAccount.accountType;
        if (accountType === 'Credit Card') {
          // Mark related unpaid expenses as paid
          const { error: expenseUpdateError } = await supabase
            .from('expenses')
            .update({ 
              payment_status: 'Paid',
              payment_date: new Date().toISOString().split('T')[0],
              linked_transfer_id: transferData.id
            })
            .eq('account_id', toAccount.id)
            .eq('payment_status', 'Unpaid')
            .eq('user_id', user?.id);
          
          if (expenseUpdateError) {
            console.error('Error updating expense payment status:', expenseUpdateError);
          }
        }
      }

      await loadAccounts();
      await loadLoans();
      setShowTransferModal(false);
      resetTransferForm();
      alert(isLoanRepayment 
        ? `Loan repayment completed successfully! ${targetLoan && targetLoan.remaining_balance - amount <= 0 ? 'Loan fully paid!' : ''}` 
        : 'Transfer completed successfully!');
    } catch (error) {
      console.error('Error processing transfer:', error);
      alert('Error processing transfer. Please try again.');
    }
  };

  const handleInternationalTransfer = async () => {
    try {
      const amount = parseFloat(internationalTransferForm.amount);
      const exchangeRate = parseFloat(internationalTransferForm.exchangeRate);
      const percentageMarkup = parseFloat(internationalTransferForm.percentageMarkupFee) / 100;
      const fixedMarkupFee = parseFloat(internationalTransferForm.fixedMarkupFee);
      const extraFeeAmount = parseFloat(internationalTransferForm.extraFeeAmount);
      const makeupAmount = parseFloat(internationalTransferForm.makeupAmount);

      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      if (isNaN(exchangeRate) || exchangeRate <= 0) {
        alert('Please enter a valid exchange rate');
        return;
      }

      const fromAccount = accounts.find(acc => acc.id === internationalTransferForm.fromAccountId);
      const toAccount = accounts.find(acc => acc.id === internationalTransferForm.toAccountId);

      if (!fromAccount || !toAccount) {
        alert('Please select both source and destination accounts');
        return;
      }

      // Calculate amounts in different currencies
      const sourceAmount = amount; // Amount entered in source currency
      const convertedAmount = sourceAmount * exchangeRate; // Base converted amount
      const percentageMarkupAmount = convertedAmount * percentageMarkup; // Percentage markup in destination currency
      const totalDestinationAmount = convertedAmount + percentageMarkupAmount + fixedMarkupFee + makeupAmount; // Total in destination currency

      // Calculate extra fee in the selected currency
      let extraFeeInSourceCurrency = 0;
      let extraFeeInDestinationCurrency = 0;
      
      if (extraFeeAmount > 0) {
        if (internationalTransferForm.extraFeeCurrency === 'source') {
          extraFeeInSourceCurrency = extraFeeAmount;
          extraFeeInDestinationCurrency = extraFeeAmount * exchangeRate;
        } else {
          extraFeeInDestinationCurrency = extraFeeAmount;
          extraFeeInSourceCurrency = extraFeeAmount / exchangeRate;
        }
      }

      // Total amount to deduct from source account
      const totalSourceDeduction = sourceAmount + extraFeeInSourceCurrency;

      // Update source account balance
      const newFromBalance = fromAccount.balance - totalSourceDeduction;
      const { error: fromError } = await supabase
        .from('bank_accounts')
        .update({ balance: newFromBalance })
        .eq('id', fromAccount.id)
        .eq('user_id', user?.id);
      
      if (fromError) throw fromError;

      // Update destination account balance
      const newToBalance = toAccount.balance + totalDestinationAmount;
      const { error: toError } = await supabase
        .from('bank_accounts')
        .update({ balance: newToBalance })
        .eq('id', toAccount.id)
        .eq('user_id', user?.id);
      
      if (toError) throw toError;

      // Record the international transfer with detailed breakdown
      const transferDescription = `International transfer: ${formatCurrency(sourceAmount, fromAccount.currency)} → ${formatCurrency(totalDestinationAmount, toAccount.currency)} (Rate: ${exchangeRate})`;
      
      const { data: transferData, error: transferError } = await supabase
        .from('transfers')
        .insert([{
          from_account_id: fromAccount.id,
          to_account_id: toAccount.id,
          amount: sourceAmount,
          currency: fromAccount.currency,
          type: 'Self',
          description: transferDescription,
          date: new Date().toISOString().split('T')[0],
          user_id: user?.id,
        }])
        .select()
        .single();
      
      if (transferError) throw transferError;

      // Store detailed conversion and fee data
      await supabase
        .from('transaction_conversions')
        .insert([{
          transaction_id: transferData.id,
          transaction_type: 'international_transfer',
          original_amount: sourceAmount,
          original_currency: fromAccount.currency,
          converted_amount: totalDestinationAmount,
          converted_currency: toAccount.currency,
          exchange_rate: exchangeRate,
          conversion_date: new Date().toISOString(),
        }]);

      // Record fees as expenses if they exist
      const totalFees = percentageMarkupAmount + fixedMarkupFee + extraFeeInDestinationCurrency;
      if (totalFees > 0) {
        await supabase
          .from('expenses')
          .insert([{
            date: new Date().toISOString().split('T')[0],
            category: 'Bank Fees',
            description: `International transfer fees (${fromAccount.currency} → ${toAccount.currency})`,
            amount: totalFees,
            currency: toAccount.currency,
            type: 'Need',
            account_id: toAccount.id,
            payment_status: 'Paid',
            payment_date: new Date().toISOString().split('T')[0],
            linked_transfer_id: transferData.id,
            user_id: user?.id,
          }]);
      }

      await loadAccounts();
      setShowInternationalTransferModal(false);
      resetInternationalTransferForm();
      
      alert(`International transfer completed successfully!\n\nDeducted: ${formatCurrency(totalSourceDeduction, fromAccount.currency)}\nReceived: ${formatCurrency(totalDestinationAmount, toAccount.currency)}\nExchange Rate: ${exchangeRate}\nTotal Fees: ${formatCurrency(totalFees, toAccount.currency)}`);
    } catch (error) {
      console.error('Error processing international transfer:', error);
      alert('Error processing international transfer. Please try again.');
    }
  };

  const resetAccountForm = () => {
    setAccountForm({
      bankName: '',
      accountType: 'Savings',
      accountNumber: '',
      ifscCode: '',
      balance: '0.00',
      currency: 'USD',
      notes: '',
      creditLimit: '0.00',
    });
    setEditingAccount(null);
  };

  const resetLoanForm = () => {
    setLoanForm({
      lenderName: '',
      loanType: 'Personal',
      principalAmount: '',
      interestRate: '0',
      startDate: new Date().toISOString().split('T')[0],
      termMonths: '',
      monthlyPayment: '',
      linkedAccountId: '',
      notes: '',
    });
    setEditingLoan(null);
  };

  const resetTransferForm = () => {
    setTransferForm({
      fromAccountId: '',
      toAccountId: '',
      amount: '',
      description: '',
      type: 'Self',
    });
  };

  const resetInternationalTransferForm = () => {
    setInternationalTransferForm({
      fromAccountId: '',
      toAccountId: '',
      amount: '',
      description: '',
      exchangeRate: '',
      useCustomRate: false,
      percentageMarkupFee: '0',
      fixedMarkupFee: '0',
      extraFeeAmount: '0',
      extraFeeCurrency: 'source',
      makeupAmount: '0',
    });
  };

  const openEditModal = (account: BankAccount) => {
    setEditingAccount(account);
    setAccountForm({
      bankName: account.bank_name || account.bankName || '',
      accountType: account.account_type || account.accountType || 'Savings',
      accountNumber: account.account_number || account.accountNumber || '',
      ifscCode: account.ifsc_code || account.ifscCode || '',
      balance: Math.abs(account.balance).toString(),
      currency: account.currency || 'USD',
      notes: account.notes || '',
      creditLimit: account.credit_limit?.toString() || account.creditLimit?.toString() || '0.00',
    });
    setShowAccountModal(true);
  };

  const openEditLoanModal = (loan: Loan) => {
    setEditingLoan(loan);
    setLoanForm({
      lenderName: loan.lender_name,
      loanType: loan.loan_type,
      principalAmount: loan.principal_amount.toString(),
      interestRate: loan.interest_rate?.toString() || '0',
      startDate: loan.start_date,
      termMonths: loan.term_months?.toString() || '',
      monthlyPayment: loan.monthly_payment?.toString() || '',
      linkedAccountId: loan.linked_account_id || '',
      notes: loan.notes || '',
    });
    setShowLoanModal(true);
  };

  const accountColumns = [
    {
      key: 'bankName',
      header: 'Bank Name',
      render: (value: string, row: BankAccount) => (
        <div>
          <div className="font-medium">{row.bank_name || row.bankName}</div>
          <div className="text-sm text-gray-500">{row.account_type || row.accountType}</div>
        </div>
      ),
    },
    {
      key: 'accountNumber',
      header: 'Account Number',
      render: (value: string, row: BankAccount) => {
        const accountNum = row.account_number || row.accountNumber;
        return accountNum ? `****${accountNum.slice(-4)}` : 'N/A';
      },
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right' as const,
      render: (value: number, row: BankAccount) => {
        const accountType = row.account_type || row.accountType;
        const isLiability = ['Credit Card', 'Loan'].includes(accountType);
        const displayValue = Math.abs(value);
        const color = isLiability ? 'text-red-600' : 'text-green-600';
        
        return (
          <span className={`font-medium ${color}`}>
            {formatCurrency(displayValue, row.currency)}
          </span>
        );
      },
    },
    {
      key: 'creditLimit',
      header: 'Credit Limit',
      align: 'right' as const,
      render: (value: number, row: BankAccount) => {
        const accountType = row.account_type || row.accountType;
        if (!['Credit Card', 'Loan'].includes(accountType)) return 'N/A';
        const limit = row.credit_limit || row.creditLimit || 0;
        return formatCurrency(limit, row.currency);
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: BankAccount) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Edit}
            onClick={() => openEditModal(row)}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => handleDeleteAccount(row)}
            className="text-red-600 hover:text-red-700"
          />
        </div>
      ),
    },
  ];

  const loanColumns = [
    {
      key: 'lenderName',
      header: 'Lender',
      render: (value: string, row: Loan) => (
        <div>
          <div className="font-medium">{row.lender_name}</div>
          <div className="text-sm text-gray-500">{row.loan_type}</div>
        </div>
      ),
    },
    {
      key: 'principalAmount',
      header: 'Principal Amount',
      align: 'right' as const,
      render: (value: number, row: Loan) => (
        <span className="font-medium">
          {formatCurrency(row.principal_amount, 'INR')}
        </span>
      ),
    },
    {
      key: 'remainingBalance',
      header: 'Remaining Balance',
      align: 'right' as const,
      render: (value: number, row: Loan) => (
        <span className="font-medium text-red-600">
          {formatCurrency(row.remaining_balance, 'INR')}
        </span>
      ),
    },
    {
      key: 'interestRate',
      header: 'Interest Rate',
      align: 'right' as const,
      render: (value: number, row: Loan) => (
        <span>{row.interest_rate ? `${row.interest_rate}%` : 'N/A'}</span>
      ),
    },
    {
      key: 'monthlyPayment',
      header: 'Monthly Payment',
      align: 'right' as const,
      render: (value: number, row: Loan) => (
        <span>{row.monthly_payment ? formatCurrency(row.monthly_payment, 'INR') : 'N/A'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Active' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: Loan) => (
        <div className="flex space-x-2">
          {row.status === 'Active' && (
            <Button
              variant="ghost"
              size="sm"
              icon={DollarSign}
              onClick={() => handleLoanRepayment(row)}
              className="text-green-600 hover:text-green-700"
              title="Make Repayment"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={Edit}
            onClick={() => openEditLoanModal(row)}
            title="Edit Loan"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => handleDeleteLoan(row)}
            className="text-red-600 hover:text-red-700"
            title="Delete Loan"
          />
        </div>
      ),
    },
  ];

  const debtAccounts = accounts.filter(acc => 
    ['Credit Card', 'Loan'].includes(acc.account_type || acc.accountType || '')
  );

  // Create virtual debt accounts for active loans
  const loanDebtAccounts = loans.map(loan => ({
    id: `loan-${loan.id}`,
    bank_name: loan.lender_name,
    account_type: 'Loan',
    balance: -loan.remaining_balance, // Negative to show as debt
    currency: 'INR',
    isLoanAccount: true,
    loanId: loan.id,
    loanData: loan
  }));

  const allDebtAccounts = [...debtAccounts, ...loanDebtAccounts];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bank Accounts</h2>
          <p className="text-gray-600">Manage your bank accounts and transfers</p>
        </div>
        <div className="flex gap-2">
          <Button
            icon={ArrowDownLeft}
            onClick={() => {
              setTransferForm({ ...transferForm, type: 'Self' });
              setShowTransferModal(true);
            }}
            variant="outline"
          >
            Self Transfer
          </Button>
          <Button
            icon={Globe}
            onClick={() => setShowInternationalTransferModal(true)}
            variant="outline"
            disabled={getInternationalAccounts().length === 0}
          >
            International Transfer
          </Button>
          <Button
            icon={CreditCard}
            onClick={() => {
              setTransferForm({ ...transferForm, type: 'Debt Repayment' });
              setShowTransferModal(true);
            }}
            variant="outline"
          >
            Debt Repayment
          </Button>
          <Button
            icon={DollarSign}
            onClick={() => setShowLoanModal(true)}
            variant="outline"
          >
            Add Loan
          </Button>
          <Button
            icon={Archive}
            onClick={() => setShowArchivedLoans(true)}
            variant="outline"
          >
            Archived Loans
          </Button>
          <Button
            icon={Plus}
            onClick={() => setShowAccountModal(true)}
          >
            Add Account
          </Button>
        </div>
      </div>

      {/* Active Loans Section */}
      {loans.length > 0 && (
        <Card title="Active Loans" subtitle="Loans that are currently being repaid">
          <Table
            columns={loanColumns}
            data={loans}
            loading={loading}
          />
        </Card>
      )}

      {/* Accounts Table */}
      <Card title="Bank Accounts" subtitle="All your bank accounts and balances">
        <Table
          columns={accountColumns}
          data={accounts}
          loading={loading}
        />
      </Card>

      {/* Account Modal */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => {
          setShowAccountModal(false);
          resetAccountForm();
        }}
        title={editingAccount ? 'Edit Account' : 'Add New Account'}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Bank Name"
            value={accountForm.bankName}
            onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
            placeholder="Enter bank name"
            required
          />
          
          <Select
            label="Account Type"
            value={accountForm.accountType}
            onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value })}
            options={ACCOUNT_TYPES}
          />
          
          <Input
            label="Account Number"
            value={accountForm.accountNumber}
            onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
            placeholder="Optional"
          />
          
          <Input
            label="IFSC/Routing Code"
            value={accountForm.ifscCode}
            onChange={(e) => setAccountForm({ ...accountForm, ifscCode: e.target.value })}
            placeholder="Optional"
          />
          
          <Input
            label={accountForm.accountType === 'Credit Card' ? 'Outstanding Amount' : 
                   accountForm.accountType === 'Loan' ? 'Loan Amount' : 'Initial Balance'}
            type="number"
            value={accountForm.balance}
            onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
            placeholder="0.00"
            step="0.01"
            required
          />
          
          <Select
            label="Currency"
            value={accountForm.currency}
            onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
            options={CURRENCIES.map(c => ({ value: c.code, label: `${c.name} (${c.symbol})` }))}
          />
          
          {['Credit Card', 'Loan'].includes(accountForm.accountType) && (
            <Input
              label="Credit/Loan Limit"
              type="number"
              value={accountForm.creditLimit}
              onChange={(e) => setAccountForm({ ...accountForm, creditLimit: e.target.value })}
              placeholder="0.00"
              step="0.01"
            />
          )}
        </div>
        
        <div className="mt-4">
          <Input
            label="Notes"
            value={accountForm.notes}
            onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
            placeholder="Optional notes"
          />
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setShowAccountModal(false);
              resetAccountForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveAccount}>
            {editingAccount ? 'Update' : 'Add'} Account
          </Button>
        </div>
      </Modal>

      {/* Loan Modal */}
      <Modal
        isOpen={showLoanModal}
        onClose={() => {
          setShowLoanModal(false);
          resetLoanForm();
        }}
        title={editingLoan ? 'Edit Loan' : 'Add New Loan'}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Lender Name"
            value={loanForm.lenderName}
            onChange={(e) => setLoanForm({ ...loanForm, lenderName: e.target.value })}
            placeholder="Bank name or person"
            required
          />
          
          <Select
            label="Loan Type"
            value={loanForm.loanType}
            onChange={(e) => setLoanForm({ ...loanForm, loanType: e.target.value })}
            options={LOAN_TYPES}
          />
          
          <Input
            label="Principal Amount"
            type="number"
            value={loanForm.principalAmount}
            onChange={(e) => setLoanForm({ ...loanForm, principalAmount: e.target.value })}
            placeholder="0.00"
            step="0.01"
            required
          />
          
          <Input
            label="Interest Rate (%)"
            type="number"
            value={loanForm.interestRate}
            onChange={(e) => setLoanForm({ ...loanForm, interestRate: e.target.value })}
            placeholder="0.00"
            step="0.01"
          />
          
          <Input
            label="Start Date"
            type="date"
            value={loanForm.startDate}
            onChange={(e) => setLoanForm({ ...loanForm, startDate: e.target.value })}
            required
          />
          
          <Input
            label="Term (Months)"
            type="number"
            value={loanForm.termMonths}
            onChange={(e) => setLoanForm({ ...loanForm, termMonths: e.target.value })}
            placeholder="Optional"
          />
          
          <Input
            label="Monthly Payment"
            type="number"
            value={loanForm.monthlyPayment}
            onChange={(e) => setLoanForm({ ...loanForm, monthlyPayment: e.target.value })}
            placeholder="0.00"
            step="0.01"
          />
          
          <Select
            label="Linked Account"
            value={loanForm.linkedAccountId}
            onChange={(e) => setLoanForm({ ...loanForm, linkedAccountId: e.target.value })}
            options={[
              { value: '', label: 'No Account' },
              ...accounts.map(acc => ({
                value: acc.id,
                label: `${acc.bank_name || acc.bankName} (${acc.account_type || acc.accountType})`
              }))
            ]}
          />
        </div>
        
        <div className="mt-4">
          <Input
            label="Notes"
            value={loanForm.notes}
            onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
            placeholder="Optional notes"
          />
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setShowLoanModal(false);
              resetLoanForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveLoan}>
            {editingLoan ? 'Update' : 'Add'} Loan
          </Button>
        </div>
      </Modal>

      {/* International Transfer Modal */}
      <Modal
        isOpen={showInternationalTransferModal}
        onClose={() => {
          setShowInternationalTransferModal(false);
          resetInternationalTransferForm();
        }}
        title="International Transfer"
        size="lg"
      >
        <div className="space-y-6">
          {/* Account Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="From Account"
              value={internationalTransferForm.fromAccountId}
              onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, fromAccountId: e.target.value })}
              options={[
                { value: '', label: 'Select source account' },
                ...accounts.map(acc => ({
                  value: acc.id,
                  label: `${acc.bank_name || acc.bankName} (${acc.currency}) - ${formatCurrency(acc.balance, acc.currency)}`
                }))
              ]}
            />
            
            <Select
              label="To Account"
              value={internationalTransferForm.toAccountId}
              onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, toAccountId: e.target.value })}
              options={[
                { value: '', label: 'Select destination account' },
                ...accounts
                  .filter(acc => acc.id !== internationalTransferForm.fromAccountId)
                  .map(acc => ({
                    value: acc.id,
                    label: `${acc.bank_name || acc.bankName} (${acc.currency}) - ${formatCurrency(acc.balance, acc.currency)}`
                  }))
              ]}
            />
          </div>

          {/* Transfer Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`Transfer Amount ${internationalTransferForm.fromAccountId ? `(${accounts.find(acc => acc.id === internationalTransferForm.fromAccountId)?.currency || ''})` : ''}`}
              type="number"
              value={internationalTransferForm.amount}
              onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, amount: e.target.value })}
              placeholder="0.00"
              step="0.01"
            />
            
            <Input
              label="Description"
              value={internationalTransferForm.description}
              onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>

          {/* Exchange Rate Section */}
          {internationalTransferForm.fromAccountId && internationalTransferForm.toAccountId && 
           isInternationalTransfer(internationalTransferForm.fromAccountId, internationalTransferForm.toAccountId) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Exchange Rate</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="useCustomRate"
                    checked={internationalTransferForm.useCustomRate}
                    onChange={(e) => setInternationalTransferForm({ 
                      ...internationalTransferForm, 
                      useCustomRate: e.target.checked 
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="useCustomRate" className="text-sm font-medium text-blue-900">
                    Use custom exchange rate
                  </label>
                </div>
                
                <Input
                  label={`Exchange Rate (1 ${accounts.find(acc => acc.id === internationalTransferForm.fromAccountId)?.currency} = ? ${accounts.find(acc => acc.id === internationalTransferForm.toAccountId)?.currency})`}
                  type="number"
                  value={internationalTransferForm.exchangeRate}
                  onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, exchangeRate: e.target.value })}
                  placeholder="0.0000"
                  step="0.0001"
                  disabled={!internationalTransferForm.useCustomRate}
                />
                
                {!internationalTransferForm.useCustomRate && (
                  <p className="text-xs text-blue-600">
                    Using current market rate (automatically updated)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Bank Fees Section */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-3">Bank Fees & Charges</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Percentage Markup Fee (%)"
                type="number"
                value={internationalTransferForm.percentageMarkupFee}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, percentageMarkupFee: e.target.value })}
                placeholder="0.00"
                step="0.01"
                helpText="Applied to converted amount"
              />
              
              <Input
                label={`Fixed Markup Fee ${internationalTransferForm.toAccountId ? `(${accounts.find(acc => acc.id === internationalTransferForm.toAccountId)?.currency || ''})` : ''}`}
                type="number"
                value={internationalTransferForm.fixedMarkupFee}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, fixedMarkupFee: e.target.value })}
                placeholder="0.00"
                step="0.01"
                helpText="Fixed fee in destination currency"
              />
            </div>
          </div>

          {/* Extra Fee Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Additional Fees</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Extra Fee Amount"
                type="number"
                value={internationalTransferForm.extraFeeAmount}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, extraFeeAmount: e.target.value })}
                placeholder="0.00"
                step="0.01"
              />
              
              <Select
                label="Extra Fee Currency"
                value={internationalTransferForm.extraFeeCurrency}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, extraFeeCurrency: e.target.value as 'source' | 'destination' })}
                options={[
                  { value: 'source', label: `Source (${accounts.find(acc => acc.id === internationalTransferForm.fromAccountId)?.currency || 'Source'})` },
                  { value: 'destination', label: `Destination (${accounts.find(acc => acc.id === internationalTransferForm.toAccountId)?.currency || 'Destination'})` },
                ]}
              />
            </div>
          </div>

          {/* Makeup Amount Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-3">Buffer Amount</h4>
            <Input
              label={`Make-up Amount ${internationalTransferForm.toAccountId ? `(${accounts.find(acc => acc.id === internationalTransferForm.toAccountId)?.currency || ''})` : ''}`}
              type="number"
              value={internationalTransferForm.makeupAmount}
              onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, makeupAmount: e.target.value })}
              placeholder="0.00"
              step="0.01"
              helpText="Buffer amount to compensate for rate variations"
            />
          </div>

          {/* Transfer Breakdown */}
          {transferBreakdown && transferBreakdown.isValid && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Transfer Breakdown</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Source Amount:</span>
                  <span className="font-medium ml-2">
                    {formatCurrency(transferBreakdown.sourceAmount, transferBreakdown.sourceCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Base Rate:</span>
                  <span className="font-medium ml-2">
                    1 {transferBreakdown.sourceCurrency} = {transferBreakdown.baseExchangeRate} {transferBreakdown.destinationCurrency}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Converted Amount:</span>
                  <span className="font-medium ml-2">
                    {formatCurrency(transferBreakdown.convertedAmount, transferBreakdown.destinationCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Percentage Markup:</span>
                  <span className="font-medium ml-2">
                    {formatCurrency(transferBreakdown.percentageMarkupAmount, transferBreakdown.destinationCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Fixed Markup:</span>
                  <span className="font-medium ml-2">
                    {formatCurrency(transferBreakdown.fixedMarkupFee, transferBreakdown.destinationCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Extra Fee:</span>
                  <span className="font-medium ml-2">
                    {formatCurrency(transferBreakdown.extraFeeConverted, transferBreakdown.destinationCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Buffer Amount:</span>
                  <span className="font-medium ml-2">
                    {formatCurrency(transferBreakdown.bufferAmount, transferBreakdown.destinationCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Total Fees:</span>
                  <span className="font-medium ml-2 text-orange-600">
                    {formatCurrency(transferBreakdown.totalFees, transferBreakdown.destinationCurrency)}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-blue-200">
                  <span className="text-blue-700 font-medium">Final Destination Amount:</span>
                  <span className="font-bold ml-2 text-green-600 text-lg">
                    {formatCurrency(transferBreakdown.totalDestinationAmount, transferBreakdown.destinationCurrency)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {transferBreakdown && !transferBreakdown.isValid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{transferBreakdown.errorMessage}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setShowInternationalTransferModal(false);
              resetInternationalTransferForm();
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleInternationalTransfer}
            disabled={!internationalTransferForm.fromAccountId || !internationalTransferForm.toAccountId || !internationalTransferForm.amount || !internationalTransferForm.exchangeRate}
          >
            Transfer
          </Button>
        </div>
      </Modal>

      {/* Archived Loans Modal */}
      <Modal
        isOpen={showArchivedLoans}
        onClose={() => setShowArchivedLoans(false)}
        title="Archived Loans"
        size="xl"
      >
        <div className="mb-4">
          <p className="text-gray-600">Historical record of all closed/settled loans</p>
        </div>
        <Table
          columns={loanColumns.filter(col => col.key !== 'actions')}
          data={archivedLoans}
          loading={loading}
        />
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          resetTransferForm();
        }}
        title="Transfer Funds"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="From Account"
            value={transferForm.fromAccountId}
            onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
            options={[
              { value: '', label: 'Select account' },
              ...accounts.map(acc => ({
                value: acc.id,
                label: `${acc.bank_name || acc.bankName} (${acc.account_type || acc.accountType}) - ${formatCurrency(acc.balance, acc.currency)}`
              }))
            ]}
          />
          
          <Select
            label="Transfer Type"
            value={transferForm.type}
            onChange={(e) => setTransferForm({ ...transferForm, type: e.target.value as any })}
            options={[
              { value: 'Self', label: 'To My Account' },
              { value: 'External', label: 'To External Account' },
              { value: 'Cash Withdrawal', label: 'Cash Withdrawal' },
              { value: 'Debt Repayment', label: 'Debt Repayment' },
            ]}
          />
          
          {(transferForm.type === 'Self' || transferForm.type === 'Debt Repayment') && (
            <Select
              label={transferForm.type === 'Debt Repayment' ? 'To Debt Account' : 'To Account'}
              value={transferForm.toAccountId}
              onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
              options={[
                { value: '', label: 'Select account' },
                ...(transferForm.type === 'Debt Repayment' ? allDebtAccounts : accounts)
                  .filter(acc => acc.id !== transferForm.fromAccountId)
                  .map(acc => ({
                    value: acc.id,
                    label: `${acc.bank_name || acc.bankName} (${acc.account_type || acc.accountType}) - ${formatCurrency(Math.abs(acc.balance), acc.currency || 'INR')}`
                  }))
              ]}
            />
          )}
          
          <Input
            label="Amount"
            type="number"
            value={transferForm.amount}
            onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
            placeholder="0.00"
            step="0.01"
          />
          
          <Input
            label="Description"
            value={transferForm.description}
            onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
            placeholder="Optional description"
          />
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setShowTransferModal(false);
              resetTransferForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleTransfer}>
            Transfer
          </Button>
        </div>
      </Modal>
    </div>
  );
}