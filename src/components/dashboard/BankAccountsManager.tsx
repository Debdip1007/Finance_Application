import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { useCurrencySettings } from '../../hooks/useCurrencySettings';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Table from '../ui/Table';
import CurrencyDisplay from '../ui/CurrencyDisplay';
import { Plus, Edit2, Trash2, ArrowRightLeft, CreditCard, Globe } from 'lucide-react';
import { CURRENCIES } from '../../lib/currencies';

interface BankAccount {
  id: string;
  bank_name: string;
  account_type: string;
  account_number?: string;
  ifsc_code?: string;
  balance: number;
  currency: string;
  notes?: string;
  credit_limit: number;
  created_at: string;
  updated_at: string;
}

interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id?: string;
  amount: number;
  currency: string;
  type: string;
  description?: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export function BankAccountsManager() {
  const { user } = useAuth();
  const { exchangeRates, getExchangeRate } = useExchangeRates();
  const { defaultCurrency } = useCurrencySettings();
  
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showInternationalTransferModal, setShowInternationalTransferModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const [accountForm, setAccountForm] = useState({
    bank_name: '',
    account_type: 'Savings',
    account_number: '',
    ifsc_code: '',
    balance: '',
    currency: defaultCurrency,
    notes: '',
    credit_limit: ''
  });

  const [transferForm, setTransferForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    type: 'Transfer',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [internationalTransferForm, setInternationalTransferForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    exchangeRateMarkup: '0',
    exchangeRateFlatMarkup: '0',
    flatTransferFee: '0',
    manualSettlementAdjustment: '0',
    useManualRate: false,
    manualExchangeRate: ''
  });

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchTransfers();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const accountData = {
        user_id: user?.id,
        bank_name: accountForm.bank_name,
        account_type: accountForm.account_type,
        account_number: accountForm.account_number || null,
        ifsc_code: accountForm.ifsc_code || null,
        balance: parseFloat(accountForm.balance) || 0,
        currency: accountForm.currency,
        notes: accountForm.notes || null,
        credit_limit: parseFloat(accountForm.credit_limit) || 0
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

      setShowAccountModal(false);
      setEditingAccount(null);
      setAccountForm({
        bank_name: '',
        account_type: 'Savings',
        account_number: '',
        ifsc_code: '',
        balance: '',
        currency: defaultCurrency,
        notes: '',
        credit_limit: ''
      });
      fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const fromAccount = accounts.find(acc => acc.id === transferForm.from_account_id);
      const toAccount = accounts.find(acc => acc.id === transferForm.to_account_id);
      
      if (!fromAccount) return;

      const transferAmount = parseFloat(transferForm.amount);
      
      // Create transfer record
      const { error: transferError } = await supabase
        .from('transfers')
        .insert([{
          user_id: user?.id,
          from_account_id: transferForm.from_account_id,
          to_account_id: transferForm.to_account_id || null,
          amount: transferAmount,
          currency: fromAccount.currency,
          type: transferForm.type,
          description: transferForm.description || null,
          date: transferForm.date
        }]);

      if (transferError) throw transferError;

      // Update account balances
      const { error: fromError } = await supabase
        .from('bank_accounts')
        .update({ balance: fromAccount.balance - transferAmount })
        .eq('id', transferForm.from_account_id);

      if (fromError) throw fromError;

      if (toAccount && transferForm.type === 'Transfer') {
        const { error: toError } = await supabase
          .from('bank_accounts')
          .update({ balance: toAccount.balance + transferAmount })
          .eq('id', transferForm.to_account_id);

        if (toError) throw toError;
      }

      setShowTransferModal(false);
      setTransferForm({
        from_account_id: '',
        to_account_id: '',
        amount: '',
        type: 'Transfer',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchAccounts();
      fetchTransfers();
    } catch (error) {
      console.error('Error processing transfer:', error);
    }
  };

  const handleInternationalTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const fromAccount = accounts.find(acc => acc.id === internationalTransferForm.from_account_id);
      const toAccount = accounts.find(acc => acc.id === internationalTransferForm.to_account_id);
      
      if (!fromAccount || !toAccount) return;

      const sourceAmount = parseFloat(internationalTransferForm.amount);
      const markupPercentage = parseFloat(internationalTransferForm.exchangeRateMarkup) || 0;
      const flatMarkup = parseFloat(internationalTransferForm.exchangeRateFlatMarkup) || 0;
      const flatFee = parseFloat(internationalTransferForm.flatTransferFee) || 0;
      const manualAdjustment = parseFloat(internationalTransferForm.manualSettlementAdjustment) || 0;

      // Get exchange rate
      let baseRate: number;
      if (internationalTransferForm.useManualRate && internationalTransferForm.manualExchangeRate) {
        baseRate = parseFloat(internationalTransferForm.manualExchangeRate);
      } else {
        baseRate = getExchangeRate(fromAccount.currency, toAccount.currency);
      }

      // Calculate final exchange rate with markups
      const percentageMarkupAmount = baseRate * (markupPercentage / 100);
      const finalRate = baseRate + percentageMarkupAmount - flatMarkup;

      // Calculate destination amount
      const baseDestinationAmount = sourceAmount * finalRate;
      const finalDestinationAmount = baseDestinationAmount - flatFee + manualAdjustment;

      // Create transfer record
      const { data: transferData, error: transferError } = await supabase
        .from('transfers')
        .insert([{
          user_id: user?.id,
          from_account_id: internationalTransferForm.from_account_id,
          to_account_id: internationalTransferForm.to_account_id,
          amount: sourceAmount,
          currency: fromAccount.currency,
          type: 'International Transfer',
          description: internationalTransferForm.description || null,
          date: internationalTransferForm.date
        }])
        .select()
        .single();

      if (transferError) throw transferError;

      // Store conversion details
      const { error: conversionError } = await supabase
        .from('transaction_conversions')
        .insert([{
          transaction_id: transferData.id,
          transaction_type: 'transfer',
          original_amount: sourceAmount,
          original_currency: fromAccount.currency,
          converted_amount: finalDestinationAmount,
          converted_currency: toAccount.currency,
          exchange_rate: finalRate,
          conversion_date: new Date().toISOString()
        }]);

      if (conversionError) throw conversionError;

      // Update account balances
      const { error: fromError } = await supabase
        .from('bank_accounts')
        .update({ balance: fromAccount.balance - sourceAmount })
        .eq('id', internationalTransferForm.from_account_id);

      if (fromError) throw fromError;

      const { error: toError } = await supabase
        .from('bank_accounts')
        .update({ balance: toAccount.balance + finalDestinationAmount })
        .eq('id', internationalTransferForm.to_account_id);

      if (toError) throw toError;

      // Record flat transfer fee as expense if applicable
      if (flatFee > 0) {
        const flatFeeInSourceCurrency = flatFee / finalRate;
        
        const { error: expenseError } = await supabase
          .from('expenses')
          .insert([{
            user_id: user?.id,
            date: internationalTransferForm.date,
            category: 'Transfer Fees',
            description: `International transfer fee (${flatFee} ${toAccount.currency})`,
            amount: flatFeeInSourceCurrency,
            currency: fromAccount.currency,
            type: 'Need',
            account_id: internationalTransferForm.from_account_id,
            linked_transfer_id: transferData.id
          }]);

        if (expenseError) throw expenseError;
      }

      setShowInternationalTransferModal(false);
      setInternationalTransferForm({
        from_account_id: '',
        to_account_id: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        exchangeRateMarkup: '0',
        exchangeRateFlatMarkup: '0',
        flatTransferFee: '0',
        manualSettlementAdjustment: '0',
        useManualRate: false,
        manualExchangeRate: ''
      });
      fetchAccounts();
      fetchTransfers();
    } catch (error) {
      console.error('Error processing international transfer:', error);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const openEditModal = (account: BankAccount) => {
    setEditingAccount(account);
    setAccountForm({
      bank_name: account.bank_name,
      account_type: account.account_type,
      account_number: account.account_number || '',
      ifsc_code: account.ifsc_code || '',
      balance: account.balance.toString(),
      currency: account.currency,
      notes: account.notes || '',
      credit_limit: account.credit_limit.toString()
    });
    setShowAccountModal(true);
  };

  // Calculate international transfer preview
  const calculateInternationalTransferPreview = () => {
    const fromAccount = accounts.find(acc => acc.id === internationalTransferForm.from_account_id);
    const toAccount = accounts.find(acc => acc.id === internationalTransferForm.to_account_id);
    
    if (!fromAccount || !toAccount || !internationalTransferForm.amount) {
      return null;
    }

    const sourceAmount = parseFloat(internationalTransferForm.amount);
    const markupPercentage = parseFloat(internationalTransferForm.exchangeRateMarkup) || 0;
    const flatMarkup = parseFloat(internationalTransferForm.exchangeRateFlatMarkup) || 0;
    const flatFee = parseFloat(internationalTransferForm.flatTransferFee) || 0;
    const manualAdjustment = parseFloat(internationalTransferForm.manualSettlementAdjustment) || 0;

    // Get exchange rate
    let baseRate: number;
    if (internationalTransferForm.useManualRate && internationalTransferForm.manualExchangeRate) {
      baseRate = parseFloat(internationalTransferForm.manualExchangeRate);
    } else {
      baseRate = getExchangeRate(fromAccount.currency, toAccount.currency);
    }

    // Calculate final exchange rate with markups
    const percentageMarkupAmount = baseRate * (markupPercentage / 100);
    const finalRate = baseRate + percentageMarkupAmount - flatMarkup;

    // Calculate destination amount
    const baseDestinationAmount = sourceAmount * finalRate;
    const finalDestinationAmount = baseDestinationAmount - flatFee + manualAdjustment;

    return {
      sourceAmount,
      baseRate,
      percentageMarkupAmount,
      flatMarkup,
      finalRate,
      baseDestinationAmount,
      flatFee,
      manualAdjustment,
      finalDestinationAmount,
      fromCurrency: fromAccount.currency,
      toCurrency: toAccount.currency
    };
  };

  const transferPreview = calculateInternationalTransferPreview();

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Bank Accounts</h2>
        <Button onClick={() => setShowAccountModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{account.bank_name}</h3>
                <p className="text-sm text-gray-600">{account.account_type}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(account)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteAccount(account.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Balance:</span>
                <CurrencyDisplay amount={account.balance} currency={account.currency} />
              </div>
              {account.account_number && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Account:</span>
                  <span className="text-sm font-mono">****{account.account_number.slice(-4)}</span>
                </div>
              )}
              {account.credit_limit > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Credit Limit:</span>
                  <CurrencyDisplay amount={account.credit_limit} currency={account.currency} />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-4">
        <Button
          onClick={() => setShowTransferModal(true)}
          className="flex items-center gap-2"
          variant="outline"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Local Transfer
        </Button>
        <Button
          onClick={() => setShowInternationalTransferModal(true)}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Globe className="w-4 h-4" />
          International Transfer
        </Button>
      </div>

      {/* Account Modal */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => {
          setShowAccountModal(false);
          setEditingAccount(null);
          setAccountForm({
            bank_name: '',
            account_type: 'Savings',
            account_number: '',
            ifsc_code: '',
            balance: '',
            currency: defaultCurrency,
            notes: '',
            credit_limit: ''
          });
        }}
        title={editingAccount ? 'Edit Account' : 'Add New Account'}
      >
        <form onSubmit={handleAccountSubmit} className="space-y-4">
          <Input
            label="Bank Name"
            value={accountForm.bank_name}
            onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
            required
          />
          
          <Select
            label="Account Type"
            value={accountForm.account_type}
            onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}
            options={[
              { value: 'Savings', label: 'Savings' },
              { value: 'Current', label: 'Current' },
              { value: 'Credit Card', label: 'Credit Card' },
              { value: 'Fixed Deposit', label: 'Fixed Deposit' }
            ]}
          />
          
          <Input
            label="Account Number (Optional)"
            value={accountForm.account_number}
            onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
          />
          
          <Input
            label="IFSC Code (Optional)"
            value={accountForm.ifsc_code}
            onChange={(e) => setAccountForm({ ...accountForm, ifsc_code: e.target.value })}
          />
          
          <Input
            label="Current Balance"
            type="number"
            value={accountForm.balance}
            onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
            step="0.01"
            required
          />
          
          <Select
            label="Currency"
            value={accountForm.currency}
            onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
            options={CURRENCIES.map(currency => ({
              value: currency.code,
              label: `${currency.code} - ${currency.name}`
            }))}
          />
          
          <Input
            label="Credit Limit (if applicable)"
            type="number"
            value={accountForm.credit_limit}
            onChange={(e) => setAccountForm({ ...accountForm, credit_limit: e.target.value })}
            step="0.01"
          />
          
          <Input
            label="Notes (Optional)"
            value={accountForm.notes}
            onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
          />
          
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingAccount ? 'Update Account' : 'Add Account'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAccountModal(false);
                setEditingAccount(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Local Transfer Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Local Transfer"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <Select
            label="From Account"
            value={transferForm.from_account_id}
            onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value })}
            options={accounts.map(account => ({
              value: account.id,
              label: `${account.bank_name} (${account.currency})`
            }))}
            required
          />
          
          <Select
            label="Transfer Type"
            value={transferForm.type}
            onChange={(e) => setTransferForm({ ...transferForm, type: e.target.value })}
            options={[
              { value: 'Transfer', label: 'Transfer to Another Account' },
              { value: 'Debt Payment', label: 'Debt Payment' },
              { value: 'Withdrawal', label: 'Cash Withdrawal' }
            ]}
          />
          
          {transferForm.type === 'Transfer' && (
            <Select
              label="To Account"
              value={transferForm.to_account_id}
              onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}
              options={accounts
                .filter(account => account.id !== transferForm.from_account_id)
                .map(account => ({
                  value: account.id,
                  label: `${account.bank_name} (${account.currency})`
                }))}
              required={transferForm.type === 'Transfer'}
            />
          )}
          
          <Input
            label="Amount"
            type="number"
            value={transferForm.amount}
            onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
            step="0.01"
            required
          />
          
          <Input
            label="Date"
            type="date"
            value={transferForm.date}
            onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
            required
          />
          
          <Input
            label="Description"
            value={transferForm.description}
            onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
          />
          
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">Process Transfer</Button>
            <Button type="button" variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* International Transfer Modal */}
      <Modal
        isOpen={showInternationalTransferModal}
        onClose={() => setShowInternationalTransferModal(false)}
        title="International Transfer"
        size="lg"
      >
        <form onSubmit={handleInternationalTransferSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="From Account"
              value={internationalTransferForm.from_account_id}
              onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, from_account_id: e.target.value })}
              options={accounts.map(account => ({
                value: account.id,
                label: `${account.bank_name} (${account.currency})`
              }))}
              required
            />
            
            <Select
              label="To Account"
              value={internationalTransferForm.to_account_id}
              onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, to_account_id: e.target.value })}
              options={accounts
                .filter(account => {
                  const fromAccount = accounts.find(acc => acc.id === internationalTransferForm.from_account_id);
                  return account.id !== internationalTransferForm.from_account_id && 
                         fromAccount && account.currency !== fromAccount.currency;
                })
                .map(account => ({
                  value: account.id,
                  label: `${account.bank_name} (${account.currency})`
                }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`Amount ${accounts.find(acc => acc.id === internationalTransferForm.from_account_id)?.currency ? `(${accounts.find(acc => acc.id === internationalTransferForm.from_account_id)?.currency})` : ''}`}
              type="number"
              value={internationalTransferForm.amount}
              onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, amount: e.target.value })}
              step="0.01"
              required
            />
            
            <Input
              label="Date"
              type="date"
              value={internationalTransferForm.date}
              onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, date: e.target.value })}
              required
            />
          </div>

          <Input
            label="Description"
            value={internationalTransferForm.description}
            onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, description: e.target.value })}
            placeholder="Optional transfer description"
          />

          {/* Exchange Rate Section */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Exchange Rate Settings</h4>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="useManualRate"
                checked={internationalTransferForm.useManualRate}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, useManualRate: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="useManualRate" className="text-sm text-gray-700">
                Use manual exchange rate
              </label>
            </div>

            {internationalTransferForm.useManualRate && (
              <Input
                label="Manual Exchange Rate"
                type="number"
                value={internationalTransferForm.manualExchangeRate}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, manualExchangeRate: e.target.value })}
                placeholder="Enter exchange rate"
                step="0.000001"
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Exchange Rate Markup (%)"
                type="number"
                value={internationalTransferForm.exchangeRateMarkup}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, exchangeRateMarkup: e.target.value })}
                placeholder="0.00"
                step="0.01"
                helpText="Additional percentage markup over base rate"
              />

              <Input
                label={`Exchange Rate Flat Markup ${accounts.find(acc => acc.id === internationalTransferForm.to_account_id)?.currency ? `(${accounts.find(acc => acc.id === internationalTransferForm.to_account_id)?.currency})` : ''}`}
                type="number"
                value={internationalTransferForm.exchangeRateFlatMarkup}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, exchangeRateFlatMarkup: e.target.value })}
                placeholder="0.00"
                step="0.01"
                helpText="Flat amount to subtract from exchange rate"
              />
            </div>
          </div>

          {/* Transfer Fees Section */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Transfer Fees & Adjustments</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={`Flat Transfer Fee ${accounts.find(acc => acc.id === internationalTransferForm.to_account_id)?.currency ? `(${accounts.find(acc => acc.id === internationalTransferForm.to_account_id)?.currency})` : ''}`}
                type="number"
                value={internationalTransferForm.flatTransferFee}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, flatTransferFee: e.target.value })}
                placeholder="0.00"
                step="0.01"
                helpText="Fixed fee in destination currency"
              />

              <Input
                label={`Manual Settlement Adjustment ${accounts.find(acc => acc.id === internationalTransferForm.to_account_id)?.currency ? `(${accounts.find(acc => acc.id === internationalTransferForm.to_account_id)?.currency})` : ''}`}
                type="number"
                value={internationalTransferForm.manualSettlementAdjustment}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, manualSettlementAdjustment: e.target.value })}
                placeholder="0.00"
                step="0.01"
                helpText="Manual adjustment to final amount"
              />
            </div>
          </div>

          {/* Exchange Rate Breakdown */}
          {transferPreview && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
              <h4 className="font-medium text-gray-900">Exchange Rate Breakdown</h4>
              
              {/* Percentage Markup Calculation */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h5 className="font-medium text-gray-800 mb-2">1. Percentage Markup Calculation</h5>
                <div className="space-y-1 text-sm font-mono">
                  <div className="flex justify-between">
                    <span>Base Rate:</span>
                    <span>1 {transferPreview.fromCurrency} = {transferPreview.baseRate.toFixed(2)} {transferPreview.toCurrency}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>Markup ({internationalTransferForm.exchangeRateMarkup}%):</span>
                    <span>+{transferPreview.percentageMarkupAmount.toFixed(2)} {transferPreview.toCurrency}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Flat Markup:</span>
                    <span>-{transferPreview.flatMarkup.toFixed(2)} {transferPreview.toCurrency}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-600 border-t pt-1">
                    <span>Final Rate:</span>
                    <span>1 {transferPreview.fromCurrency} = {transferPreview.finalRate.toFixed(2)} {transferPreview.toCurrency}</span>
                  </div>
                </div>
              </div>

              {/* Flat Rate Markup Calculation */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h5 className="font-medium text-gray-800 mb-2">2. Flat Rate Markup Calculation</h5>
                <div className="space-y-1 text-sm font-mono">
                  <div className="flex justify-between">
                    <span>Base Rate:</span>
                    <span>1 {transferPreview.fromCurrency} = {transferPreview.baseRate.toFixed(2)} {transferPreview.toCurrency}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Markup:</span>
                    <span>-{transferPreview.flatMarkup.toFixed(2)} {transferPreview.toCurrency}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-600 border-t pt-1">
                    <span>Final Rate:</span>
                    <span>1 {transferPreview.fromCurrency} = {(transferPreview.baseRate - transferPreview.flatMarkup).toFixed(2)} {transferPreview.toCurrency}</span>
                  </div>
                </div>
              </div>

              {/* Currently Applied Rate */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h5 className="font-medium text-green-800 mb-2">Currently Applied Rate (Percentage Method)</h5>
                <div className="text-sm font-mono font-bold text-green-700">
                  1 {transferPreview.fromCurrency} = {transferPreview.finalRate.toFixed(2)} {transferPreview.toCurrency}
                </div>
              </div>
            </div>
          )}

          {/* Transfer Summary */}
          {transferPreview && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Transfer Summary</h4>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span>Source Amount:</span>
                  <span>{transferPreview.sourceAmount.toFixed(2)} {transferPreview.fromCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Exchange Rate:</span>
                  <span>1 {transferPreview.fromCurrency} = {transferPreview.baseRate.toFixed(2)} {transferPreview.toCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Final Exchange Rate:</span>
                  <span>1 {transferPreview.fromCurrency} = {transferPreview.finalRate.toFixed(2)} {transferPreview.toCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Destination Amount:</span>
                  <span>{transferPreview.baseDestinationAmount.toFixed(2)} {transferPreview.toCurrency}</span>
                </div>
                {transferPreview.flatFee > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Transfer Fee:</span>
                    <span>-{transferPreview.flatFee.toFixed(2)} {transferPreview.toCurrency}</span>
                  </div>
                )}
                {transferPreview.manualAdjustment !== 0 && (
                  <div className={`flex justify-between ${transferPreview.manualAdjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Manual Adjustment:</span>
                    <span>{transferPreview.manualAdjustment > 0 ? '+' : ''}{transferPreview.manualAdjustment.toFixed(2)} {transferPreview.toCurrency}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-green-600 border-t pt-2">
                  <span>Final Destination Amount:</span>
                  <span>{transferPreview.finalDestinationAmount.toFixed(2)} {transferPreview.toCurrency}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">Process International Transfer</Button>
            <Button type="button" variant="outline" onClick={() => setShowInternationalTransferModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Recent Transfers */}
      {transfers.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transfers</h3>
          <Table
            headers={['Date', 'Type', 'From', 'To', 'Amount', 'Description']}
            data={transfers.slice(0, 10).map(transfer => {
              const fromAccount = accounts.find(acc => acc.id === transfer.from_account_id);
              const toAccount = accounts.find(acc => acc.id === transfer.to_account_id);
              
              return [
                new Date(transfer.date).toLocaleDateString(),
                transfer.type,
                fromAccount?.bank_name || 'Unknown',
                toAccount?.bank_name || transfer.type === 'Debt Payment' ? 'Debt Payment' : 'Cash Withdrawal',
                <CurrencyDisplay key={transfer.id} amount={transfer.amount} currency={transfer.currency} />,
                transfer.description || '-'
              ];
            })}
          />
        </Card>
      )}
    </div>
  );
}