import React from 'react';
import { formatCurrency } from '../../lib/currencies';

interface CurrencyDisplayProps {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount?: number;
  convertedCurrency?: string;
  showBoth?: boolean;
  className?: string;
  exchangeRate?: number;
}

export default function CurrencyDisplay({
  originalAmount,
  originalCurrency,
  convertedAmount,
  convertedCurrency,
  showBoth = false,
  className = '',
  exchangeRate,
}: CurrencyDisplayProps) {
  const shouldShowConversion = showBoth && 
    convertedAmount !== undefined && 
    convertedCurrency && 
    originalCurrency !== convertedCurrency;

  return (
    <div className={className}>
      <div className="font-medium">
        {formatCurrency(originalAmount, originalCurrency)}
      </div>
      {shouldShowConversion && (
        <div className="text-sm text-gray-500">
          ≈ {formatCurrency(convertedAmount, convertedCurrency)}
          {exchangeRate && (
            <span className="ml-1">
              (1 {originalCurrency} = {exchangeRate.toFixed(4)} {convertedCurrency})
            </span>
          )}
        </div>
      )}
    </div>
  );
}