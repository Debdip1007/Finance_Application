import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CreditCard, ArrowRightLeft } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Table from '../ui/Table';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useCurrencySettings } from '../../hooks/useCurrencySettings';
import { formatCurrency, CURRENCIES } from '../../lib/currencies';
import { BankAccount } from '../../types';

const ACCOUNT_TYPES = [
  { value: 'Savings', label: 'Savings' },
  { value: 'Checking', label: 'Checking' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Loan', label: 'Loan' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Other', label: 'Other' },
];

const TRANSFER_TYPES = [
  { value: 'Self', label: 'Between My Accounts' },
  { value: 'External', label: 'To External Account' },
  { value: 'Cash Withdrawal', label: 'Cash Withdrawal' },
  { value: 'Debt Repayment', label: 'Debt Repayment' },
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
  currency: string;
  type: string;
  description: string;
  date: string;
}

export default function BankAccountsManager() {
  const { user } = useAuth();
  const { settings } = useCurrencySettings();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  
  const [accountForm, setAccountForm] = useState<AccountFormData>({
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
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    try {
      const accountData = {
        bank_name: accountForm.bankName,
        account_type: accountForm.accountType,
        account_number: accountForm.accountNumber || null,
        ifsc_code: accountForm.ifscCode || null,
        balance: parseFloat(accountForm.balance) || 0,
        currency: accountForm.currency,
        notes: accountForm.notes || null,
        credit_limit: parseFloat(accountForm.creditLimit) || 0,
        user_id: user?.id,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('bank_accounts')
          .update(accountData)
          .eq('id', editingAccount.id);
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
        .eq('id', account.id);

      if (error) throw error;
      await loadAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error deleting account. Please try again.');
    }
  };

  const handleTransfer = async () => {
    try {
      if (!transferForm.fromAccountId || !transferForm.amount) {
        alert('Please fill in all required fields');
        return;
      }

      const amount = parseFloat(transferForm.amount);
      if (amount <= 0) {
        alert('Transfer amount must be greater than zero');
        return;
      }

      const fromAccount = accounts.find(acc => acc.id === transferForm.fromAccountId);
      if (!fromAccount) {
        alert('Source account not found');
        return;
      }

      // Check if sufficient balance for non-credit accounts
      if (!['Credit Card', 'Loan'].includes(fromAccount.account_type || fromAccount.accountType || '') && 
          fromAccount.balance < amount) {
        alert('Insufficient balance in source account');
        return;
      }

      const transferData = {
        from_account_id: transferForm.fromAccountId,
        to_account_id: transferForm.toAccountId || null,
        amount: amount,
        currency: transferForm.currency,
        type: transferForm.type,
        description: transferForm.description || null,
        date: transferForm.date,
        user_id: user?.id,
      };

      const { error } = await supabase
        .from('transfers')
        .insert([transferData]);

      if (error) throw error;

      // Update account balances
      const { error: fromError } = await supabase
        .from('bank_accounts')
        .update({ balance: fromAccount.balance - amount })
        .eq('id', transferForm.fromAccountId);

      if (fromError) throw fromError;

      if (transferForm.toAccountId && transferForm.type === 'Self') {
        const toAccount = accounts.find(acc => acc.id === transferForm.toAccountId);
        if (toAccount) {
          const { error: toError } = await supabase
            .from('bank_accounts')
            .update({ balance: toAccount.balance + amount })
            .eq('id', transferForm.toAccountId);

          if (toError) throw toError;
        }
      }

      await loadAccounts();
      setShowTransferModal(false);
      resetTransferForm();
      alert('Transfer completed successfully!');
    } catch (error) {
      console.error('Error processing transfer:', error);
      alert('Error processing transfer. Please try again.');
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
  };

  const openEditModal = (account: BankAccount) => {
    setEditingAccount(account);
    setAccountForm({
      bankName: account.bank_name || account.bankName || '',
      accountType: account.account_type || account.accountType || 'Savings',
      accountNumber: account.account_number || account.accountNumber || '',
      ifscCode: account.ifsc_code || account.ifscCode || '',
      balance: account.balance.toString(),
      currency: account.currency,
      notes: account.notes || '',
      creditLimit: (account.credit_limit || account.creditLimit || 0).toString(),
    });
    setShowAccountModal(true);
  };

  const columns = [
    {
      key: 'bankName',
      header: 'Bank Name',
      render: (value: string, row: BankAccount) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.bank_name || row.bankName}
          </div>
          <div className="text-sm text-gray-500">
            {row.account_type || row.accountType}
          </div>
        </div>
      ),
    },
    {
      key: 'accountNumber',
      header: 'Account Number',
      render: (value: string, row: BankAccount) => {
        const accountNumber = row.account_number || row.accountNumber;
        return accountNumber ? `****${accountNumber.slice(-4)}` : 'N/A';
      },
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right' as const,
      render: (value: number, row: BankAccount) => {
        const isDebt = ['Credit Card', 'Loan'].includes(row.account_type || row.accountType || '');
        return (
          <span className={`font-medium ${isDebt && value > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(value, row.currency)}
          </span>
        );
      },
    },
    {
      key: 'currency',
      header: 'Currency',
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

  const totalAssets = accounts
    .filter(acc => !['Credit Card', 'Loan'].includes(acc.account_type || acc.accountType || ''))
    .reduce((sum, account) => sum + account.balance, 0);

  const totalLiabilities = accounts
    .filter(acc => ['Credit Card', 'Loan'].includes(acc.account_type || acc.accountType || ''))
    .reduce((sum, account) => sum + Math.abs(account.balance), 0);

  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bank Accounts</h2>
          <p className="text-gray-600">Manage your bank accounts and transfers</p>
        </div>
        <div className="flex gap-3">
          <Button
            icon={ArrowRightLeft}
            onClick={() => setShowTransferModal(true)}
            variant="outline"
          >
            Transfer
          </Button>
          <Button
            icon={Plus}
            onClick={() => setShowAccountModal(true)}
          >
            Add Account
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Assets</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalAssets, settings.defaultCurrency)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Liabilities</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalLiabilities, settings.defaultCurrency)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <CreditCard className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Worth</p>
              <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netWorth, settings.defaultCurrency)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${netWorth >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <CreditCard className={`h-6 w-6 ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </Card>
      </div>

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
        title={editingAccount ? 'Edit Account' : 'Add New Account'}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Bank Name"
            value={accountForm.bankName}
            onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
            placeholder="e.g., Chase Bank"
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
            label="Current Balance"
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
          
          {(accountForm.accountType === 'Credit Card' || accountForm.accountType === 'Loan') && (
            <Input
              label="Credit Limit / Loan Amount"
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

      {/* Transfer Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          resetTransferForm();
        }}
        title="Transfer Money"
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={transferForm.date}
              onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <Select
            label="Transfer Type"
            value={transferForm.type}
            onChange={(e) => setTransferForm({ ...transferForm, type: e.target.value })}
            options={TRANSFER_TYPES}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="From Account"
            value={transferForm.fromAccountId}
            onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
            options={[
              { value: '', label: 'Select account' },
              ...accounts.map(acc => ({
                value: acc.id,
                label: `${acc.bank_name || acc.bankName} (${formatCurrency(acc.balance, acc.currency)})`
              }))
            ]}
          />
          
          {transferForm.type === 'Self' && (
            <Select
              label="To Account"
              value={transferForm.toAccountId}
              onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
              options={[
                { value: '', label: 'Select account' },
                ...accounts
                  .filter(acc => acc.id !== transferForm.fromAccountId)
                  .map(acc => ({
                    value: acc.id,
                    label: `${acc.bank_name || acc.bankName} (${formatCurrency(acc.balance, acc.currency)})`
                  }))
              ]}
            />
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Amount"
            type="number"
            value={transferForm.amount}
            onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
            placeholder="0.00"
            step="0.01"
            required
          />
          
          <Select
            label="Currency"
            value={transferForm.currency}
            onChange={(e) => setTransferForm({ ...transferForm, currency: e.target.value })}
            options={CURRENCIES.map(c => ({ value: c.code, label: `${c.name} (${c.symbol})` }))}
          />
        </div>
        
        <div className="mt-4">
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