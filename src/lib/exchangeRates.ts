import { supabase } from './supabase';
import { ExchangeRate } from '../types';

const EXCHANGE_API_URL = 'https://api.frankfurter.app/latest';
const DEFAULT_BASE_CURRENCY = 'INR';

export async function fetchExchangeRates(baseCurrency: string = 'EUR'): Promise<Record<string, number> | null> {
  try {
    // Check for cached rates first
    const { data: cachedRates } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('base_currency', baseCurrency)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(1);

    if (cachedRates && cachedRates.length > 0) {
      return cachedRates[0].rates;
    }

    // Fetch new rates
    const response = await fetch(`${EXCHANGE_API_URL}?from=${baseCurrency}`);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    const rates = { ...data.rates, [baseCurrency]: 1.0 };

    // Cache the rates
    await supabase
      .from('exchange_rates')
      .upsert({
        base_currency: baseCurrency,
        rates,
        fetch_date: new Date().toISOString(),
      }, {
        onConflict: 'base_currency'
      });

    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number | null {
  if (fromCurrency === toCurrency) return amount;
  
  if (!rates[fromCurrency] || !rates[toCurrency]) {
    return null;
  }

  // Convert to base currency first, then to target currency
  const amountInBase = amount / rates[fromCurrency];
  return amountInBase * rates[toCurrency];
}