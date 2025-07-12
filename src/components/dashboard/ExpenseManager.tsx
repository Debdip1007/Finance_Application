import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, TrendingDown } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import CurrencyInput from '../ui/CurrencyInput';
import CurrencyDisplay from '../ui/CurrencyDisplay';
import Select from '../ui/Select';
import Table from '../ui/Table';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useCurrencySettings } from '../../hooks/useCurrencySettings';
import { currencyConverter } from '../../lib/currencyConverter';
import { formatCurrency } from '../../lib/currencies';
import { Expense, BankAccount } from '../../types';

const EXPENSE_TYPES = [
  { value: 'Mandatory', label: 'Mandatory' },
  { value: 'Need', label: 'Need' },
  { value: 'Want', label: 'Want' },
];

const EXPENSE_CATEGORIES = [
  'Rent/Mortgage',
  'Groceries',
  'Utilities',
  'Transportation',
  'Dining Out',
  'Entertainment',
  'Shopping',
  'Education',
  'Healthcare',
  'Insurance',
  'Travel',
  'Hobbies',
  'Subscriptions',
  'Personal Care',
  'Gifts/Donations',
  'Other'
];

interface ExpenseFormData {
  date: string;
  category: string;
  description: string;
  amount: string;
  currency: string;
  type: string;
  accountId: string;
}

