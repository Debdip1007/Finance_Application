import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCurrencySettings } from '../useCurrencySettings';

// Mock useAuth
vi.mock('../useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' }
  })
}));

describe('useCurrencySettings Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default settings', () => {
    const { result } = renderHook(() => useCurrencySettings());
    
    expect(result.current.settings.defaultCurrency).toBe('INR');
    expect(result.current.settings.displayCurrency).toBe('INR');
    expect(result.current.loading).toBe(true);
  });

  it('loads settings from database', async () => {
    const mockData = {
      default_currency: 'USD',
      display_currency: 'EUR'
    };

    // Mock successful database response
    vi.mocked(require('../../lib/supabase').supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: null })
        })
      })
    });

    const { result } = renderHook(() => useCurrencySettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.settings.defaultCurrency).toBe('USD');
    expect(result.current.settings.displayCurrency).toBe('EUR');
  });

  it('handles database errors gracefully', async () => {
    // Mock database error
    vi.mocked(require('../../lib/supabase').supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Database error' } 
          })
        })
      })
    });

    const { result } = renderHook(() => useCurrencySettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should fall back to default settings
    expect(result.current.settings.defaultCurrency).toBe('INR');
    expect(result.current.settings.displayCurrency).toBe('INR');
  });

  it('updates currency settings', async () => {
    // Mock successful update
    vi.mocked(require('../../lib/supabase').supabase.from).mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null })
    });

    const { result } = renderHook(() => useCurrencySettings());

    const newSettings = {
      defaultCurrency: 'EUR',
      displayCurrency: 'GBP'
    };

    const updateResult = await result.current.updateCurrencySettings(newSettings);

    expect(updateResult.success).toBe(true);
    expect(result.current.settings.defaultCurrency).toBe('EUR');
    expect(result.current.settings.displayCurrency).toBe('GBP');
  });
});