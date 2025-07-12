import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, TrendingUp, DollarSign, BarChart3, PieChart } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Table from '../ui/Table';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useCurrencySettings } from '../../hooks/useCurrencySettings';
import { currencyConverter } from '../../lib/currencyConverter';
import { formatCurrency, CURRENCIES } from '../../lib/currencies';
import { Investment, BankAccount } from '../../types';

const INVESTMENT_TYPES = [
  'Stocks',
  'Bonds',
  'Mutual Funds',
  'ETFs',
  'Real Estate',
  'Cryptocurrency',
  'Fixed Deposits',
  'Savings Account',
  'Gold',
  'Commodities',
  'Other'
];

const INVESTMENT_STATUS = [
  { value: 'Active', label: 'Active' },
  { value: 'Liquidated', label: 'Liquidated' },
];

interface InvestmentFormData {
  date: string;
  type: string;
  name: string;
  originalAmount: string;
  currency: string;
  currentValue: string;
  totalInvested: string;
  realizedGain: string;
  notes: string;
  linkedAccountId: string;
  status: string;
  liquidationDate: string;
}

export default function InvestmentManager() {
  const { user } = useAuth();
  const { settings } = useCurrencySettings();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<InvestmentFormData>({
    date: new Date().toISOString().split('T')[0],
    type: 'Stocks',
    name: '',
    originalAmount: '',
    currency: 'INR',
    currentValue: '',
    totalInvested: '',
    realizedGain: '0',
    notes: '',
    linkedAccountId: '',
    status: 'Active',
    liquidationDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: investmentsData, error: investmentsError }, { data: accountsData, error: accountsError }] = await Promise.all([
        supabase
          .from('investments')
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

      if (investmentsError) {
        console.error('Error loading investments:', investmentsError);
        throw investmentsError;
      }

      if (accountsError) {
        console.error('Error loading accounts:', accountsError);
        throw accountsError;
      }

      console.log('Loaded investments:', investmentsData); // Debug log
      console.log('Loaded accounts for investments:', accountsData); // Debug log

      setInvestments(investmentsData || []);
      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Investment name is required';
    }

    if (!form.originalAmount || isNaN(parseFloat(form.originalAmount)) || parseFloat(form.originalAmount) <= 0) {
      newErrors.originalAmount = 'Valid original amount is required';
    }

    if (!form.currentValue || isNaN(parseFloat(form.currentValue)) || parseFloat(form.currentValue) < 0) {
      newErrors.currentValue = 'Valid current value is required';
    }

    if (!form.totalInvested || isNaN(parseFloat(form.totalInvested)) || parseFloat(form.totalInvested) <= 0) {
      newErrors.totalInvested = 'Valid total invested amount is required';
    }

    const realizedGain = parseFloat(form.realizedGain);
    if (isNaN(realizedGain)) {
      newErrors.realizedGain = 'Realized gain must be a valid number';
    }

    if (!form.date) {
      newErrors.date = 'Investment date is required';
    }

    if (form.status === 'Liquidated' && !form.liquidationDate) {
      newErrors.liquidationDate = 'Liquidation date is required for liquidated investments';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const originalAmount = parseFloat(form.originalAmount);
      const currentValue = parseFloat(form.currentValue);
      const totalInvested = parseFloat(form.totalInvested);
      const realizedGain = parseFloat(form.realizedGain);

      // Convert amounts to default currency for storage
      const originalConversion = await currencyConverter.convertAmount(
        originalAmount,
        form.currency,
        settings.defaultCurrency
      );

      const currentConversion = await currencyConverter.convertAmount(
        currentValue,
        form.currency,
        settings.defaultCurrency
      );

      if (!originalConversion || !currentConversion) {
        alert('Unable to convert currency. Please try again.');
        return;
      }

      const investmentData = {
        date: form.date,
        type: form.type,
        name: form.name.trim(),
        original_amount: originalAmount,
        currency: form.currency,
        current_value: currentValue,
        total_invested: totalInvested,
        realized_gain: realizedGain,
        notes: form.notes.trim() || null,
        linked_account_id: form.linkedAccountId || null,
        status: form.status,
        liquidation_date: form.liquidationDate || null,
        user_id: user?.id,
      };

      console.log('Saving investment data:', investmentData); // Debug log

      let savedInvestment;
      if (editingInvestment) {
        const { data, error } = await supabase
          .from('investments')
          .update(investmentData)
          .eq('id', editingInvestment.id)
          .eq('user_id', user?.id)
          .select()
          .single();
        
        if (error) throw error;
        savedInvestment = data;
      } else {
        const { data, error } = await supabase
          .from('investments')
          .insert([investmentData])
          .select()
          .single();
        
        if (error) throw error;
        savedInvestment = data;

        // Store conversion data
        await supabase
          .from('transaction_conversions')
          .insert([{
            transaction_id: savedInvestment.id,
            transaction_type: 'investment',
            original_amount: originalConversion.originalAmount,
            original_currency: originalConversion.originalCurrency,
            converted_amount: originalConversion.convertedAmount,
            converted_currency: originalConversion.convertedCurrency,
            exchange_rate: originalConversion.exchangeRate,
            conversion_date: originalConversion.conversionDate,
          }]);

        // Update account balance if account is selected
        if (form.linkedAccountId) {
          const account = accounts.find(acc => acc.id === form.linkedAccountId);
          if (account) {
            // Convert investment to account currency for balance update
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
              .eq('id', form.linkedAccountId)
              .eq('user_id', user?.id);
            
            if (balanceError) {
              console.error('Error updating account balance:', balanceError);
              // Don't throw here, investment was saved successfully
            }
          }
        }
      }

      await loadData();
      setShowModal(false);
      resetForm();
      alert(editingInvestment ? 'Investment updated successfully!' : 'Investment added successfully!');
    } catch (error) {
      console.error('Error saving investment:', error);
      alert('Error saving investment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (investment: Investment) => {
    if (!confirm(`Are you sure you want to delete the investment "${investment.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investment.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Revert account balance if account is linked
      const accountId = investment.linked_account_id || investment.linkedAccountId;
      if (accountId) {
        const account = accounts.find(acc => acc.id === accountId);
        if (account) {
          // Convert investment back to account currency for balance reversion
          const accountConversion = await currencyConverter.convertAmount(
            (investment.original_amount ?? investment.originalAmount) ?? 0,
            investment.currency || 'INR',
            account.currency || 'INR'
          );
          
          const balanceRevert = accountConversion ? accountConversion.convertedAmount : ((investment.original_amount ?? investment.originalAmount) ?? 0);
          
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
            alert('Investment deleted but account balance could not be updated. Please check your account balance.');
          }
        }
      }

      // Delete associated conversion records
      await supabase
        .from('transaction_conversions')
        .delete()
        .eq('transaction_id', investment.id)
        .eq('transaction_type', 'investment');
      
      await loadData();
      alert('Investment deleted successfully!');
    } catch (error) {
      console.error('Error deleting investment:', error);
      alert('Error deleting investment. Please try again.');
    }
  };

  const liquidateInvestment = async (investment: Investment) => {
    const liquidationValue = prompt('Enter liquidation value:', investment.current_value?.toString() || investment.currentValue?.toString());
    if (!liquidationValue || isNaN(parseFloat(liquidationValue))) {
      return;
    }

    try {
      const { error } = await supabase
        .from('investments')
        .update({ 
          status: 'Liquidated',
          liquidation_date: new Date().toISOString().split('T')[0],
          current_value: parseFloat(liquidationValue),
          realized_gain: parseFloat(liquidationValue) - ((investment.total_invested ?? investment.totalInvested) ?? 0)
        })
        .eq('id', investment.id)
        .eq('user_id', user?.id);

      if (error) throw error;
      await loadData();
      alert('Investment liquidated successfully!');
    } catch (error) {
      console.error('Error liquidating investment:', error);
      alert('Error liquidating investment. Please try again.');
    }
  };

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      type: 'Stocks',
      name: '',
      originalAmount: '',
      currency: 'INR',
      currentValue: '',
      totalInvested: '',
      realizedGain: '0',
      notes: '',
      linkedAccountId: '',
      status: 'Active',
      liquidationDate: '',
    });
    setEditingInvestment(null);
    setErrors({});
  };

  const openEditModal = (investment: Investment) => {
    setEditingInvestment(investment);
    setForm({
      date: investment.date,
      type: investment.type,
      name: investment.name,
      originalAmount: ((investment.original_amount ?? investment.originalAmount) ?? 0).toString(),
      currency: investment.currency,
      currentValue: ((investment.current_value ?? investment.currentValue) ?? 0).toString(),
      totalInvested: ((investment.total_invested ?? investment.totalInvested) ?? 0).toString(),
      realizedGain: ((investment.realized_gain ?? investment.realizedGain) ?? 0).toString(),
      notes: investment.notes || '',
      linkedAccountId: investment.linked_account_id || investment.linkedAccountId || '',
      status: investment.status,
      liquidationDate: investment.liquidation_date || investment.liquidationDate || '',
    });
    setErrors({});
    setShowModal(true);
  };

  const calculateGainLoss = (investment: Investment) => {
    const currentValue = (investment.current_value ?? investment.currentValue) ?? 0;
    const totalInvested = (investment.total_invested ?? investment.totalInvested) ?? 0;
    const realizedGain = (investment.realized_gain ?? investment.realizedGain) ?? 0;
    
    return currentValue - totalInvested + realizedGain;
  };

  const calculateGainLossPercentage = (investment: Investment) => {
    const totalInvested = (investment.total_invested ?? investment.totalInvested) ?? 0;
    if (totalInvested === 0) return 0;
    
    const gainLoss = calculateGainLoss(investment);
    return (gainLoss / totalInvested) * 100;
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'type',
      header: 'Type',
    },
    {
      key: 'name',
      header: 'Name',
      render: (value: string, row: Investment) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.type}</div>
        </div>
      ),
    },
    {
      key: 'originalAmount',
      header: 'Original Amount',
      align: 'right' as const,
      render: (value: number, row: Investment) => (
        <span className="font-medium">
          {formatCurrency((row.original_amount ?? row.originalAmount) ?? 0, row.currency || 'INR')}
        </span>
      ),
    },
    {
      key: 'currentValue',
      header: 'Current Value',
      align: 'right' as const,
      render: (value: number, row: Investment) => (
        <span className="font-medium text-blue-600">
          {formatCurrency((row.current_value ?? row.currentValue) ?? 0, row.currency || 'INR')}
        </span>
      ),
    },
    {
      key: 'gainLoss',
      header: 'Gain/Loss',
      align: 'right' as const,
      render: (_: any, row: Investment) => {
        const gainLoss = calculateGainLoss(row);
        const percentage = calculateGainLossPercentage(row);
        const isPositive = gainLoss >= 0;
        
        return (
          <div className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <div>{formatCurrency(gainLoss, row.currency || 'INR')}</div>
            <div className="text-xs">
              {isPositive ? '+' : ''}{percentage.toFixed(2)}%
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'linkedAccountId',
      header: 'Linked Account',
      render: (value: string, row: Investment) => {
        const accountId = row.linked_account_id || row.linkedAccountId;
        if (!accountId) return 'No Account';
        const account = accounts.find(acc => acc.id === accountId);
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
      render: (_: any, row: Investment) => (
        <div className="flex space-x-2">
          {row.status === 'Active' && (
            <Button
              variant="ghost"
              size="sm"
              icon={DollarSign}
              onClick={() => liquidateInvestment(row)}
              className="text-orange-600 hover:text-orange-700"
              title="Liquidate Investment"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={Edit}
            onClick={() => openEditModal(row)}
            title="Edit Investment"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-700"
            title="Delete Investment"
          />
        </div>
      ),
    },
  ];

  const activeInvestments = investments.filter(inv => inv.status === 'Active');
  const totalInvestments = activeInvestments.reduce((sum, investment) => 
    sum + ((investment.current_value ?? investment.currentValue) ?? 0), 0
  );
  const totalInvested = activeInvestments.reduce((sum, investment) => 
    sum + ((investment.total_invested ?? investment.totalInvested) ?? 0), 0
  );
  const totalGains = activeInvestments.reduce((sum, investment) => {
    const gain = calculateGainLoss(investment);
    return sum + gain;
  }, 0);
  const totalGainPercentage = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Investment Management</h2>
          <p className="text-gray-600">Track your investments and portfolio performance</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          Add Investment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalInvestments, settings.defaultCurrency)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invested</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(totalInvested, settings.defaultCurrency)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Gains/Losses</p>
              <p className={`text-2xl font-bold ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalGains, settings.defaultCurrency)}
              </p>
              <p className={`text-sm ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalGains >= 0 ? '+' : ''}{totalGainPercentage.toFixed(2)}%
              </p>
            </div>
            <div className={`p-3 rounded-full ${totalGains >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <BarChart3 className={`h-6 w-6 ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Investments</p>
              <p className="text-2xl font-bold text-indigo-600">
                {activeInvestments.length}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <PieChart className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Investments Table */}
      <Card>
        <Table
          columns={columns}
          data={investments}
          loading={loading}
        />
      </Card>

      {/* Investment Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingInvestment ? 'Edit Investment' : 'Add New Investment'}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            error={errors.date}
          />
          
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={INVESTMENT_TYPES.map(type => ({ value: type, label: type }))}
          />
          
          <Input
            label="Investment Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Apple Inc., S&P 500 ETF"
            required
            error={errors.name}
          />
          
          <Input
            label="Original Amount"
            type="number"
            value={form.originalAmount}
            onChange={(e) => setForm({ ...form, originalAmount: e.target.value })}
            placeholder="0.00"
            step="0.01"
            required
            error={errors.originalAmount}
          />
          
          <Select
            label="Currency"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            options={CURRENCIES.map(c => ({ value: c.code, label: `${c.name} (${c.symbol})` }))}
          />
          
          <Input
            label="Current Value"
            type="number"
            value={form.currentValue}
            onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
            placeholder="0.00"
            step="0.01"
            required
            error={errors.currentValue}
          />
          
          <Input
            label="Total Invested"
            type="number"
            value={form.totalInvested}
            onChange={(e) => setForm({ ...form, totalInvested: e.target.value })}
            placeholder="0.00"
            step="0.01"
            required
            error={errors.totalInvested}
          />
          
          <Input
            label="Realized Gain/Loss"
            type="number"
            value={form.realizedGain}
            onChange={(e) => setForm({ ...form, realizedGain: e.target.value })}
            placeholder="0.00"
            step="0.01"
            error={errors.realizedGain}
          />
          
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={INVESTMENT_STATUS}
          />
          
          <Select
            label="Linked Account"
            value={form.linkedAccountId}
            onChange={(e) => setForm({ ...form, linkedAccountId: e.target.value })}
            options={[
              { value: '', label: 'No Account' },
              ...accounts.map(acc => ({
                value: acc.id,
                label: `${acc.bank_name || acc.bankName} (${acc.account_type || acc.accountType})`
              }))
            ]}
          />
          
          {form.status === 'Liquidated' && (
            <Input
              label="Liquidation Date"
              type="date"
              value={form.liquidationDate}
              onChange={(e) => setForm({ ...form, liquidationDate: e.target.value })}
              error={errors.liquidationDate}
            />
          )}
        </div>
        
        <div className="mt-4">
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional notes"
            error={errors.notes}
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
          <Button 
            onClick={handleSave}
            loading={saving}
          >
            {editingInvestment ? 'Update' : 'Add'} Investment
          </Button>
        </div>
      </Modal>
    </div>
  );
}