import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface CurrencySettings {
  defaultCurrency: string;
  displayCurrency: string;
}

export function useCurrencySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CurrencySettings>({
    defaultCurrency: 'INR',
    displayCurrency: 'INR',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCurrencySettings();
    }
  }, [user]);

  const loadCurrencySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('default_currency, display_currency')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error loading currency settings:', error);
        return;
      }

      if (data) {
        setSettings({
          defaultCurrency: data.default_currency || 'INR',
          displayCurrency: data.display_currency || 'INR',
        });
      }
    } catch (error) {
      console.error('Error loading currency settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrencySettings = async (newSettings: Partial<CurrencySettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          default_currency: updatedSettings.defaultCurrency,
          display_currency: updatedSettings.displayCurrency,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      setSettings(updatedSettings);
      return { success: true };
    } catch (error) {
      console.error('Error updating currency settings:', error);
      return { success: false, error };
    }
  };

  return {
    settings,
    loading,
    updateCurrencySettings,
  };
}