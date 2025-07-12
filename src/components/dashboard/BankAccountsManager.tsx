```typescript
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ArrowRightLeft, Banknote, CreditCard, Wallet, Landmark } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Table from '../ui/Table';
import CurrencyInput from '../ui/CurrencyInput';
import CurrencyDisplay from '../ui/CurrencyDisplay';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useCurrencySettings } from '../../hooks/useCurrencySettings';
import { currencyConverter } from '../../lib/currencyConverter';
import { formatCurrency, CURRENCIES } from '../../lib/currencies';
import { BankAccount, Transfer } from '../../types';

const ACCOUNT_TYPES = [
  { value: 'Savings', label: 'Savings Account' },
  { value: 'Checking', label: 'Checking Account' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Loan', label: 'Loan Account' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Other', label: 'Other' },
];

const TRANSFER_TYPES = [
  { value: 'Self', label: 'Self Transfer' },
  { value: 'External', label: 'External Transfer' },
  { value: 'Cash Withdrawal', label: 'Cash Withdrawal' },
  { value: 'Debt Repayment', label: 'Debt Repayment' },
];

interface BankAccountFormData {
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
  currency: string;
  type: string;
  description: string;
  date: string;
}

export function BankAccountsManager() {
  const { user } = useAuth();
  const { settings } = useCurrencySettings();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [saving, setSaving] = useState(false);

  const [accountForm, setAccountForm] = useState<BankAccountFormData>({
    bankName: '',
    accountType: 'Savings',
    accountNumber: '',
    ifscCode: '',
    balance: '0',
    currency: 'INR',
    notes: '',
    creditLimit: '0',
  });

  const [transferForm, setTransferForm] = useState<TransferFormData>({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    currency: 'INR',
    type: 'Self',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('bank_name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
      alert('Error loading accounts. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const validateAccountForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!accountForm.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }
    if (!accountForm.accountType) {
      newErrors.accountType = 'Account type is required';
    }
    if (isNaN(parseFloat(accountForm.balance))) {
      newErrors.balance = 'Valid balance is required';
    }
    if (accountForm.accountType === 'Credit Card' && isNaN(parseFloat(accountForm.creditLimit))) {
      newErrors.creditLimit = 'Valid credit limit is required for credit cards';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAccount = async () => {
    if (!validateAccountForm()) {
      return;
    }

    setSaving(true);
    try {
      const accountData = {
        bank_name: accountForm.bankName.trim(),
        account_type: accountForm.accountType,
        account_number: accountForm.accountNumber.trim() || null,
        ifsc_code: accountForm.ifscCode.trim() || null,
        balance: parseFloat(accountForm.balance),
        currency: accountForm.currency,
        notes: accountForm.notes.trim() || null,
        credit_limit: accountForm.accountType === 'Credit Card' ? parseFloat(accountForm.creditLimit) : null,
        user_id: user?.id,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('bank_accounts')
          .update(accountData)
          .eq('id', editingAccount.id)
          .eq('user_id', user?.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .insert([accountData]);
        if (error) throw error;
      }

      await loadAccounts();
      setShowAccountModal(false);
      resetAccountForm();
      alert(editingAccount ? 'Account updated successfully!' : 'Account added successfully!');
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Error saving account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (account: BankAccount) => {
    if (!confirm(\`Are you sure you want to delete the account "${account.bank_name || account.bankName}"? This cannot be undone.`)) {
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

  const resetAccountForm = () => {
    setAccountForm({
      bankName: '',
      accountType: 'Savings',
      accountNumber: '',
      ifscCode: '',
      balance: '0',
      currency: 'INR',
      notes: '',
      creditLimit: '0',
    });
    setEditingAccount(null);
    setErrors({});
  };

  const openEditAccountModal = (account: BankAccount) => {
    setEditingAccount(account);
    setAccountForm({
      bankName: account.bank_name || account.bankName || '',
      accountType: account.account_type || account.accountType || 'Savings',
      accountNumber: account.account_number || account.accountNumber || '',
      ifscCode: account.ifsc_code || account.ifscCode || '',
      balance: (account.balance ?? 0).toString(),
      currency: account.currency || 'INR',
      notes: account.notes || '',
      creditLimit: (account.credit_limit ?? account.creditLimit ?? 0).toString(),
    });
    setErrors({});
    setShowAccountModal(true);
  };

  const validateTransferForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!transferForm.fromAccountId) {
      newErrors.fromAccountId = 'Source account is required';
    }
    if (!transferForm.toAccountId && transferForm.type !== 'Cash Withdrawal') {
      newErrors.toAccountId = 'Destination account is required';
    }
    if (isNaN(parseFloat(transferForm.amount)) || parseFloat(transferForm.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    if (!transferForm.currency) {
      newErrors.currency = 'Currency is required';
    }
    if (!transferForm.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveTransfer = async () => {
    if (!validateTransferForm()) {
      return;
    }

    setSaving(true);
    try {
      const fromAccount = accounts.find(acc => acc.id === transferForm.fromAccountId);
      const toAccount = accounts.find(acc => acc.id === transferForm.toAccountId);
      const transferAmount = parseFloat(transferForm.amount);

      if (!fromAccount) {
        alert('Source account not found.');
        return;
      }

      // Convert transfer amount to source account currency for debit
      const debitConversion = await currencyConverter.convertAmount(
        transferAmount,
        transferForm.currency,
        fromAccount.currency
      );

      if (!debitConversion) {
        alert('Unable to convert currency for source account. Please try again.');
        return;
      }

      // Update source account balance
      const { error: fromError } = await supabase
        .from('bank_accounts')
        .update({ balance: fromAccount.balance - debitConversion.convertedAmount })
        .eq('id', fromAccount.id)
        .eq('user_id', user?.id);
      if (fromError) throw fromError;

      // Update destination account balance if applicable
      if (toAccount) {
        const creditConversion = await currencyConverter.convertAmount(
          transferAmount,
          transferForm.currency,
          toAccount.currency
        );

        if (!creditConversion) {
          alert('Unable to convert currency for destination account. Please try again.');
          // Revert source account debit if destination update fails
          await supabase.from('bank_accounts').update({ balance: fromAccount.balance }).eq('id', fromAccount.id);
          return;
        }

        const { error: toError } = await supabase
          .from('bank_accounts')
          .update({ balance: toAccount.balance + creditConversion.convertedAmount })
          .eq('id', toAccount.id)
          .eq('user_id', user?.id);
        if (toError) throw toError;
      }

      // Record the transfer
      const transferData: Omit<Transfer, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
        from_account_id: transferForm.fromAccountId,
        to_account_id: transferForm.toAccountId || null,
        amount: transferAmount,
        currency: transferForm.currency,
        type: transferForm.type,
        description: transferForm.description.trim() || null,
        date: transferForm.date,
      };

      const { data: savedTransfer, error: transferError } = await supabase
        .from('transfers')
        .insert([{ ...transferData, user_id: user?.id }])
        .select()
        .single();
      if (transferError) throw transferError;

      // Store conversion data for the transfer
      await supabase
        .from('transaction_conversions')
        .insert([{
          transaction_id: savedTransfer.id,
          transaction_type: 'transfer',
          original_amount: debitConversion.originalAmount,
          original_currency: debitConversion.originalCurrency,
          converted_amount: debitConversion.convertedAmount,
          converted_currency: debitConversion.convertedCurrency,
          exchange_rate: debitConversion.exchangeRate,
          conversion_date: debitConversion.conversionDate,
        }]);

      await loadAccounts();
      setShowTransferModal(false);
      resetTransferForm();
      alert('Transfer recorded successfully!');
    } catch (error) {
      console.error('Error saving transfer:', error);
      alert('Error saving transfer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetTransferForm = () => {
    setTransferForm({
      fromAccountId: '',
      toAccountId: '',
      amount: '',
      currency: 'INR',
      type: 'Self',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setErrors({});
  };

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'Savings':
      case 'Checking':
        return <Landmark className="h-5 w-5 text-blue-600" />;
      case 'Credit Card':
        return <CreditCard className="h-5 w-5 text-purple-600" />;
      case 'Cash':
        return <Wallet className="h-5 w-5 text-green-600" />;
      case 'Loan':
        return <Banknote className="h-5 w-5 text-red-600" />;
      default:
        return <Banknote className="h-5 w-5 text-gray-600" />;
    }
  };

  const columns = [
    {
      key: 'bank_name',
      header: 'Bank Name',
      render: (value: string, row: BankAccount) => (
        <div className="flex items-center">
          {getAccountIcon(row.account_type || row.accountType || '')}
          <div className="ml-3">
            <div className="font-medium text-gray-900">{value || row.bankName}</div>
            <div className="text-sm text-gray-500">{row.account_type || row.accountType}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'account_number',
      header: 'Account Number',
      render: (value: string, row: BankAccount) => (
        <div>
          <div>{value || row.accountNumber || 'N/A'}</div>
          {row.ifsc_code && <div className="text-sm text-gray-500">IFSC: {row.ifsc_code}</div>}
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right' as const,
      render: (value: number, row: BankAccount) => (
        <CurrencyDisplay
          originalAmount={value}
          originalCurrency={row.currency}
          showBoth={row.currency !== settings.defaultCurrency}
          className={value < 0 ? 'text-red-600' : 'text-green-600'}
        />
      ),
    },
    {
      key: 'credit_limit',
      header: 'Credit Limit',
      align: 'right' as const,
      render: (value: number, row: BankAccount) => {
        if ((row.account_type || row.accountType) === 'Credit Card') {
          return (
            <CurrencyDisplay
              originalAmount={value}
              originalCurrency={row.currency}
              showBoth={row.currency !== settings.defaultCurrency}
            />
          );
        }
        return 'N/A';
      },
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (value: string) => value || 'N/A',
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
            onClick={() => openEditAccountModal(row)}
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

  const totalBalance = accounts.reduce((sum, account) => {
    const balance = account.balance ?? 0;
    const converted = currencyConverter.convertAmount(balance, account.currency, settings.defaultCurrency);
    return sum + (converted?.convertedAmount ?? balance);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bank Accounts</h2>
          <p className="text-gray-600">Manage your financial accounts</p>
        </div>
        <div className="flex gap-3">
          <Button
            icon={ArrowRightLeft}
            onClick={() => {
              resetTransferForm();
              setShowTransferModal(true);
            }}
          >
            Transfer Funds
          </Button>
          <Button
            icon={Plus}
            onClick={() => {
              resetAccountForm();
              setShowAccountModal(true);
            }}
          >
            Add Account
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Total Balance</h3>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(totalBalance, settings.defaultCurrency)}
            </p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <Banknote className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </Card>

      {/* Accounts Table */}
      <Card>
        <Table
          columns={columns}
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
        title={editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Bank Name"
            value={accountForm.bankName}
            onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
            placeholder="e.g., State Bank of India"
            required
            error={errors.bankName}
          />
          <Select
            label="Account Type"
            value={accountForm.accountType}
            onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value })}
            options={ACCOUNT_TYPES}
            error={errors.accountType}
          />
          <Input
            label="Account Number"
            value={accountForm.accountNumber}
            onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
            placeholder="Optional"
          />
          <Input
            label="IFSC Code"
            value={accountForm.ifscCode}
            onChange={(e) => setAccountForm({ ...accountForm, ifscCode: e.target.value })}
            placeholder="Optional"
          />
          <CurrencyInput
            label="Current Balance"
            amount={accountForm.balance}
            currency={accountForm.currency}
            onAmountChange={(amount) => setAccountForm({ ...accountForm, balance: amount })}
            onCurrencyChange={(currency) => setAccountForm({ ...accountForm, currency })}
            required
            showConversion={false}
          />
          {accountForm.accountType === 'Credit Card' && (
            <Input
              label="Credit Limit"
              type="number"
              value={accountForm.creditLimit}
              onChange={(e) => setAccountForm({ ...accountForm, creditLimit: e.target.value })}
              placeholder="0"
              step="0.01"
              required
              error={errors.creditLimit}
            />
          )}
        </div>
        <div className="mt-4">
          <Input
            label="Notes"
            value={accountForm.notes}
            onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
            placeholder="Optional notes about this account"
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
          <Button
            onClick={handleSaveAccount}
            loading={saving}
          >
            {editingAccount ? 'Update' : 'Add'} Account
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
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="From Account"
            value={transferForm.fromAccountId}
            onChange={(e) => {
              const selectedAccount = accounts.find(acc => acc.id === e.target.value);
              setTransferForm({
                ...transferForm,
                fromAccountId: e.target.value,
                currency: selectedAccount ? selectedAccount.currency : 'INR',
              });
            }}
            options={[
              { value: '', label: 'Select source account' },
              ...accounts.map(acc => ({
                value: acc.id,
                label: \`${acc.bank_name || acc.bankName} (${acc.account_type || acc.accountType}) - ${formatCurrency(acc.balance, acc.currency)}`
              }))
            ]}
            error={errors.fromAccountId}
          />
          <Select
            label="To Account"
            value={transferForm.toAccountId}
            onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
            options={[
              { value: '', label: 'Select destination account' },
              ...accounts.map(acc => ({
                value: acc.id,
                label: \`${acc.bank_name || acc.bankName} (${acc.account_type || acc.accountType}) - ${formatCurrency(acc.balance, acc.currency)}`
              }))
            ]}
            error={errors.toAccountId}
            disabled={transferForm.type === 'Cash Withdrawal'}
          />
          <CurrencyInput
            label="Amount"
            amount={transferForm.amount}
            currency={transferForm.currency}
            onAmountChange={(amount) => setTransferForm({ ...transferForm, amount })}
            onCurrencyChange={(currency) => setTransferForm({ ...transferForm, currency })}
            required
            showConversion={true}
            placeholder="0.00"
          />
          <Select
            label="Transfer Type"
            value={transferForm.type}
            onChange={(e) => setTransferForm({ ...transferForm, type: e.target.value })}
            options={TRANSFER_TYPES}
          />
          <Input
            label="Date"
            type="date"
            value={transferForm.date}
            onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
            required
            error={errors.date}
          />
        </div>
        <div className="mt-4">
          <Input
            label="Description"
            value={transferForm.description}
            onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
            placeholder="Optional description for the transfer"
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
          <Button
            onClick={handleSaveTransfer}
            loading={saving}
          >
            Record Transfer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
```