import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Target, CheckCircle, TrendingUp, Calendar, DollarSign } from 'lucide-react';
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
import { Goal } from '../../types';

const GOAL_TYPES = [
  { value: 'Short-term (<1 year)', label: 'Short-term (<1 year)' },
  { value: 'Medium-term (1-5 years)', label: 'Medium-term (1-5 years)' },
  { value: 'Long-term (>5 years)', label: 'Long-term (>5 years)' },
];

const GOAL_STATUS = [
  { value: 'Active', label: 'Active' },
  { value: 'Fulfilled', label: 'Fulfilled' },
];

interface GoalFormData {
  name: string;
  targetAmount: string;
  targetCurrency: string;
  savedAmount: string;
  targetDate: string;
  type: string;
  notes: string;
  status: string;
}

export default function GoalManager() {
  const { user } = useAuth();
  const { settings } = useCurrencySettings();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingSavings, setLoadingSavings] = useState(false);
  const [totalAvailableSavings, setTotalAvailableSavings] = useState(0);
  
  const [form, setForm] = useState<GoalFormData>({
    name: '',
    targetAmount: '',
    targetCurrency: 'INR',
    savedAmount: '0',
    targetDate: '',
    type: 'Short-term (<1 year)',
    notes: '',
    status: 'Active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      loadGoals();
      loadTotalAvailableSavings();
    }
  }, [user]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const { data: goalsData, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('target_date', { ascending: true });

      if (error) {
        console.error('Error loading goals:', error);
        throw error;
      }

      console.log('Loaded goals:', goalsData); // Debug log
      setGoals(goalsData || []);
    } catch (error) {
      console.error('Error loading goals:', error);
      alert('Error loading goals. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadTotalAvailableSavings = async () => {
    setLoadingSavings(true);
    try {
      const totalSavings = await calculateNetSavings();
      setTotalAvailableSavings(totalSavings);
    } catch (error) {
      console.error('Error loading total available savings:', error);
    } finally {
      setLoadingSavings(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Goal name is required';
    }

    if (!form.targetAmount || isNaN(parseFloat(form.targetAmount)) || parseFloat(form.targetAmount) <= 0) {
      newErrors.targetAmount = 'Valid target amount is required';
    }

    if (!form.targetDate) {
      newErrors.targetDate = 'Target date is required';
    } else {
      const targetDate = new Date(form.targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (targetDate <= today) {
        newErrors.targetDate = 'Target date must be in the future';
      }
    }

    const savedAmount = parseFloat(form.savedAmount);
    if (isNaN(savedAmount) || savedAmount < 0) {
      newErrors.savedAmount = 'Saved amount must be a valid positive number';
    }

    const targetAmount = parseFloat(form.targetAmount);
    if (!isNaN(targetAmount) && !isNaN(savedAmount) && savedAmount > targetAmount) {
      newErrors.savedAmount = 'Saved amount cannot exceed target amount';
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
      const targetAmount = parseFloat(form.targetAmount);
      const savedAmount = parseFloat(form.savedAmount);

      // Convert amounts to default currency for storage
      const targetConversion = await currencyConverter.convertAmount(
        targetAmount,
        form.targetCurrency,
        settings.defaultCurrency
      );

      const savedConversion = await currencyConverter.convertAmount(
        savedAmount,
        form.targetCurrency,
        settings.defaultCurrency
      );

      if (!targetConversion || !savedConversion) {
        alert('Unable to convert currency. Please try again.');
        return;
      }

      const goalData = {
        name: form.name.trim(),
        target_amount: targetAmount,
        target_currency: form.targetCurrency,
        saved_amount: savedAmount,
        target_date: form.targetDate,
        type: form.type,
        notes: form.notes.trim() || null,
        status: form.status,
        user_id: user?.id,
      };

      console.log('Saving goal data:', goalData); // Debug log

      let savedGoal;
      if (editingGoal) {
        const { data, error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', editingGoal.id)
          .eq('user_id', user?.id)
          .select()
          .single();
        
        if (error) throw error;
        savedGoal = data;
      } else {
        const { data, error } = await supabase
          .from('goals')
          .insert([goalData])
          .select()
          .single();
        
        if (error) throw error;
        savedGoal = data;

        // Store conversion data for target amount
        await supabase
          .from('transaction_conversions')
          .insert([{
            transaction_id: savedGoal.id,
            transaction_type: 'goal',
            original_amount: targetConversion.originalAmount,
            original_currency: targetConversion.originalCurrency,
            converted_amount: targetConversion.convertedAmount,
            converted_currency: targetConversion.convertedCurrency,
            exchange_rate: targetConversion.exchangeRate,
            conversion_date: targetConversion.conversionDate,
          }]);
      }

      await loadGoals();
      setShowModal(false);
      resetForm();
      alert(editingGoal ? 'Goal updated successfully!' : 'Goal created successfully!');
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Error saving goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goal: Goal) => {
    if (!confirm(`Are you sure you want to delete the goal "${goal.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goal.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Delete associated conversion records
      await supabase
        .from('transaction_conversions')
        .delete()
        .eq('transaction_id', goal.id)
        .eq('transaction_type', 'goal');

      await loadGoals();
      alert('Goal deleted successfully!');
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Error deleting goal. Please try again.');
    }
  };

  const markAsFulfilled = async (goal: Goal) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ 
          status: 'Fulfilled',
          saved_amount: goal.target_amount || goal.targetAmount
        })
        .eq('id', goal.id)
        .eq('user_id', user?.id);

      if (error) throw error;
      await loadGoals();
      alert('Goal marked as fulfilled!');
    } catch (error) {
      console.error('Error updating goal status:', error);
      alert('Error updating goal status. Please try again.');
    }
  };

  const updateSavedAmount = async (goal: Goal, newAmount: number) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ saved_amount: newAmount })
        .eq('id', goal.id)
        .eq('user_id', user?.id);

      if (error) throw error;
      await loadGoals();
    } catch (error) {
      console.error('Error updating saved amount:', error);
      alert('Error updating saved amount. Please try again.');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      targetAmount: '',
      targetCurrency: 'INR',
      savedAmount: '0',
      targetDate: '',
      type: 'Short-term (<1 year)',
      notes: '',
      status: 'Active',
    });
    setEditingGoal(null);
    setErrors({});
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name,
      targetAmount: (goal.target_amount ?? goal.targetAmount ?? 0).toString(),
      targetCurrency: goal.target_currency || goal.targetCurrency,
      savedAmount: (goal.saved_amount ?? goal.savedAmount ?? 0).toString(),
      targetDate: goal.target_date || goal.targetDate,
      type: goal.type,
      notes: goal.notes || '',
      status: goal.status,
    });
    setErrors({});
    setShowModal(true);
  };

  const getProgressPercentage = (savedAmount: number, targetAmount: number) => {
    if (targetAmount === 0) return 0;
    return Math.min(100, (savedAmount / targetAmount) * 100);
  };

  const getDaysRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const columns = [
    {
      key: 'name',
      header: 'Goal Name',
      render: (value: string, row: Goal) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.type}</div>
        </div>
      ),
    },
    {
      key: 'availableSavings',
      header: 'Available to Allocate',
      render: (_: any, row: Goal) => {
        const targetAmount = (row.target_amount ?? row.targetAmount) ?? 0;
        const savedAmount = (row.saved_amount ?? row.savedAmount) ?? 0;
        const remainingNeeded = Math.max(0, targetAmount - savedAmount);
        const canAllocate = Math.min(totalAvailableSavings, remainingNeeded);
        const currency = row.target_currency || row.targetCurrency || 'INR';
        
        return (
          <div className="text-center">
            <div className="text-lg font-bold text-green-600 mb-1">
              {formatCurrency(totalAvailableSavings, settings.defaultCurrency)}
            </div>
            <div className="text-xs text-gray-500 mb-2">
              Total Available
            </div>
            {remainingNeeded > 0 && (
              <div className="text-sm text-blue-600">
                Can allocate: {formatCurrency(canAllocate, currency)}
              </div>
            )}
            {remainingNeeded === 0 && (
              <div className="text-sm text-green-600 font-medium">
                Goal Fulfilled!
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (_: any, row: Goal) => {
        const targetAmount = (row.target_amount ?? row.targetAmount) ?? 0;
        const savedAmount = (row.saved_amount ?? row.savedAmount) ?? 0;
        const percentage = getProgressPercentage(savedAmount, targetAmount);
        const currency = row.target_currency || row.targetCurrency || 'INR';
        
        return (
          <div className="w-full">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold text-green-600">
                {formatCurrency(savedAmount, currency)}
              </span>
              <span className="font-medium text-gray-600">
                {formatCurrency(targetAmount, currency)}
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              Saved: {formatCurrency(savedAmount, currency)} of {formatCurrency(targetAmount, currency)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  percentage >= 100 ? 'bg-green-500' : 
                  percentage >= 75 ? 'bg-blue-500' : 
                  percentage >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className={`font-medium ${
                percentage >= 100 ? 'text-green-600' : 
                percentage >= 75 ? 'text-blue-600' : 
                percentage >= 50 ? 'text-yellow-600' : 'text-orange-600'
              }`}>
                {percentage.toFixed(1)}% complete
              </span>
              <span className="text-gray-500">
                {formatCurrency(Math.max(0, targetAmount - savedAmount), currency)} remaining
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'targetDate',
      header: 'Target Date',
      render: (value: string) => {
        const daysRemaining = getDaysRemaining(value);
        const isOverdue = daysRemaining < 0;
        const isUrgent = daysRemaining <= 30 && daysRemaining >= 0;
        
        return (
          <div>
            <div className="font-medium">
              {new Date(value).toLocaleDateString()}
            </div>
            <div className={`text-xs ${
              isOverdue ? 'text-red-600' : 
              isUrgent ? 'text-orange-600' : 
              'text-gray-500'
            }`}>
              {isOverdue 
                ? `${Math.abs(daysRemaining)} days overdue`
                : `${daysRemaining} days remaining`
              }
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
          value === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: Goal) => (
        <div className="flex space-x-2">
          {row.status === 'Active' && totalAvailableSavings > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={DollarSign}
              onClick={() => {
                const targetAmount = (row.target_amount ?? row.targetAmount) ?? 0;
                const savedAmount = (row.saved_amount ?? row.savedAmount) ?? 0;
                const remainingNeeded = targetAmount - savedAmount;
                
                if (remainingNeeded <= 0) {
                  alert('This goal is already fulfilled!');
                  return;
                }
                
                const maxAllowable = Math.min(totalAvailableSavings, remainingNeeded);
                const amount = prompt(
                  `How much would you like to allocate to "${row.name}"?\n\n` +
                  `Available savings: ${formatCurrency(totalAvailableSavings, settings.defaultCurrency)}\n` +
                  `Remaining needed: ${formatCurrency(remainingNeeded, row.target_currency || 'INR')}\n` +
                  `Maximum you can allocate: ${formatCurrency(maxAllowable, row.target_currency || 'INR')}`,
                  maxAllowable.toString()
                );
                
                if (amount && !isNaN(parseFloat(amount))) {
                  allocateToGoal(row, parseFloat(amount));
                }
              }}
              className="text-green-600 hover:text-green-700"
              title="Allocate Savings"
            />
          )}
          {row.status === 'Active' && (
            <Button
              variant="ghost"
              size="sm"
              icon={CheckCircle}
              onClick={() => markAsFulfilled(row)}
              className="text-green-600 hover:text-green-700"
              title="Mark as Fulfilled"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={Edit}
            onClick={() => openEditModal(row)}
            title="Edit Goal"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-700"
            title="Delete Goal"
          />
        </div>
      ),
    },
  ];

  const activeGoals = goals.filter(goal => goal.status === 'Active');
  const fulfilledGoals = goals.filter(goal => goal.status === 'Fulfilled');
  const totalTargetAmount = activeGoals.reduce((sum, goal) => 
    sum + ((goal.target_amount ?? goal.targetAmount) ?? 0), 0
  );
  const totalSavedAmount = activeGoals.reduce((sum, goal) => 
    sum + ((goal.saved_amount ?? goal.savedAmount) ?? 0), 0
  );

  // Calculate net savings for automatic allocation
  const calculateNetSavings = async (): Promise<number> => {
    try {
      const [
        { data: accounts },
        { data: incomes },
        { data: expenses },
        { data: investments }
      ] = await Promise.all([
        supabase.from('bank_accounts').select('*').eq('user_id', user?.id),
        supabase.from('incomes').select('*').eq('user_id', user?.id),
        supabase.from('expenses').select('*').eq('user_id', user?.id),
        supabase.from('investments').select('*').eq('user_id', user?.id).eq('status', 'Active'),
      ]);

      const totalIncome = (incomes || []).reduce((sum, income) => sum + income.amount, 0);
      const totalExpenses = (expenses || []).reduce((sum, expense) => sum + expense.amount, 0);
      
      const bankBalance = (accounts || [])
        .filter(acc => !['Credit Card', 'Loan'].includes((acc.account_type || acc.accountType) || ''))
        .reduce((sum, account) => sum + (account.balance ?? 0), 0);
      
      const totalLiabilities = (accounts || [])
        .filter(acc => ['Credit Card', 'Loan'].includes((acc.account_type || acc.accountType) || ''))
        .reduce((sum, account) => sum + Math.abs(account.balance ?? 0), 0);
      
      const totalInvestments = (investments || [])
        .reduce((sum, investment) => sum + ((investment.current_value ?? investment.currentValue) ?? 0), 0);

      return bankBalance + totalInvestments - totalLiabilities;
    } catch (error) {
      console.error('Error calculating net savings:', error);
      return 0;
    }
  };

  const allocateToGoal = async (goal: Goal, amount: number) => {
    try {
      if (amount <= 0) {
        alert('Please enter a valid amount greater than 0.');
        return;
      }

      const targetAmount = (goal.target_amount ?? goal.targetAmount) ?? 0;
      const currentSaved = (goal.saved_amount ?? goal.savedAmount) ?? 0;
      const maxAllowable = targetAmount - currentSaved;

      if (amount > maxAllowable) {
        alert(`You can only allocate up to ${formatCurrency(maxAllowable, goal.target_currency || 'INR')} to this goal.`);
        return;
      }

      const newSavedAmount = currentSaved + amount;

      const { error } = await supabase
        .from('goals')
        .update({ saved_amount: newSavedAmount })
        .eq('id', goal.id)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      await loadGoals();
      await loadTotalAvailableSavings();
      alert(`Successfully allocated ${formatCurrency(amount, goal.target_currency || 'INR')} to ${goal.name}!`);
    } catch (error) {
      console.error('Error allocating to goal:', error);
      alert('Error allocating funds to goal. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Goal Management</h2>
          <p className="text-gray-600">Set and track your financial goals</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          Add Goal
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Available Savings</p>
              <p className="text-2xl font-bold text-green-600">
                {loadingSavings ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-600 border-t-transparent inline-block" />
                ) : (
                  formatCurrency(totalAvailableSavings, settings.defaultCurrency)
                )}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Available to allocate to any goal
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Goals</p>
              <p className="text-2xl font-bold text-blue-600">
                {activeGoals.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fulfilled Goals</p>
              <p className="text-2xl font-bold text-green-600">
                {fulfilledGoals.length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Target</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(totalTargetAmount, settings.defaultCurrency)}
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
              <p className="text-sm font-medium text-gray-600">Total Saved</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalSavedAmount, settings.defaultCurrency)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Across {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Goals Table */}
      <Card>
        <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-green-900">Available Savings & Goal Progress</h4>
              <p className="text-sm text-green-700">
                You have <span className="font-bold">{formatCurrency(totalAvailableSavings, settings.defaultCurrency)}</span> available to allocate to your goals
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Currently allocated: {formatCurrency(totalSavedAmount, settings.defaultCurrency)} of {formatCurrency(totalTargetAmount, settings.defaultCurrency)} total target
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-900">
                {totalTargetAmount > 0 ? ((totalSavedAmount / totalTargetAmount) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-xs text-green-600">Goals Progress</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-green-200 rounded-full h-3">
              <div 
                className="bg-green-600 h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: `${totalTargetAmount > 0 ? Math.min(100, (totalSavedAmount / totalTargetAmount) * 100) : 0}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs mt-2 text-gray-600">
              <span>₹0</span>
              <span>Total Target: {formatCurrency(totalTargetAmount, settings.defaultCurrency)}</span>
            </div>
          </div>
        </div>
        <Table
          columns={columns}
          data={goals}
          loading={loading}
        />
      </Card>

      {/* Goal Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingGoal ? 'Edit Goal' : 'Add New Goal'}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Goal Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Emergency Fund, Vacation"
            required
            error={errors.name}
          />
          
          <Input
            label="Target Amount"
            type="number"
            value={form.targetAmount}
            onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
            placeholder="0.00"
            step="0.01"
            required
            error={errors.targetAmount}
          />
          
          <Select
            label="Currency"
            value={form.targetCurrency}
            onChange={(e) => setForm({ ...form, targetCurrency: e.target.value })}
            options={CURRENCIES.map(c => ({ value: c.code, label: `${c.name} (${c.symbol})` }))}
          />
          
          <Input
            label="Current Saved Amount"
            type="number"
            value={form.savedAmount}
            onChange={(e) => setForm({ ...form, savedAmount: e.target.value })}
            placeholder="0.00"
            step="0.01"
            error={errors.savedAmount}
          />
          
          <Input
            label="Target Date"
            type="date"
            value={form.targetDate}
            onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
            required
            error={errors.targetDate}
          />
          
          <Select
            label="Goal Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={GOAL_TYPES}
          />
          
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={GOAL_STATUS}
          />
        </div>
        
        <div className="mt-4">
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional notes about this goal"
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
            {editingGoal ? 'Update' : 'Add'} Goal
          </Button>
        </div>
      </Modal>
    </div>
  );
}