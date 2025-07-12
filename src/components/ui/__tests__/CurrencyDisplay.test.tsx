import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CurrencyDisplay from '../CurrencyDisplay';

describe('CurrencyDisplay Component', () => {
  it('displays original amount only when currencies are the same', () => {
    render(
      <CurrencyDisplay
        originalAmount={100}
        originalCurrency="USD"
        convertedAmount={100}
        convertedCurrency="USD"
        showBoth={true}
      />
    );
    
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.queryByText('≈')).not.toBeInTheDocument();
  });

  it('displays both amounts when currencies differ and showBoth is true', () => {
    render(
      <CurrencyDisplay
        originalAmount={100}
        originalCurrency="USD"
        convertedAmount={85}
        convertedCurrency="EUR"
        showBoth={true}
      />
    );
    
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('≈ €85.00')).toBeInTheDocument();
  });

  it('displays exchange rate when provided', () => {
    render(
      <CurrencyDisplay
        originalAmount={100}
        originalCurrency="USD"
        convertedAmount={85}
        convertedCurrency="EUR"
        showBoth={true}
        exchangeRate={0.85}
      />
    );
    
    expect(screen.getByText('(1 USD = 0.8500 EUR)')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CurrencyDisplay
        originalAmount={100}
        originalCurrency="USD"
        className="text-green-600"
      />
    );
    
    expect(container.firstChild).toHaveClass('text-green-600');
  });

  it('does not show conversion when showBoth is false', () => {
    render(
      <CurrencyDisplay
        originalAmount={100}
        originalCurrency="USD"
        convertedAmount={85}
        convertedCurrency="EUR"
        showBoth={false}
      />
    );
    
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.queryByText('≈')).not.toBeInTheDocument();
  });
});