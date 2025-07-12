import { useState, useEffect } from 'react';
import { fetchExchangeRates, convertCurrency } from '../lib/exchangeRates';

export function useExchangeRates() {
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async (force = false) => {
    if (!force && rates) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const newRates = await fetchExchangeRates();
      if (newRates) {
        setRates(newRates);
      } else {
        setError('Failed to fetch exchange rates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const convert = (amount: number, from: string, to: string): number | null => {
    if (!rates) return null;
    return convertCurrency(amount, from, to, rates);
  };

  return {
    rates,
    loading,
    error,
    fetchRates,
    convert,
  };
}