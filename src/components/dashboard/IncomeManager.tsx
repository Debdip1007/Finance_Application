import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, TrendingUp } from 'lucide-react';
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
import { Income, BankAccount } from '../../types';

const FREQUENCY_OPTIONS = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Bi-Weekly', label: 'Bi-Weekly' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Yearly', label: 'Yearly' },
  { value: 'One-time', label: 'One-time' },
];

interface IncomeFormData {
  date: string;
  source: string;
  amount: string;
  currency: string;
  frequency: string;
  notes: string;
  accountId: string;
}

export default function IncomeManager() {
  const { user } = useAuth();
  const { settings } = useCurrencySettings();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  
  const [form, setForm] = useState<IncomeFormData>({
    date: new Date().toISOString().split('T')[0],
    source: '',
    amount: '',
    currency: 'INR',
    frequency: 'Monthly',
    notes: '',
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
      const [{ data: incomesData }, { data: accountsData }] = await Promise.all([
        supabase
          .from('incomes')
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

      console.log('Loaded incomes:', incomesData); // Debug log
      console.log('Loaded accounts for income:', accountsData); // Debug log

      setIncomes(incomesData || []);
      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!form.source.trim()) {
        alert('Income source is required');
        return;
      }

      if (!form.amount || isNaN(parseFloat(form.amount))) {
        alert('Valid amount is required');
        return;
      }

      const originalAmount = parseFloat(form.amount);
      
      // Convert to default currency for storage
      const conversion = await currencyConverter.convertAmount(
        originalAmount,
        form.currency,
        settings.defaultCurrency
      );

      if (!conversion) {
        alert('Unable to convert currency. Please try again.');
        return;
      }

      const incomeData = {
        date: form.date,
        source: form.source.trim(),
        amount: originalAmount,
        currency: form.currency,
        frequency: form.frequency,
        notes: form.notes.trim() || null,
        account_id: form.accountId || null,
        user_id: user?.id,
      };

      console.log('Saving income data:', incomeData); // Debug log

      let savedIncome;
      if (editingIncome) {
        const { error } = await supabase
          .from('incomes')
          .update(incomeData)
          .eq('id', editingIncome.id)
          .eq('user_id', user?.id);
        if (error) throw error;
        savedIncome = { ...editingIncome, ...incomeData };
      } else {
        const { data, error } = await supabase
          .from('incomes')
          .insert([incomeData])
          .select()
          .single();
        if (error) throw error;
        savedIncome = data;

        // Store conversion data
        await supabase
          .from('transaction_conversions')
          .insert([{
            transaction_id: savedIncome.id,
            transaction_type: 'income',
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
            // Convert income to account currency for balance update
            const accountConversion = await currencyConverter.convertAmount(
              originalAmount,
              form.currency,
              account.currency
            );
            
            const balanceUpdate = accountConversion ? accountConversion.convertedAmount : originalAmount;
            
            const { error: balanceError } = await supabase
              .from('bank_accounts')
              .update({
                balance: account.balance + balanceUpdate
              })
              .eq('id', form.accountId)
              .eq('user_id', user?.id);
            if (balanceError) {
              console.error('Error updating account balance:', balanceError);
              // Don't throw here, income was saved successfully
            }
          }
        }
      }

      await loadData();
      setShowModal(false);
      resetForm();
      alert(editingIncome ? 'Income updated successfully!' : 'Income added successfully!');
    } catch (error) {
      console.error('Error saving income:', error);
      alert('Error saving income. Please try again.');
    }
  };

  const handleDelete = async (income: Income) => {
    if (!confirm('Are you sure you want to delete this income record?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('incomes')
        .delete()
        .eq('id', income.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Revert account balance if account is linked
      const accountId = income.account_id || income.accountId;
      if (accountId) {
        const account = accounts.find(acc => acc.id === accountId);
        if (account) {
          // Convert income back to account currency for balance reversion
          const accountConversion = await currencyConverter.convertAmount(
            income.amount,
            income.currency,
            account.currency
          );
          
          const balanceRevert = accountConversion ? accountConversion.convertedAmount : income.amount;
          
          const { error: balanceError } = await supabase
            .from('bank_accounts')
            .update({
              balance: account.balance - balanceRevert
            })
            .eq('id', accountId)
            .eq('user_id', user?.id);
          
          if (balanceError) {
            console.error('Error reverting account balance:', balanceError);
            // Continue with deletion but warn user
            alert('Income deleted but account balance could not be updated. Please check your account balance.');
          }
        }
      }

      // Delete associated conversion records
      await supabase
        .from('transaction_conversions')
        .delete()
        .eq('transaction_id', income.id)
        .eq('transaction_type', 'income');
      await loadData();
      alert('Income deleted successfully!');
    } catch (error) {
      console.error('Error deleting income:', error);
      alert('Error deleting income. Please try again.');
    }
  };

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      source: '',
      amount: '',
      currency: 'USD',
      frequency: 'Monthly',
      notes: '',
      accountId: '',
    });
    setEditingIncome(null);
  };

  const openEditModal = (income: Income) => {
    setEditingIncome(income);
    setForm({
      date: income.date,
      source: income.source,
      amount: income.amount.toString(),
      currency: income.currency,
      frequency: income.frequency,
      notes: income.notes || '',
      accountId: income.accountId || '',
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
      key: 'source',
      header: 'Source',
      render: (value: string, row: Income) => (
        <div>
          <div className="font-medium">{value}</div>
          {row.is_loan_income && (
            <div className="flex items-center mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                row.settlement_status === 'Settled' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                Loan Income - {row.settlement_status || 'Not Settled'}
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
      render: (value: number, row: Income) => (
        <CurrencyDisplay
          originalAmount={value}
          originalCurrency={row.currency}
          showBoth={row.currency !== settings.defaultCurrency}
          className="text-green-600"
        />
      ),
    },
    {
      key: 'frequency',
      header: 'Frequency',
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
      render: (_: any, row: Income) => (
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

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Income Management</h2>
          <p className="text-gray-600">Track your income sources and amounts</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => setShowModal(true)}
        >
          Add Income
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Total Income</h3>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(totalIncome, settings.defaultCurrency)}
            </p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </Card>

      {/* Income Table */}
      <Card>
        <Table
          columns={columns}
          data={incomes}
          loading={loading}
        />
      </Card>

      {/* Income Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingIncome ? 'Edit Income' : 'Add New Income'}
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
            <input
              type="text"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="e.g., Salary, Freelance, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
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
            label="Frequency"
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            options={FREQUENCY_OPTIONS}
          />
          
          <Select
            label="Credit to Account"
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            options={[
              { value: '', label: 'No Account' },
              ...accounts.map(acc => {
                const bankName = acc.bank_name || acc.bankName;
                const accountType = acc.account_type || acc.accountType;
                return {
                  value: acc.id,
                  label: `${bankName} (${accountType})`
                };
              })
            ]}
          />
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional notes"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            {editingIncome ? 'Update' : 'Add'} Income
          </Button>
        </div>
      </Modal>
    </div>
  );
}