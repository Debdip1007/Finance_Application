import React, { useState, useEffect } from 'react';
import Input from './Input';
import Select from './Select';
import { CURRENCIES } from '../../lib/currencies';
import { currencyConverter } from '../../lib/currencyConverter';
import { useCurrencySettings } from '../../hooks/useCurrencySettings';

interface CurrencyInputProps {
  label: string;
  amount: string;
  currency: string;
  onAmountChange: (amount: string) => void;
  onCurrencyChange: (currency: string) => void;
  showConversion?: boolean;
  required?: boolean;
  placeholder?: string;
}

export default function CurrencyInput({
  label,
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  showConversion = true,
  required = false,
  placeholder = '0.00',
}: CurrencyInputProps) {
  const { settings } = useCurrencySettings();
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  useEffect(() => {
    if (showConversion && amount && currency !== settings.defaultCurrency) {
      const numAmount = parseFloat(amount);
      if (!isNaN(numAmount) && numAmount > 0) {
        currencyConverter.convertAmount(numAmount, currency, settings.defaultCurrency)
          .then(result => {
            if (result) {
              setConvertedAmount(result.convertedAmount);
              setExchangeRate(result.exchangeRate);
            }
          });
      } else {
        setConvertedAmount(null);
        setExchangeRate(null);
      }
    } else {
      setConvertedAmount(null);
      setExchangeRate(null);
    }
  }, [amount, currency, settings.defaultCurrency, showConversion]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input
          label={label}
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder={placeholder}
          step="0.01"
          required={required}
        />
        <Select
          label="Currency"
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          options={CURRENCIES.map(c => ({ value: c.code, label: `${c.name} (${c.symbol})` }))}
        />
      </div>
      
      {showConversion && convertedAmount && currency !== settings.defaultCurrency && (
        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
          <div>
            Converted: <span className="font-medium">
              {CURRENCIES.find(c => c.code === settings.defaultCurrency)?.symbol}
              {convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {exchangeRate && (
            <div className="text-xs text-gray-500">
              Rate: 1 {currency} = {exchangeRate.toFixed(4)} {settings.defaultCurrency}
            </div>
          )}
        </div>
      )}
    </div>
  );
}