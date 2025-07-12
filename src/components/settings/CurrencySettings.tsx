import React, { useState } from 'react';
import { Settings, Save } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { CURRENCIES } from '../../lib/currencies';
import { useCurrencySettings } from '../../hooks/useCurrencySettings';

export default function CurrencySettings() {
  const { settings, loading, updateCurrencySettings } = useCurrencySettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateCurrencySettings(localSettings);
      if (result.success) {
        alert('Currency settings updated successfully!');
      } else {
        alert('Failed to update currency settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving currency settings:', error);
      alert('An error occurred while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = 
    localSettings.defaultCurrency !== settings.defaultCurrency ||
    localSettings.displayCurrency !== settings.displayCurrency;

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Settings className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Currency Settings</h3>
            <p className="text-sm text-gray-600">
              Configure your default and display currencies for financial calculations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Select
              label="Default Currency"
              value={localSettings.defaultCurrency}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                defaultCurrency: e.target.value
              })}
              options={CURRENCIES.map(c => ({ 
                value: c.code, 
                label: `${c.name} (${c.symbol})` 
              }))}
            />
            <p className="text-xs text-gray-500">
              All calculations and account balances will be converted to this currency
            </p>
          </div>

          <div className="space-y-2">
            <Select
              label="Display Currency"
              value={localSettings.displayCurrency}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                displayCurrency: e.target.value
              })}
              options={CURRENCIES.map(c => ({ 
                value: c.code, 
                label: `${c.name} (${c.symbol})` 
              }))}
            />
            <p className="text-xs text-gray-500">
              Primary currency shown in reports and summaries
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How Currency Conversion Works:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• All transactions are stored in their original currency</li>
            <li>• Account balances are calculated using the default currency</li>
            <li>• Real-time exchange rates are used for conversions</li>
            <li>• Both original and converted amounts are preserved</li>
          </ul>
        </div>

        {hasChanges && (
          <div className="flex justify-end">
            <Button
              icon={Save}
              onClick={handleSave}
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}