import { currencyConverter } from './currencyConverter';
import { supabase } from './supabase';
import { fetchExchangeRates } from './exchangeRates';

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  conversionDate: string;
}

export interface TransactionWithConversion {
  id?: string;
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  conversionDate: string;
}

class CurrencyConverter {
  private rates: Record<string, number> | null = null;
  private lastFetch: Date | null = null;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  async getExchangeRates(force = false): Promise<Record<string, number> | null> {
    const now = new Date();
    
    if (!force && this.rates && this.lastFetch && 
        (now.getTime() - this.lastFetch.getTime()) < this.CACHE_DURATION) {
      return this.rates;
    }

    try {
      // Try to get rates from database first
      const { data: cachedRates } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('base_currency', 'EUR')
        .gte('created_at', new Date(Date.now() - this.CACHE_DURATION).toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (cachedRates && cachedRates.length > 0 && !force) {
        this.rates = cachedRates[0].rates;
        this.lastFetch = new Date(cachedRates[0].created_at);
        return this.rates;
      }

      // Fetch fresh rates
      const freshRates = await fetchExchangeRates('EUR');
      if (freshRates) {
        this.rates = freshRates;
        this.lastFetch = now;
      }
      
      return this.rates;
    } catch (error) {
      console.error('Error getting exchange rates:', error);
      return this.rates; // Return cached rates if available
    }
  }

  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult | null> {
    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount: amount,
        convertedCurrency: toCurrency,
        exchangeRate: 1,
        conversionDate: new Date().toISOString(),
      };
    }

    const rates = await this.getExchangeRates();
    if (!rates) {
      console.error('No exchange rates available');
      return null;
    }

    try {
      // Convert to EUR first (base currency), then to target currency
      const fromRate = rates[fromCurrency] || 1;
      const toRate = rates[toCurrency] || 1;
      
      if (fromRate === 0 || toRate === 0) {
        console.error(`Invalid exchange rate for ${fromCurrency} or ${toCurrency}`);
        return null;
      }

      const amountInEUR = amount / fromRate;
      const convertedAmount = amountInEUR * toRate;
      const exchangeRate = toRate / fromRate;

      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
        convertedCurrency: toCurrency,
        exchangeRate: Math.round(exchangeRate * 10000) / 10000, // Round to 4 decimal places
        conversionDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error converting currency:', error);
      return null;
    }
  }

  async convertTransaction(
    transaction: {
      amount: number;
      currency: string;
    },
    targetCurrency: string
  ): Promise<TransactionWithConversion | null> {
    const conversion = await this.convertAmount(
      transaction.amount,
      transaction.currency,
      targetCurrency
    );

    if (!conversion) return null;

    return {
      originalAmount: conversion.originalAmount,
      originalCurrency: conversion.originalCurrency,
      convertedAmount: conversion.convertedAmount,
      convertedCurrency: conversion.convertedCurrency,
      exchangeRate: conversion.exchangeRate,
      conversionDate: conversion.conversionDate,
    };
  }

  async convertMultipleAmounts(
    amounts: Array<{ amount: number; currency: string }>,
    targetCurrency: string
  ): Promise<Array<ConversionResult | null>> {
    const rates = await this.getExchangeRates();
    if (!rates) return amounts.map(() => null);

    return Promise.all(
      amounts.map(({ amount, currency }) =>
        this.convertAmount(amount, currency, targetCurrency)
      )
    );
  }

  // Helper method to get current rate between two currencies
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    if (fromCurrency === toCurrency) return 1;

    const rates = await this.getExchangeRates();
    if (!rates) return null;

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    if (fromRate === 0 || toRate === 0) return null;

    return Math.round((toRate / fromRate) * 10000) / 10000;
  }
}

export const currencyConverter = new CurrencyConverter();