import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExchangeRates } from '../useExchangeRates';

// Mock fetch
global.fetch = vi.fn();

describe('useExchangeRates Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        rates: {
          USD: 1.0,
          EUR: 0.85,
          INR: 83.0,
        },
      }),
    } as Response);
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useExchangeRates());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.rates).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('fetches exchange rates successfully', async () => {
    const { result } = renderHook(() => useExchangeRates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rates).toEqual({
      USD: 1.0,
      EUR: 0.85,
      INR: 83.0,
    });
    expect(result.current.error).toBe(null);
  });

  it('handles fetch errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useExchangeRates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rates).toBe(null);
    expect(result.current.error).toBe('Network error');
  });

  it('converts currency correctly', async () => {
    const { result } = renderHook(() => useExchangeRates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const converted = result.current.convert(100, 'USD', 'EUR');
    expect(converted).toBe(85);
  });

  it('returns null for conversion when rates not available', () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useExchangeRates());
    
    const converted = result.current.convert(100, 'USD', 'EUR');
    expect(converted).toBe(null);
  });

  it('forces refresh of rates', async () => {
    const { result } = renderHook(() => useExchangeRates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the mock to verify it's called again
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        rates: { USD: 1.0, EUR: 0.90 },
      }),
    } as Response);

    await result.current.fetchRates(true);

    expect(fetch).toHaveBeenCalled();
    expect(result.current.rates?.EUR).toBe(0.90);
  });
});