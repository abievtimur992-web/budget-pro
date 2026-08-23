import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, getCurrentMonth } from '../utils/format';
import { calculateTotalSpent, checkOverspending, getRemainingBudgetForCategory, getUnallocatedIncome, calculateSpentByCategory } from '../services/budgetEngine';
import { ArrowUpCircle, ArrowDownCircle, AlertTriangle, PlusCircle, ArrowDownRight, ArrowRightLeft } from 'lucide-react';
import { ExpenseDonutChart } from '../components/analytics/ExpenseDonutChart';
import { TrendBarChart } from '../components/analytics/TrendBarChart';

export const Dashboard = () => {
  const { t } = useTranslation();
  const { budgets, transactions, accounts, categories, addTransaction, addIncome, funds, debts } = useFinanceStore();
  
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // Modals state
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expenseComment, setExpenseComment] = useState('');
  
  const [incomeComment, setIncomeComment] = useState('');
  
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
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
  const CHART_COLORS = ['#0ea5e9', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
  
  const donutData = currentBudget?.categories.map((cat, index) => {
    // We intentionally sort or just use map index, but map index is fine for now
    return {
      label: categories.find(c => c.id === cat.categoryId)?.name || 'Belgisiz',
      value: calculateSpentByCategory(transactions, cat.categoryId, currentMonth),
      color: CHART_COLORS[index % CHART_COLORS.length]
    };
  }) || [];

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
      addIncome(Number(amount), accounts[0].id, incomeComment, categoryId);
      setShowIncomeModal(false);
      setAmount('');
      setIncomeComment('');
      setCategoryId('');
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
      comment: expenseComment,
      isOverBudget: force
    });
    
    setShowExpenseModal(false);
    setShowWarning(false);
    setAmount('');
    setCategoryId('');
    setExpenseComment('');
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    submitExpense(false);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferAmount && transferFrom && transferTo && transferFrom !== transferTo) {
      addTransaction({
        familyId: accounts[0]?.familyId || 'local',
        userId: 'current-user',
        date: new Date().toISOString(),
        type: 'transfer',
        amount: Number(transferAmount),
        accountId: transferFrom,
        targetAccountId: transferTo,
        comment: 'Awıstırw (Perevod)'
      });
      setShowTransferModal(false);
      setTransferAmount('');
      setTransferFrom('');
      setTransferTo('');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">{t('dashboard')}</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 dark:text-white">
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('total_balance')}</p>
        <h2 className="text-4xl font-bold mt-2 dark:text-white">{formatCurrency(totalBalance)}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Donut Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 dark:text-white">
          <h3 className="font-bold text-lg mb-4 dark:text-white">Bwl ayda qárejetler</h3>
          <ExpenseDonutChart data={donutData} />
        </div>

        {/* 6 Months Trend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 dark:text-white">
          <h3 className="font-bold text-lg mb-4 dark:text-white">Dáramat ҳám qárejet trendi</h3>
          <TrendBarChart data={generateTrendData()} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button 
          onClick={() => setShowIncomeModal(true)}
          className="bg-primary-600 text-white p-2 md:p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
        >
          <PlusCircle size={24} />
          <span className="font-medium text-[11px] md:text-sm text-center">Dáramat</span>
        </button>
        <button 
          onClick={() => setShowExpenseModal(true)}
          className="bg-red-500 text-white p-2 md:p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-red-600 transition-colors"
        >
          <ArrowDownRight size={24} />
          <span className="font-medium text-[11px] md:text-sm text-center">Shıǵıs</span>
        </button>
        <button 
          onClick={() => setShowTransferModal(true)}
          className="bg-blue-500 text-white p-2 md:p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
        >
          <ArrowRightLeft size={24} />
          <span className="font-medium text-[11px] md:text-sm text-center">Awıstırw</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border dark:border-gray-700 border-gray-100 dark:border-gray-700 flex flex-col dark:text-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="text-xl">🛡</span> QORLAR
            </h3>
          </div>
          <div className="flex justify-between mb-2">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Jıynalǵan qor</p>
              <p className="text-xl font-bold dark:text-white">{formatCurrency(totalFundCurrent)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Maqset</p>
              <p className="text-xl font-bold dark:text-white">{formatCurrency(totalFundTarget)}</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
            <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${Math.min(100, Math.round((totalFundCurrent/totalFundTarget)*100))}%` }}></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-bold text-right">{Math.round((totalFundCurrent/totalFundTarget)*100)}%</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border dark:border-gray-700 border-gray-100 dark:border-gray-700 flex flex-col dark:text-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="text-xl">💳</span> QARIZDAN QWTILIЎ
            </h3>
          </div>
          <div className="flex justify-between mb-2">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Qalǵan qarız</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebtRemaining)}</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
            <div className="bg-red-500 h-3 rounded-full" style={{ width: `${Math.min(100, Math.round(((totalDebtOriginal - totalDebtRemaining) / totalDebtOriginal) * 100))}%` }}></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-bold text-right">{Math.round(((totalDebtOriginal - totalDebtRemaining) / totalDebtOriginal) * 100)}% jabıldı</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 dark:text-white">
        <h3 className="font-semibold mb-4 text-lg">{t('budget')} (Wsı ay)</h3>
        
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
            <span className="text-gray-500 dark:text-gray-400">{t('monthly_income')}</span>
            <span className="font-medium">{formatCurrency(totalBudget)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('spent_this_month')}</span>
            <span className="font-medium text-red-600">{formatCurrency(spentThisMonth)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('remaining_budget')}</span>
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
          <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">Kategoriyalar (Category Limits)</h4>
          {currentBudget?.categories.map(cb => {
            const cat = categories.find(c => c.id === cb.categoryId);
            const spent = calculateSpentByCategory(transactions, cb.categoryId, currentMonth);
            const rem = cb.limit - spent;
            return (
              <div key={cb.id} className="flex justify-between text-sm border-b pb-2">
                <span>{cat?.name}</span>
                <span className={rem < 0 ? 'text-red-500 font-bold' : ''}>
                  {formatCurrency(rem)} qaldı / {formatCurrency(cb.limit)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm border dark:border-gray-700 dark:text-white">
            <h3 className="text-xl font-bold mb-4 dark:text-white">{t('add_income')}</h3>
            <form onSubmit={handleAddIncome} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('amount')}</label>
                <input 
                  type="number" 
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kategoriya (Derek)</label>
                <select 
                  required
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="">Tańlań...</option>
                  {categories.filter(c => c.type === 'income').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kommentariy (Qaydan keldi?)</label>
                <input 
                  type="text" 
                  value={incomeComment}
                  onChange={e => setIncomeComment(e.target.value)}
                  placeholder="Qosımsha túsinikteme..."
                  className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm border dark:border-gray-700 dark:text-white">
            <h3 className="text-xl font-bold mb-4 dark:text-white">{t('add_expense')}</h3>
            
            {showWarning ? (
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-xl flex flex-col items-center text-center">
                  <AlertTriangle className="text-red-500 mb-2" size={32} />
                  <h4 className="font-bold text-red-700">{t('warning_overbudget')}</h4>
                  <p className="text-sm text-red-600 mt-1">{t('warning_overbudget_desc')}</p>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button onClick={() => setShowWarning(false)} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-700 dark:text-gray-300">{t('cancel')}</button>
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
                    className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('category')}</label>
                  <select 
                    required
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="">Tańlań...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kommentariy (Ne úshin?)</label>
                  <input 
                    type="text" 
                    value={expenseComment}
                    onChange={e => setExpenseComment(e.target.value)}
                    placeholder="Mısalı: swpermarketten azıq-túlik..."
                    className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
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

      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm border dark:border-gray-700 dark:text-white">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Aqsha awıstırw (Perevod)</h3>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Swmma</label>
                <input 
                  type="number" 
                  required
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Qaydan jiberesiz?</label>
                <select 
                  required
                  value={transferFrom}
                  onChange={e => setTransferFrom(e.target.value)}
                  className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="">Tańdańız...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Qayda jiberesiz?</label>
                <select 
                  required
                  value={transferTo}
                  onChange={e => setTransferTo(e.target.value)}
                  className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="">Tańdańız...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 py-2 bg-gray-100 rounded-lg">Bekarlaw</button>
                <button type="submit" className="flex-1 py-2 bg-blue-500 text-white rounded-lg">Jiberw</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};




