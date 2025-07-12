import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/auth/AuthForm';
import Layout from './components/layout/Layout';
import Overview from './components/dashboard/Overview';
import { BankAccountsManager } from './components/dashboard/BankAccountsManager';
import IncomeManager from './components/dashboard/IncomeManager';
import ExpenseManager from './components/dashboard/ExpenseManager';
import InvestmentManager from './components/dashboard/InvestmentManager';
import GoalManager from './components/dashboard/GoalManager';
import CurrencySettings from './components/settings/CurrencySettings';

export default function App() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('overview');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'overview':
        return <Overview />;
      case 'accounts':
        return <BankAccountsManager />;
      case 'income':
        return <IncomeManager />;
      case 'expenses':
        return <ExpenseManager />;
      case 'investments':
        return <InvestmentManager />;
      case 'goals':
        return <GoalManager />;
      case 'settings':
        return <CurrencySettings />;
      default:
        return <Overview />;
    }
  };

  return (
    <Layout currentTab={currentTab} onTabChange={setCurrentTab}>
      {renderTabContent()}
    </Layout>
  );
}