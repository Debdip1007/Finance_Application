import { describe, it, expect, vi, beforeEach } from 'vitest';
import { currencyConverter } from '../currencyConverter';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }))
    }))
  }
}));

// Mock exchange rates API
global.fetch = vi.fn();

describe('CurrencyConverter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        rates: {
          EUR: 1.0,
          USD: 1.18,
          INR: 88.5,
          GBP: 0.85,
        },
      }),
    } as Response);
  });

  describe('convertAmount', () => {
    it('returns same amount for same currency', async () => {
      const result = await currencyConverter.convertAmount(100, 'USD', 'USD');
      
      expect(result).toEqual({
        originalAmount: 100,
        originalCurrency: 'USD',
        convertedAmount: 100,
        convertedCurrency: 'USD',
        exchangeRate: 1,
        conversionDate: expect.any(String),
      });
    });

    it('converts between different currencies', async () => {
      const result = await currencyConverter.convertAmount(100, 'USD', 'EUR');
      
      expect(result).toEqual({
        originalAmount: 100,
        originalCurrency: 'USD',
        convertedAmount: expect.any(Number),
        convertedCurrency: 'EUR',
        exchangeRate: expect.any(Number),
        conversionDate: expect.any(String),
      });
      
      // USD to EUR should be less than original amount
      expect(result!.convertedAmount).toBeLessThan(100);
    });

    it('handles invalid currencies gracefully', async () => {
      const result = await currencyConverter.convertAmount(100, 'INVALID', 'USD');
      expect(result).toBeNull();
    });

    it('returns null when exchange rates unavailable', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
      
      const result = await currencyConverter.convertAmount(100, 'USD', 'EUR');
      expect(result).toBeNull();
    });

    it('rounds amounts correctly', async () => {
      const result = await currencyConverter.convertAmount(100, 'USD', 'EUR');
      
      if (result) {
        // Should be rounded to 2 decimal places
        expect(result.convertedAmount.toString()).toMatch(/^\d+\.\d{1,2}$/);
        // Exchange rate should be rounded to 4 decimal places
        expect(result.exchangeRate.toString()).toMatch(/^\d+\.\d{1,4}$/);
      }
    });
  });

  describe('getExchangeRate', () => {
    it('returns 1 for same currency', async () => {
      const rate = await currencyConverter.getExchangeRate('USD', 'USD');
      expect(rate).toBe(1);
    });

    it('returns correct exchange rate', async () => {
      const rate = await currencyConverter.getExchangeRate('USD', 'EUR');
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(1); // USD to EUR should be less than 1
    });

    it('returns null for invalid currencies', async () => {
      const rate = await currencyConverter.getExchangeRate('INVALID', 'USD');
      expect(rate).toBeNull();
    });
  });

  describe('convertMultipleAmounts', () => {
    it('converts multiple amounts correctly', async () => {
      const amounts = [
        { amount: 100, currency: 'USD' },
        { amount: 50, currency: 'EUR' },
        { amount: 1000, currency: 'INR' },
      ];

      const results = await currencyConverter.convertMultipleAmounts(amounts, 'EUR');
      
      expect(results).toHaveLength(3);
      expect(results[0]).not.toBeNull();
      expect(results[1]).not.toBeNull();
      expect(results[2]).not.toBeNull();
      
      // All should be converted to EUR
      results.forEach(result => {
        if (result) {
          expect(result.convertedCurrency).toBe('EUR');
        }
      });
    });

    it('handles mixed valid and invalid currencies', async () => {
      const amounts = [
        { amount: 100, currency: 'USD' },
        { amount: 50, currency: 'INVALID' },
      ];

      const results = await currencyConverter.convertMultipleAmounts(amounts, 'EUR');
      
      expect(results).toHaveLength(2);
      expect(results[0]).not.toBeNull();
      expect(results[1]).toBeNull();
    });
  });
});