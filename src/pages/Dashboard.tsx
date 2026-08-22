import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, getCurrentMonth } from '../utils/format';
import { calculateTotalSpent, checkOverspending, getRemainingBudgetForCategory, getUnallocatedIncome, calculateSpentByCategory } from '../services/budgetEngine';
import { ArrowUpCircle, ArrowDownCircle, AlertTriangle, PlusCircle, ArrowDownRight } from 'lucide-react';
import { ExpenseDonutChart } from '../components/analytics/ExpenseDonutChart';
import { TrendBarChart } from '../components/analytics/TrendBarChart';

export const Dashboard = () => {
  const { t } = useTranslation();
  const { budgets, transactions, accounts, categories, addTransaction, addIncome, funds, debts } = useFinanceStore();
  
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  // Modals state
  const [amount, setAmount] = useState('');
  const [incomeComment, setIncomeComment] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  const currentMonth = getCurrentMonth();
  
  const currentBudget = budgets.find(b => b.month === currentMonth);
  const totalBudget = currentBudget?.categories.reduce((acc, c) => acc + c.limit, 0) || 0;
  
  const spentThisMonth = calculateTotalSpent(transactions, currentMonth);
  const remainingBudget = totalBudget - spentThisMonth;
  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  const totalFundCurrent = funds.reduce((acc, f) => acc + f.currentAmount, 0);
  const totalFundTarget = funds.reduce((acc, f) => acc + f.targetAmount, 0) || 1; // Prevent div by 0

  const totalDebtOriginal = debts.reduce((acc, d) => acc + d.originalAmount, 0) || 1;
  const totalDebtRemaining = debts.reduce((acc, d) => acc + d.remainingAmount, 0);
  
  const progressPercent = totalBudget > 0 ? Math.min((spentThisMonth / totalBudget) * 100, 100) : 0;
  
  const unallocated = currentBudget ? getUnallocatedIncome(currentBudget) : 0;

  // Chart Data Processing
  const donutData = currentBudget?.categories.map(cat => ({
    label: categories.find(c => c.id === cat.categoryId)?.name || 'Белгисиз',
    value: calculateSpentByCategory(transactions, cat.categoryId, currentMonth),
    color: categories.find(c => c.id === cat.categoryId)?.color || '#9ca3af'
  })) || [];

  // Trend Data for last 6 months
  const generateTrendData = () => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toISOString().substring(0, 7); // YYYY-MM
      const label = d.toLocaleString('default', { month: 'short' });
      
      const income = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(monthStr))
        .reduce((sum, t) => sum + t.amount, 0);
        
      const expense = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
        .reduce((sum, t) => sum + t.amount, 0);
        
      data.push({ label, income, expense });
    }
    return data;
  };

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && accounts.length > 0) {
      addIncome(Number(amount), accounts[0].id, incomeComment);
      setShowIncomeModal(false);
      setAmount('');
      setIncomeComment('');
    }
  };

  const submitExpense = (force = false) => {
    if (!amount || !categoryId || accounts.length === 0) return;
    
    const numAmount = Number(amount);
    
    // Check overspending
    if (!force && currentBudget) {
      const spentSoFar = calculateSpentByCategory(transactions, categoryId, currentMonth);
      if (checkOverspending(currentBudget, categoryId, spentSoFar, numAmount)) {
        setShowWarning(true);
        return;
      }
    }
    
    addTransaction({
      familyId: accounts[0].familyId,
      userId: 'current-user', 
      date: new Date().toISOString(),
      type: 'expense',
      amount: numAmount,
      accountId: accounts[0].id,
      categoryId,
      isOverBudget: force
    });
    
    setShowExpenseModal(false);
    setShowWarning(false);
    setAmount('');
    setCategoryId('');
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    submitExpense(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">{t('dashboard')}</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('total_balance')}</p>
        <h2 className="text-4xl font-bold mt-2 dark:text-white">{formatCurrency(totalBalance)}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Donut Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4 dark:text-white">Бул айда қәрежетлер</h3>
          <ExpenseDonutChart data={donutData} />
        </div>

        {/* 6 Months Trend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4 dark:text-white">Дәрамат ҳәм қәрежет тренди</h3>
          <TrendBarChart data={generateTrendData()} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setShowIncomeModal(true)}
          className="bg-primary-600 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
        >
          <PlusCircle size={24} />
          <span className="font-medium">Кирис қосыў</span>
        </button>
        <button 
          onClick={() => setShowExpenseModal(true)}
          className="bg-red-500 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-red-600 transition-colors"
        >
          <ArrowDownRight size={24} />
          <span className="font-medium">Шығыс қосыў</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="text-xl">🛡</span> ҚОРЛАР
            </h3>
          </div>
          <div className="flex justify-between mb-2">
            <div>
              <p className="text-sm text-gray-500">Жыйналған қор</p>
              <p className="text-xl font-bold">{formatCurrency(totalFundCurrent)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Мақсет</p>
              <p className="text-xl font-bold">{formatCurrency(totalFundTarget)}</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
            <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${Math.min(100, Math.round((totalFundCurrent/totalFundTarget)*100))}%` }}></div>
          </div>
          <p className="text-sm text-gray-500 font-bold text-right">{Math.round((totalFundCurrent/totalFundTarget)*100)}%</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="text-xl">💳</span> ҚАРЫЗДАН ҚУТЫЛЫЎ
            </h3>
          </div>
          <div className="flex justify-between mb-2">
            <div>
              <p className="text-sm text-gray-500">Қалған қарыз</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebtRemaining)}</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
            <div className="bg-red-500 h-3 rounded-full" style={{ width: `${Math.min(100, Math.round(((totalDebtOriginal - totalDebtRemaining) / totalDebtOriginal) * 100))}%` }}></div>
          </div>
          <p className="text-sm text-gray-500 font-bold text-right">{Math.round(((totalDebtOriginal - totalDebtRemaining) / totalDebtOriginal) * 100)}% жабылды</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <h3 className="font-semibold mb-4 text-lg">{t('budget')} (Усы ай)</h3>
        
        {currentBudget && unallocated === 0 ? (
           <p className="text-sm text-green-600 bg-green-50 p-2 rounded-lg mb-4 text-center font-medium">
             {t('budget_allocated')}
           </p>
        ) : (
           <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-lg mb-4 text-center font-medium">
             {t('unallocated')}: {formatCurrency(unallocated)}
           </p>
        )}

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('monthly_income')}</span>
            <span className="font-medium">{formatCurrency(totalBudget)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('spent_this_month')}</span>
            <span className="font-medium text-red-600">{formatCurrency(spentThisMonth)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('remaining_budget')}</span>
            <span className="font-medium text-green-600">{formatCurrency(remainingBudget)}</span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-3 mt-4">
            <div 
              className={`h-3 rounded-full ${progressPercent > 90 ? 'bg-red-500' : progressPercent > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
        
        <div className="mt-6 space-y-3">
          <h4 className="font-medium text-sm text-gray-500">Категориялар (Category Limits)</h4>
          {currentBudget?.categories.map(cb => {
            const cat = categories.find(c => c.id === cb.categoryId);
            const spent = calculateSpentByCategory(transactions, cb.categoryId, currentMonth);
            const rem = cb.limit - spent;
            return (
              <div key={cb.id} className="flex justify-between text-sm border-b pb-2">
                <span>{cat?.name}</span>
                <span className={rem < 0 ? 'text-red-500 font-bold' : ''}>
                  {formatCurrency(rem)} қалды / {formatCurrency(cb.limit)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm border dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4">{t('add_income')}</h3>
            <form onSubmit={handleAddIncome} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('amount')}</label>
                <input 
                  type="number" 
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Қайдан келди? (Кирис дереги)</label>
                <input 
                  type="text" 
                  value={incomeComment}
                  onChange={e => setIncomeComment(e.target.value)}
                  placeholder="Мысалы: Айлық, Бизнес, Сыйлық..."
                  className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowIncomeModal(false)} className="flex-1 py-2 bg-gray-100 rounded-lg">{t('cancel')}</button>
                <button type="submit" className="flex-1 py-2 bg-green-600 text-white rounded-lg">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm border dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4">{t('add_expense')}</h3>
            
            {showWarning ? (
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-xl flex flex-col items-center text-center">
                  <AlertTriangle className="text-red-500 mb-2" size={32} />
                  <h4 className="font-bold text-red-700">{t('warning_overbudget')}</h4>
                  <p className="text-sm text-red-600 mt-1">{t('warning_overbudget_desc')}</p>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button onClick={() => setShowWarning(false)} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-700">{t('cancel')}</button>
                  <button onClick={() => submitExpense(true)} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium">{t('add_anyway')}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('amount')}</label>
                  <input 
                    type="number" 
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('category')}</label>
                  <select 
                    required
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="">Таңлаң...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => { setShowExpenseModal(false); setShowWarning(false); }} className="flex-1 py-2 bg-gray-100 rounded-lg">{t('cancel')}</button>
                  <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-lg">{t('save')}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
