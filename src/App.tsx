import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/auth/AuthForm';
import Layout from './components/layout/Layout';
import Overview from './components/dashboard/Overview';
import BankAccountsManager from './components/dashboard/BankAccountsManager';
import IncomeManager from './components/dashboard/IncomeManager';
import ExpenseManager from './components/dashboard/ExpenseManager';
import InvestmentManager from './components/dashboard/InvestmentManager';
import GoalManager from './components/dashboard/GoalManager';
import CurrencySettings from './components/settings/CurrencySettings';
import EmailVerification from './pages/EmailVerification';
import Goodbye from './pages/Goodbye';
import { Toaster } from 'react-hot-toast';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Dashboard Component
function Dashboard() {
  const [currentTab, setCurrentTab] = React.useState('overview');

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

// Public Route Component (for non-authenticated users)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <div className="App">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/auth" 
            element={
              <PublicRoute>
                <AuthForm />
              </PublicRoute>
            } 
          />
          
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/goodbye" element={<Goodbye />} />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Default Route */}
          <Route 
            path="/" 
            element={
              <Navigate to="/dashboard" replace />
            } 
          />
          
          {/* Catch-all Route */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-4">Page not found</p>
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Go Home
                  </button>
                </div>
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}