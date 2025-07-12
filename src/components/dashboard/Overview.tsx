import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PiggyBank,
  Target,
  CreditCard,
  RefreshCw,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { formatCurrency, CURRENCIES } from '../../lib/currencies';
import { BankAccount, Income, Expense, Investment, Goal } from '../../types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  netSavings: number;
  cumulativeIncome: number;
  cumulativeExpenses: number;
  cumulativeNetSavings: number;
}

interface YearlyData {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  endingBalance: number;
  investments: number;
  liabilities: number;
}

export default function Overview() {
  const { user } = useAuth();
  const { convert, fetchRates } = useExchangeRates();
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  
  const [currentSnapshot, setCurrentSnapshot] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    totalInvestments: 0,
    bankBalance: 0,
    totalLiabilities: 0,
    totalAssets: 0,
    netWorth: 0,
  });

  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  
  const [chartData, setChartData] = useState({
    monthlyTrend: [] as any[],
    expenseCategories: [] as any[],
    investmentAllocation: [] as any[],
    yearlyComparison: [] as any[],
  });

  const availableYears = Array.from(
    { length: 5 }, 
    (_, i) => new Date().getFullYear() - i
  );

  useEffect(() => {
    if (user) {
      loadOverviewData();
    }
  }, [user, selectedCurrency, selectedYear]);

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        { data: accounts },
        { data: incomes },
        { data: expenses },
        { data: investments },
        { data: goals }
      ] = await Promise.all([
        supabase.from('bank_accounts').select('*').eq('user_id', user?.id),
        supabase.from('incomes').select('*').eq('user_id', user?.id),
        supabase.from('expenses').select('*').eq('user_id', user?.id),
        supabase.from('investments').select('*').eq('user_id', user?.id),
        supabase.from('goals').select('*').eq('user_id', user?.id),
      ]);

      // Calculate current financial snapshot
      const snapshot = calculateCurrentSnapshot(
        accounts || [],
        incomes || [],
        expenses || [],
        investments || []
      );

      // Generate monthly data for selected year
      const monthly = generateMonthlyData(
        incomes || [],
        expenses || [],
        selectedYear
      );

      // Generate yearly comparison data
      const yearly = generateYearlyData(
        accounts || [],
        incomes || [],
        expenses || [],
        investments || []
      );

      // Generate chart data
      const charts = generateChartData(
        incomes || [],
        expenses || [],
        investments || [],
        monthly
      );

      setCurrentSnapshot(snapshot);
      setMonthlyData(monthly);
      setYearlyData(yearly);
      setChartData(charts);
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentSnapshot = (
    accounts: BankAccount[],
    incomes: Income[],
    expenses: Expense[],
    investments: Investment[]
  ) => {
    // Convert all amounts to selected currency
    const totalIncome = incomes.reduce((sum, income) => {
      const amount = income.amount ?? 0;
      const converted = convert?.(amount, income.currency || 'INR', selectedCurrency);
      return sum + (converted ?? amount);
    }, 0);

    const totalExpenses = expenses.reduce((sum, expense) => {
      const amount = expense.amount ?? 0;
      const converted = convert?.(amount, expense.currency || 'INR', selectedCurrency);
      return sum + (converted ?? amount);
    }, 0);

    const bankBalance = accounts
      .filter(acc => !['Credit Card', 'Loan'].includes((acc.account_type || acc.accountType) || ''))
      .reduce((sum, account) => {
        const balance = account.balance ?? 0;
        const converted = convert?.(balance, account.currency || 'INR', selectedCurrency);
        return sum + (converted ?? balance);
      }, 0);

    const totalLiabilities = accounts
      .filter(acc => ['Credit Card', 'Loan'].includes((acc.account_type || acc.accountType) || ''))
      .reduce((sum, account) => {
        const balance = Math.abs(account.balance ?? 0);
        const converted = convert?.(balance, account.currency || 'INR', selectedCurrency);
        return sum + (converted ?? balance);
      }, 0);

    const totalInvestments = investments
      .filter(inv => inv.status === 'Active')
      .reduce((sum, investment) => {
        const currentValue = (investment.current_value ?? investment.currentValue) ?? 0;
        const converted = convert?.(currentValue, investment.currency || 'INR', selectedCurrency);
        return sum + (converted ?? currentValue);
      }, 0);

    const totalAssets = bankBalance + totalInvestments;
    const netWorth = totalAssets - totalLiabilities;
    const netSavings = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      totalInvestments,
      bankBalance,
      totalLiabilities,
      totalAssets,
      netWorth,
    };
  };

  const generateMonthlyData = (
    incomes: Income[],
    expenses: Expense[],
    year: number
  ): MonthlyData[] => {
    const months = [];
    let cumulativeIncome = 0;
    let cumulativeExpenses = 0;
    let cumulativeNetSavings = 0;

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      const monthName = monthStart.toLocaleDateString('en-US', { 
        month: 'short', 
        year: '2-digit' 
      });

      // Calculate monthly income
      const monthlyIncome = incomes
        .filter(income => {
          const incomeDate = new Date(income.date);
          return incomeDate >= monthStart && incomeDate <= monthEnd;
        })
        .reduce((sum, income) => {
          const amount = income.amount ?? 0;
          const converted = convert?.(amount, income.currency || 'INR', selectedCurrency);
          return sum + (converted ?? amount);
        }, 0);

      // Calculate monthly expenses
      const monthlyExpenses = expenses
        .filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= monthStart && expenseDate <= monthEnd;
        })
        .reduce((sum, expense) => {
          const amount = expense.amount ?? 0;
          const converted = convert?.(amount, expense.currency || 'INR', selectedCurrency);
          return sum + (converted ?? amount);
        }, 0);

      const monthlyNetSavings = monthlyIncome - monthlyExpenses;
      
      cumulativeIncome += monthlyIncome;
      cumulativeExpenses += monthlyExpenses;
      cumulativeNetSavings += monthlyNetSavings;

      months.push({
        month: monthName,
        income: monthlyIncome,
        expenses: monthlyExpenses,
        netSavings: monthlyNetSavings,
        cumulativeIncome,
        cumulativeExpenses,
        cumulativeNetSavings,
      });
    }

    return months;
  };

  const generateYearlyData = (
    accounts: BankAccount[],
    incomes: Income[],
    expenses: Expense[],
    investments: Investment[]
  ): YearlyData[] => {
    const years = [];
    const currentYear = new Date().getFullYear();

    for (let year = currentYear - 4; year <= currentYear; year++) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const yearlyIncome = incomes
        .filter(income => {
          const incomeDate = new Date(income.date);
          return incomeDate >= yearStart && incomeDate <= yearEnd;
        })
        .reduce((sum, income) => {
          const amount = income.amount ?? 0;
          const converted = convert?.(amount, income.currency || 'INR', selectedCurrency);
          return sum + (converted ?? amount);
        }, 0);

      const yearlyExpenses = expenses
        .filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= yearStart && expenseDate <= yearEnd;
        })
        .reduce((sum, expense) => {
          const amount = expense.amount ?? 0;
          const converted = convert?.(amount, expense.currency || 'INR', selectedCurrency);
          return sum + (converted ?? amount);
        }, 0);

      const netSavings = yearlyIncome - yearlyExpenses;

      // For current year, use actual values; for past years, use historical data
      const endingBalance = year === currentYear ? currentSnapshot.bankBalance : 0;
      const investmentValue = year === currentYear ? currentSnapshot.totalInvestments : 0;
      const liabilities = year === currentYear ? currentSnapshot.totalLiabilities : 0;

      years.push({
        year,
        totalIncome: yearlyIncome,
        totalExpenses: yearlyExpenses,
        netSavings,
        endingBalance,
        investments: investmentValue,
        liabilities,
      });
    }

    return years;
  };

  const generateChartData = (
    incomes: Income[],
    expenses: Expense[],
    investments: Investment[],
    monthlyData: MonthlyData[]
  ) => {
    // Monthly trend data
    const monthlyTrend = monthlyData.map(month => ({
      month: month.month,
      income: month.income,
      expenses: month.expenses,
      netSavings: month.netSavings,
      cumulativeIncome: month.cumulativeIncome,
      cumulativeExpenses: month.cumulativeExpenses,
    }));

    // Expense categories for selected year
    const categoryMap = new Map();
    expenses
      .filter(expense => new Date(expense.date).getFullYear() === selectedYear)
      .forEach(expense => {
        const current = categoryMap.get(expense.category) || 0;
        const amount = expense.amount ?? 0;
        const converted = convert?.(amount, expense.currency || 'INR', selectedCurrency);
        categoryMap.set(expense.category, current + (converted ?? amount));
      });

    const expenseCategories = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Investment allocation
    const investmentMap = new Map();
    investments
      .filter(inv => inv.status === 'Active')
      .forEach(investment => {
        const current = investmentMap.get(investment.type) || 0;
        const currentValue = (investment.current_value ?? investment.currentValue) ?? 0;
        const converted = convert?.(currentValue, investment.currency || 'INR', selectedCurrency);
        investmentMap.set(investment.type, current + (converted ?? currentValue));
      });

    const investmentAllocation = Array.from(investmentMap.entries())
      .map(([name, value]) => ({ name, value }));

    // Yearly comparison
    const yearlyComparison = yearlyData.map(year => ({
      year: year.year.toString(),
      income: year.totalIncome,
      expenses: year.totalExpenses,
      netSavings: year.netSavings,
    }));

    return {
      monthlyTrend,
      expenseCategories,
      investmentAllocation,
      yearlyComparison,
    };
  };

  const handleRefreshRates = async () => {
    await fetchRates(true);
    await loadOverviewData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select
            label="Currency"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            options={CURRENCIES.map(c => ({ value: c.code, label: `${c.name} (${c.symbol})` }))}
            className="w-48"
          />
          <Select
            label="Year"
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            options={availableYears.map(year => ({ value: year.toString(), label: year.toString() }))}
            className="w-32"
          />
        </div>
        <Button
          variant="outline"
          icon={RefreshCw}
          onClick={handleRefreshRates}
          size="sm"
        >
          Refresh Rates
        </Button>
      </div>

      {/* Current Financial Snapshot */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
          Current Financial Position
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Worth</p>
                <p className={`text-2xl font-bold ${currentSnapshot.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(currentSnapshot.netWorth, selectedCurrency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Assets - Liabilities</p>
              </div>
              <div className={`p-3 rounded-full ${currentSnapshot.netWorth >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <PiggyBank className={`h-6 w-6 ${currentSnapshot.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Assets</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(currentSnapshot.totalAssets, selectedCurrency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Cash + Investments</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bank Balance</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(currentSnapshot.bankBalance, selectedCurrency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Liquid Assets</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Investments</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(currentSnapshot.totalInvestments, selectedCurrency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Portfolio Value</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Liabilities</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(currentSnapshot.totalLiabilities, selectedCurrency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Debts & Loans</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <CreditCard className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(currentSnapshot.totalIncome, selectedCurrency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">All Time</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(currentSnapshot.totalExpenses, selectedCurrency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">All Time</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Savings</p>
                <p className={`text-2xl font-bold ${currentSnapshot.netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(currentSnapshot.netSavings, selectedCurrency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Income - Expenses</p>
              </div>
              <div className={`p-3 rounded-full ${currentSnapshot.netSavings >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <PiggyBank className={`h-6 w-6 ${currentSnapshot.netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Monthly Analysis */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-6 w-6 mr-2 text-blue-600" />
          Monthly Analysis - {selectedYear}
        </h3>
        
        {/* Monthly Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Year-to-Date Income</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(
                  monthlyData.reduce((sum, month) => sum + month.income, 0),
                  selectedCurrency
                )}
              </p>
              <div className="flex items-center justify-center mt-2 text-sm text-green-600">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                <span>Total Earned</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Year-to-Date Expenses</p>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(
                  monthlyData.reduce((sum, month) => sum + month.expenses, 0),
                  selectedCurrency
                )}
              </p>
              <div className="flex items-center justify-center mt-2 text-sm text-red-600">
                <ArrowDownRight className="h-4 w-4 mr-1" />
                <span>Total Spent</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Year-to-Date Net Savings</p>
              <p className={`text-3xl font-bold ${
                monthlyData.reduce((sum, month) => sum + month.netSavings, 0) >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {formatCurrency(
                  monthlyData.reduce((sum, month) => sum + month.netSavings, 0),
                  selectedCurrency
                )}
              </p>
              <div className="flex items-center justify-center mt-2 text-sm text-blue-600">
                <PiggyBank className="h-4 w-4 mr-1" />
                <span>Net Saved</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Monthly Trend Chart */}
        <Card title="Monthly Financial Trend" className="mb-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value, selectedCurrency)}
                />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  name="Monthly Income"
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#EF4444" 
                  strokeWidth={3}
                  name="Monthly Expenses"
                />
                <Line 
                  type="monotone" 
                  dataKey="netSavings" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  name="Monthly Net Savings"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Cumulative Trend Chart */}
        <Card title="Cumulative Financial Accumulation" className="mb-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value, selectedCurrency)}
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativeIncome" 
                  stackId="1"
                  stroke="#10B981" 
                  fill="#10B981"
                  fillOpacity={0.6}
                  name="Cumulative Income"
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativeExpenses" 
                  stackId="2"
                  stroke="#EF4444" 
                  fill="#EF4444"
                  fillOpacity={0.6}
                  name="Cumulative Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Yearly Comparison */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
          5-Year Financial Overview
        </h3>
        
        {/* Yearly Summary Table */}
        <Card className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Income</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Expenses</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Savings</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Savings Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {yearlyData.map((year) => {
                  const savingsRate = year.totalIncome > 0 ? (year.netSavings / year.totalIncome) * 100 : 0;
                  return (
                    <tr key={year.year} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {year.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                        {formatCurrency(year.totalIncome, selectedCurrency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                        {formatCurrency(year.totalExpenses, selectedCurrency)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        year.netSavings >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(year.netSavings, selectedCurrency)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        savingsRate >= 20 ? 'text-green-600' : 
                        savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {savingsRate.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Yearly Comparison Chart */}
        <Card title="5-Year Income vs Expenses Comparison">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.yearlyComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value, selectedCurrency)}
                />
                <Bar dataKey="income" fill="#10B981" name="Income" />
                <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
                <Bar dataKey="netSavings" fill="#3B82F6" name="Net Savings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Categories */}
        <Card title={`Expense Categories - ${selectedYear}`}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.expenseCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.expenseCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value, selectedCurrency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Investment Allocation */}
        <Card title="Current Investment Allocation">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.investmentAllocation}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.investmentAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value, selectedCurrency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}