export default function ExpenseManager() {
  const { user } = useAuth();
  const { settings } = useCurrencySettings();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const [form, setForm] = useState<ExpenseFormData>({
    date: new Date().toISOString().split('T')[0],
    category: 'Other',
    description: '',
    amount: '',
    currency: 'INR',
    type: 'Need',
    accountId: '',
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: expensesData }, { data: accountsData }] = await Promise.all([
        supabase
          .from('expenses')
          .select(`
            *,
            bank_accounts(bank_name, account_type, currency)
          `)
          .eq('user_id', user?.id)
          .order('date', { ascending: false }),
        supabase
          .from('bank_accounts')
          .select('*')
          .eq('user_id', user?.id)
          .order('bank_name'),
      ]);

      setExpenses(expensesData || []);
      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const originalAmount = parseFloat(form.amount);
      
      // Convert to default currency for calculations
      const conversion = await currencyConverter.convertAmount(
        originalAmount,
        form.currency,
        settings.defaultCurrency
      );

      if (!conversion) {
        alert('Unable to convert currency. Please try again.');
        return;
      }

      const expenseData = {
        date: form.date,
        category: form.category,
        description: form.description || null,
        amount: originalAmount,
        currency: form.currency,
        type: form.type,
        payment_status: form.accountId ? 'Unpaid' : null,
        account_id: form.accountId || null,
        is_repayment_transfer: false,
        user_id: user?.id,
      };

      let savedExpense;
      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);
        if (error) throw error;
        savedExpense = { ...editingExpense, ...expenseData };
      } else {
        const { data, error } = await supabase
          .from('expenses')
          .insert([expenseData])
          .select()
          .single();
        if (error) throw error;
        savedExpense = data;

        // Store conversion data
        await supabase
          .from('transaction_conversions')
          .insert([{
            transaction_id: savedExpense.id,
            transaction_type: 'expense',
            original_amount: conversion.originalAmount,
            original_currency: conversion.originalCurrency,
            converted_amount: conversion.convertedAmount,
            converted_currency: conversion.convertedCurrency,
            exchange_rate: conversion.exchangeRate,
            conversion_date: conversion.conversionDate,
          }]);

        // Update account balance if account is selected
        if (form.accountId) {
          const account = accounts.find(acc => acc.id === form.accountId);
          if (account) {
            // Convert expense to account currency for balance update
            const accountConversion = await currencyConverter.convertAmount(
              originalAmount,
              form.currency,
              account.currency
            );
            
            const balanceUpdate = accountConversion ? accountConversion.convertedAmount : originalAmount;
            
            const { error: balanceError } = await supabase
              .from('bank_accounts')
              .update({
                balance: account.balance - balanceUpdate
              })
              .eq('id', form.accountId);
            if (balanceError) throw balanceError;
          }
        }
      }

      await loadData();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error saving expense. Please try again.');
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!confirm('Are you sure you want to delete this expense record?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id);

      if (error) throw error;

      // Revert account balance if account is linked
      const accountId = expense.account_id || expense.accountId;
      if (accountId) {
        const account = accounts.find(acc => acc.id === accountId);
        if (account) {
          // Convert expense back to account currency for balance reversion
          const accountConversion = await currencyConverter.convertAmount(
            expense.amount,
            expense.currency,
            account.currency
          );
          
          const balanceRevert = accountConversion ? accountConversion.convertedAmount : expense.amount;
          
          const { error: balanceError } = await supabase
            .from('bank_accounts')
            .update({
              balance: account.balance + balanceRevert
            })
            .eq('id', accountId)
            .eq('user_id', user?.id);
          
          if (balanceError) {
            console.error('Error reverting account balance:', balanceError);
            // Continue with deletion but warn user
            alert('Expense deleted but account balance could not be updated. Please check your account balance.');
          }
        }
      }

      // Delete associated conversion records
      await supabase
        .from('transaction_conversions')
        .delete()
        .eq('transaction_id', expense.id)
        .eq('transaction_type', 'expense');
      await loadData();
      alert('Expense deleted successfully!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Error deleting expense. Please try again.');
    }
  };

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      category: 'Other',
      description: '',
      amount: '',
      currency: 'USD',
      type: 'Need',
      accountId: '',
    });
    setEditingExpense(null);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      date: expense.date,
      category: expense.category,
      description: expense.description || '',
      amount: expense.amount.toString(),
      currency: expense.currency,
      type: expense.type,
      accountId: expense.accountId || '',
    });
    setShowModal(true);
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'category',
      header: 'Category',
    },
    {
      key: 'description',
      header: 'Description',
      render: (value: string, row: Expense) => (
        <div>
          <div>{value || 'N/A'}</div>
          {row.payment_status && (
            <div className="flex items-center mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                row.payment_status === 'Paid' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {row.payment_status}
                {row.payment_date && row.payment_status === 'Paid' && (
                  <span className="ml-1">({new Date(row.payment_date).toLocaleDateString()})</span>
                )}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right' as const,
      render: (value: number, row: Expense) => (
        <CurrencyDisplay
          originalAmount={value}
          originalCurrency={row.currency}
          showBoth={row.currency !== settings.defaultCurrency}
          className="text-red-600"
        />
      ),
    },
    {
      key: 'type',
      header: 'Type',
    },
    {
      key: 'accountId',
      header: 'Account',
      render: (value: string) => {
        if (!value) return 'No Account';
        const account = accounts.find(acc => acc.id === value);
        if (account) {
          const bankName = account.bank_name || account.bankName;
          const accountType = account.account_type || account.accountType;
          return (
            <div>
              <div className="font-medium">{bankName}</div>
              <div className="text-sm text-gray-500">{accountType}</div>
            </div>
          );
        }
        return 'Unknown Account';
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: Expense) => (
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
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-700"
          />
        </div>
      ),
    },
  ];

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expense Management</h2>
          <p className="text-gray-600">Track your expenses and spending patterns</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => setShowModal(true)}
        >
          Add Expense
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Total Expenses</h3>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(totalExpenses, settings.defaultCurrency)}
            </p>
          </div>
          <div className="p-3 bg-red-100 rounded-full">
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </Card>

      {/* Expenses Table */}
      <Card>
        <Table
          columns={columns}
          data={expenses}
          loading={loading}
        />
      </Card>

      {/* Expense Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={EXPENSE_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <CurrencyInput
          label="Amount"
          amount={form.amount}
          currency={form.currency}
          onAmountChange={(amount) => setForm({ ...form, amount })}
          onCurrencyChange={(currency) => setForm({ ...form, currency })}
          required
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={EXPENSE_TYPES}
          />
          
          <Select
            label="Debit from Account"
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            options={[
              { value: '', label: 'No Account' },
              ...accounts.map(acc => ({
                value: acc.id,
                label: `${acc.bank_name || acc.bankName} (${acc.account_type || acc.accountType})`
              }))
            ]}
          />
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editingExpense ? 'Update' : 'Add'} Expense
          </Button>
        </div>
      </Modal>
    </div>
  );
}