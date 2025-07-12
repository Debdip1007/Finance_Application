import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ArrowUpRight, ArrowDownLeft, Banknote, CreditCard, DollarSign, Archive } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Table from '../ui/Table';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { currencyConverter } from '../../lib/currencyConverter';
import { formatCurrency, CURRENCIES } from '../../lib/currencies';
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
  overheadCost: string;
  overheadType: 'flat' | 'percentage';
  exchangeFee: string;
  manualAdjustment: string;
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
  const { convert } = useExchangeRates();
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
    overheadCost: '0',
    overheadType: 'flat',
    exchangeFee: '0',
    manualAdjustment: '0',
  });

  const [internationalTransferForm, setInternationalTransferForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
    flatTransferFee: '0',
    exchangeRateMarkup: '0',
    manualSettlementAdjustment: '0',
    manualExchangeRate: '',
    useManualRate: false,
  });

  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(null);
  const [calculatedDestinationAmount, setCalculatedDestinationAmount] = useState<number | null>(null);

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

  // Calculate exchange rate and destination amount for international transfers
  useEffect(() => {
    const calculateInternationalTransfer = async () => {
      if (!internationalTransferForm.fromAccountId || !internationalTransferForm.toAccountId || !internationalTransferForm.amount) {
        setCurrentExchangeRate(null);
        setCalculatedDestinationAmount(null);
        return;
      }

      const fromAccount = accounts.find(acc => acc.id === internationalTransferForm.fromAccountId);
      const toAccount = accounts.find(acc => acc.id === internationalTransferForm.toAccountId);
      const amount = parseFloat(internationalTransferForm.amount);

      if (!fromAccount || !toAccount || isNaN(amount) || fromAccount.currency === toAccount.currency) {
        setCurrentExchangeRate(null);
        setCalculatedDestinationAmount(null);
        return;
      }

      try {
        let exchangeRate: number;
        
        if (internationalTransferForm.useManualRate && internationalTransferForm.manualExchangeRate) {
          exchangeRate = parseFloat(internationalTransferForm.manualExchangeRate);
        } else {
          const rateFromConverter = await currencyConverter.getExchangeRate(fromAccount.currency, toAccount.currency);
          exchangeRate = rateFromConverter || 1;
        }

        // Apply exchange rate markup
        const markupPercentage = parseFloat(internationalTransferForm.exchangeRateMarkup) || 0;
        const adjustedRate = exchangeRate * (1 + markupPercentage / 100);

        // Calculate destination amount
        const flatFee = parseFloat(internationalTransferForm.flatTransferFee) || 0;
        const amountAfterFees = amount - flatFee;
        const convertedAmount = amountAfterFees * adjustedRate;
        const manualAdjustment = parseFloat(internationalTransferForm.manualSettlementAdjustment) || 0;
        const finalDestinationAmount = convertedAmount + manualAdjustment;

        setCurrentExchangeRate(adjustedRate);
        setCalculatedDestinationAmount(finalDestinationAmount);
      } catch (error) {
        console.error('Error calculating exchange rate:', error);
        setCurrentExchangeRate(null);
        setCalculatedDestinationAmount(null);
      }
    };

    calculateInternationalTransfer();
  }, [
    internationalTransferForm.fromAccountId,
    internationalTransferForm.toAccountId,
    internationalTransferForm.amount,
    internationalTransferForm.flatTransferFee,
    internationalTransferForm.exchangeRateMarkup,
    internationalTransferForm.manualSettlementAdjustment,
    internationalTransferForm.manualExchangeRate,
    internationalTransferForm.useManualRate,
    accounts
  ]);

  // Check if transfer involves international accounts
  const isInternationalTransfer = () => {
    const fromAccount = accounts.find(acc => acc.id === transferForm.fromAccountId);
    const toAccount = accounts.find(acc => acc.id === transferForm.toAccountId);
    
    if (!fromAccount) return false;
    
    // Check if from account currency differs from app default
    const fromAccountIsInternational = fromAccount.currency !== 'INR';
    
    // Check if to account exists and its currency differs from app default
    const toAccountIsInternational = toAccount && toAccount.currency !== 'INR';
    
    return fromAccountIsInternational || toAccountIsInternational;
  };

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

      // Calculate additional costs for international transfers
      const overheadCost = parseFloat(transferForm.overheadCost) || 0;
      const exchangeFee = parseFloat(transferForm.exchangeFee) || 0;
      const manualAdjustment = parseFloat(transferForm.manualAdjustment) || 0;
      
      let totalOverheadCost = 0;
      if (isInternationalTransfer()) {
        if (transferForm.overheadType === 'percentage') {
          totalOverheadCost = (amount * overheadCost) / 100;
        } else {
          totalOverheadCost = overheadCost;
        }
        totalOverheadCost += exchangeFee;
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
      
      // Calculate total deduction from source account (including overhead costs)
      const totalDeductionFromSource = amountInFromCurrency + (isInternationalTransfer() ? 
        await currencyConverter.convertAmount(totalOverheadCost, 'INR', fromAccount.currency).then(conv => conv?.convertedAmount || totalOverheadCost) : 
        0);
      
      // Update source account balance
      const newFromBalance = fromAccount.balance - totalDeductionFromSource;
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
        
        let amountInToCurrency = toConversion ? toConversion.convertedAmount : amount;
        
        // Apply manual adjustment for international transfers
        if (isInternationalTransfer() && manualAdjustment !== 0) {
          amountInToCurrency += manualAdjustment;
        }
        
        const newToBalance = toAccount.balance + amountInToCurrency;
        
        const { error: toError } = await supabase
          .from('bank_accounts')
          .update({ balance: newToBalance })
          .eq('id', toAccount.id)
          .eq('user_id', user?.id);
        
        if (toError) throw toError;
        }
      }

      // Record overhead costs as separate expense if international transfer
      if (isInternationalTransfer() && totalOverheadCost > 0) {
        const { error: overheadExpenseError } = await supabase
          .from('expenses')
          .insert([{
            date: new Date().toISOString().split('T')[0],
            category: 'Transfer Fees',
            description: `International transfer fees - Overhead: ${formatCurrency(overheadCost, 'INR')} (${transferForm.overheadType}), Exchange fee: ${formatCurrency(exchangeFee, 'INR')}`,
            amount: totalOverheadCost,
            currency: 'INR',
            type: 'Need',
            account_id: fromAccount.id,
            payment_status: 'Paid',
            payment_date: new Date().toISOString().split('T')[0],
            user_id: user?.id,
          }]);
        
        if (overheadExpenseError) throw overheadExpenseError;
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
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const fromAccount = accounts.find(acc => acc.id === internationalTransferForm.fromAccountId);
      const toAccount = accounts.find(acc => acc.id === internationalTransferForm.toAccountId);

      if (!fromAccount || !toAccount) {
        alert('Please select both source and destination accounts');
        return;
      }

      if (fromAccount.currency === toAccount.currency) {
        alert('Both accounts have the same currency. Use regular transfer instead.');
        return;
      }

      if (!currentExchangeRate || calculatedDestinationAmount === null) {
        alert('Unable to calculate exchange rate. Please try again.');
        return;
      }

      const flatFee = parseFloat(internationalTransferForm.flatTransferFee) || 0;
      const manualAdjustment = parseFloat(internationalTransferForm.manualSettlementAdjustment) || 0;
      const markupPercentage = parseFloat(internationalTransferForm.exchangeRateMarkup) || 0;

      // Update source account (deduct amount + flat fee)
      const totalDeduction = amount + flatFee;
      const newFromBalance = fromAccount.balance - totalDeduction;
      const { error: fromError } = await supabase
        .from('bank_accounts')
        .update({ balance: newFromBalance })
        .eq('id', fromAccount.id)
        .eq('user_id', user?.id);
      
      if (fromError) throw fromError;

      // Update destination account
      const newToBalance = toAccount.balance + calculatedDestinationAmount;
      const { error: toError } = await supabase
        .from('bank_accounts')
        .update({ balance: newToBalance })
        .eq('id', toAccount.id)
        .eq('user_id', user?.id);
      
      if (toError) throw toError;

      // Record the transfer with detailed information
      const { data: transferData, error: transferError } = await supabase
        .from('transfers')
        .insert([{
          from_account_id: fromAccount.id,
          to_account_id: toAccount.id,
          amount,
          currency: fromAccount.currency,
          type: 'International',
          description: internationalTransferForm.description || `International transfer from ${fromAccount.currency} to ${toAccount.currency}`,
          date: new Date().toISOString().split('T')[0],
          user_id: user?.id,
        }])
        .select()
        .single();
      
      if (transferError) throw transferError;

      // Store detailed conversion and fee information
      await supabase
        .from('transaction_conversions')
        .insert([{
          transaction_id: transferData.id,
          transaction_type: 'international_transfer',
          original_amount: amount,
          original_currency: fromAccount.currency,
          converted_amount: calculatedDestinationAmount,
          converted_currency: toAccount.currency,
          exchange_rate: currentExchangeRate,
          conversion_date: new Date().toISOString(),
        }]);

      // Record flat transfer fee as expense if applicable
      if (flatFee > 0) {
        await supabase
          .from('expenses')
          .insert([{
            date: new Date().toISOString().split('T')[0],
            category: 'Transfer Fees',
            description: `International transfer flat fee`,
            amount: flatFee,
            currency: fromAccount.currency,
            type: 'Need',
            account_id: fromAccount.id,
            payment_status: 'Paid',
            payment_date: new Date().toISOString().split('T')[0],
            user_id: user?.id,
          }]);
      }

      await loadAccounts();
      setShowInternationalTransferModal(false);
      resetInternationalTransferForm();
      
      alert(`International transfer completed successfully!\n\nTransferred: ${formatCurrency(amount, fromAccount.currency)}\nReceived: ${formatCurrency(calculatedDestinationAmount, toAccount.currency)}\nExchange Rate: 1 ${fromAccount.currency} = ${currentExchangeRate.toFixed(4)} ${toAccount.currency}`);
    } catch (error) {
      console.error('Error processing international transfer:', error);
      alert('Error processing international transfer. Please try again.');
    }
  };

  const resetInternationalTransferForm = () => {
    setInternationalTransferForm({
      fromAccountId: '',
      toAccountId: '',
      amount: '',
      description: '',
      flatTransferFee: '0',
      exchangeRateMarkup: '0',
      manualSettlementAdjustment: '0',
      manualExchangeRate: '',
      useManualRate: false,
    });
    setCurrentExchangeRate(null);
    setCalculatedDestinationAmount(null);
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
      overheadCost: '0',
      overheadType: 'flat',
      exchangeFee: '0',
      manualAdjustment: '0',
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

  // Get accounts with different currencies for international transfers
  const getInternationalAccounts = () => {
    return accounts.filter(acc => acc.currency !== 'INR');
  };

  const getSourceAccount = () => {
    return accounts.find(acc => acc.id === internationalTransferForm.fromAccountId);
  };

  const getDestinationAccount = () => {
    return accounts.find(acc => acc.id === internationalTransferForm.toAccountId);
  };

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
            icon={ArrowUpRight}
            onClick={() => setShowInternationalTransferModal(true)}
            variant="outline"
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <span className="mr-2">🌍</span>
              International Currency Transfer
            </h4>
            <p className="text-sm text-blue-700">
              Transfer funds between accounts with different currencies. All fees and exchange rates will be clearly displayed.
            </p>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount {getSourceAccount() && `(${getSourceAccount()?.currency})`}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={internationalTransferForm.amount}
                  onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {getSourceAccount() && (
                  <div className="absolute right-3 top-2 text-gray-500 font-medium">
                    {getSourceAccount()?.currency}
                  </div>
                )}
              </div>
            </div>

            <Input
              label="Description"
              value={internationalTransferForm.description}
              onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>

          {/* Exchange Rate Section */}
          {getSourceAccount() && getDestinationAccount() && getSourceAccount()?.currency !== getDestinationAccount()?.currency && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Exchange Rate Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useManualRate"
                    checked={internationalTransferForm.useManualRate}
                    onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, useManualRate: e.target.checked })}
                        <div className="flex justify-between">
                          <span>Base Exchange Rate:</span>
                          <span className="font-mono">1 {fromAccount.currency} = {exchangeRate.toFixed(2)} {toAccount.currency}</span>
                        </div>
                        {internationalForm.exchangeRateMarkup > 0 && (
                          <>
                            <div className="flex justify-between text-orange-600">
                              <span>Rate Markup ({internationalForm.exchangeRateMarkup}%):</span>
                              <span className="font-mono">+{(exchangeRate * (internationalForm.exchangeRateMarkup / 100)).toFixed(2)} {toAccount.currency}</span>
                            </div>
                            <div className="flex justify-between font-medium text-blue-600">
                              <span>Final Exchange Rate:</span>
                              <span className="font-mono">1 {fromAccount.currency} = {finalExchangeRate.toFixed(2)} {toAccount.currency}</span>
                            </div>
                          </>
                        )}
                    className="rounded border-gray-300"
                  />
                          <span className="font-mono">{formatCurrency(parseFloat(internationalForm.amount), fromAccount.currency)}</span>
                    Use Manual Exchange Rate
                  </label>
                </div>

                            <span className="font-mono">-{formatCurrency(internationalForm.flatTransferFee, fromAccount.currency)}</span>
                  <Input
                    label={`Manual Rate (1 ${getSourceAccount()?.currency} = ? ${getDestinationAccount()?.currency})`}
                    type="number"
                    value={internationalTransferForm.manualExchangeRate}
                          <span className="font-mono">{formatCurrency(convertedAmount, toAccount.currency)}</span>
                    placeholder="0.0000"
                    step="0.0001"
                  />
                ) : (
                            <span className="font-mono">{internationalForm.manualSettlementAdjustment > 0 ? '+' : ''}{formatCurrency(internationalForm.manualSettlementAdjustment, toAccount.currency)}</span>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Exchange Rate</label>
                    <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                      {currentExchangeRate ? (
                        `1 ${getSourceAccount()?.currency} = ${currentExchangeRate.toFixed(4)} ${getDestinationAccount()?.currency}`
                          <span className="font-mono text-green-600">{formatCurrency(finalDestinationAmount, toAccount.currency)}</span>
                        'Calculating...'
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Exchange Rate Markup (%)"
                type="number"
                value={internationalTransferForm.exchangeRateMarkup}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, exchangeRateMarkup: e.target.value })}
                placeholder="0.00"
                step="0.01"
                helpText="Additional percentage markup over base rate (simulates bank fees)"
              />
            </div>
          )}

          {/* Transfer Costs Section */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-3">Transfer Costs & Adjustments</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={`Flat Transfer Fee ${getSourceAccount() ? `(${getSourceAccount()?.currency})` : ''}`}
                type="number"
                value={internationalTransferForm.flatTransferFee}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, flatTransferFee: e.target.value })}
                placeholder="0.00"
                step="0.01"
                helpText="Fixed fee deducted from source account"
              />

              <Input
                label={`Manual Settlement Adjustment ${getDestinationAccount() ? `(${getDestinationAccount()?.currency})` : ''}`}
                type="number"
                value={internationalTransferForm.manualSettlementAdjustment}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, manualSettlementAdjustment: e.target.value })}
                placeholder="0.00"
                step="0.01"
                helpText="Manual adjustment to final destination amount"
              />
            </div>
          </div>

          {/* Transfer Summary */}
          {getSourceAccount() && getDestinationAccount() && internationalTransferForm.amount && currentExchangeRate && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-3">Transfer Summary</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Amount to Transfer:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(internationalTransferForm.amount), getSourceAccount()?.currency || '')}</span>
                </div>
                
                {parseFloat(internationalTransferForm.flatTransferFee) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Flat Transfer Fee:</span>
                    <span className="font-medium">-{formatCurrency(parseFloat(internationalTransferForm.flatTransferFee), getSourceAccount()?.currency || '')}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Exchange Rate Used:</span>
                  <span className="font-medium">1 {getSourceAccount()?.currency} = {currentExchangeRate.toFixed(4)} {getDestinationAccount()?.currency}</span>
                </div>
                
                {parseFloat(internationalTransferForm.manualSettlementAdjustment) !== 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Manual Adjustment:</span>
                    <span className="font-medium">
                      {parseFloat(internationalTransferForm.manualSettlementAdjustment) > 0 ? '+' : ''}
                      {formatCurrency(parseFloat(internationalTransferForm.manualSettlementAdjustment), getDestinationAccount()?.currency || '')}
                    </span>
                  </div>
                )}
                
                <hr className="border-green-300" />
                
                <div className="flex justify-between font-bold text-green-800">
                  <span>Final Amount Received:</span>
                  <span>{calculatedDestinationAmount !== null ? formatCurrency(calculatedDestinationAmount, getDestinationAccount()?.currency || '') : 'Calculating...'}</span>
                </div>
              </div>
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
            disabled={!getSourceAccount() || !getDestinationAccount() || !internationalTransferForm.amount || !currentExchangeRate}
          >
            Transfer
          </Button>
        </div>
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
          
          {isInternationalTransfer() && (
            <>
              <div className="col-span-2 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                  <span className="mr-2">🌍</span>
                  International Transfer Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-2">
                    <Input
                      label="Transfer Overhead Cost"
                      type="number"
                      value={transferForm.overheadCost}
                      onChange={(e) => setTransferForm({ ...transferForm, overheadCost: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                    />
                    <Select
                      label="Type"
                      value={transferForm.overheadType}
                      onChange={(e) => setTransferForm({ ...transferForm, overheadType: e.target.value as 'flat' | 'percentage' })}
                      options={[
                        { value: 'flat', label: 'Flat Fee' },
                        { value: 'percentage', label: 'Percentage' },
                      ]}
                      className="w-32"
                    />
                  </div>
                  
                  <Input
                    label="Currency Exchange Fee"
                    type="number"
                    value={transferForm.exchangeFee}
                    onChange={(e) => setTransferForm({ ...transferForm, exchangeFee: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                  />
                  
                  <Input
                    label="Manual Settlement Adjustment"
                    type="number"
                    value={transferForm.manualAdjustment}
                    onChange={(e) => setTransferForm({ ...transferForm, manualAdjustment: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    helpText="Adjustment in destination account's currency"
                  />
                </div>
                
                <div className="mt-3 text-sm text-blue-700">
                  <p><strong>Note:</strong> Additional fees will be deducted from the source account and recorded as separate expenses.</p>
                  {transferForm.overheadType === 'percentage' && parseFloat(transferForm.overheadCost) > 0 && (
                    <p className="mt-1">
                      Overhead cost: {((parseFloat(transferForm.amount) || 0) * (parseFloat(transferForm.overheadCost) || 0) / 100).toFixed(2)} INR
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
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