import React, { useState, useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatMonthName, getCurrentMonth } from '../utils/format';
import { 
  Period, filterTransactionsByPeriod, calculateFinancialSummary, 
  calculateBudgetVsActual, calculateFundAnalytics, calculateDebtAnalytics, 
  compareWithPreviousMonth, detectUnusualSpending, calculateFinancialHealthScore, 
  generateSmartInsights, getCashFlowData
} from '../services/analyticsEngine';
import { PieChart, TrendingUp, TrendingDown, Activity, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';

export const Analytics = () => {
  const { transactions, budgets, categories, funds, debts } = useFinanceStore();
  const [periodType, setPeriodType] = useState<string>('current_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const period: Period = useMemo(() => {
    if (periodType === 'custom' && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    return (periodType !== 'custom' ? periodType : 'current_month') as Period;
  }, [periodType, customStart, customEnd]);

  // Filter Data
  const filteredTx = useMemo(() => filterTransactionsByPeriod(transactions, period), [transactions, period]);
  const prevPeriodTx = useMemo(() => filterTransactionsByPeriod(transactions, 'last_month'), [transactions]); // hardcoded last month for M2M comparison
  
  // Computations
  const summary = useMemo(() => calculateFinancialSummary(filteredTx, funds), [filteredTx, funds]);
  const prevSummary = useMemo(() => calculateFinancialSummary(prevPeriodTx, funds), [prevPeriodTx, funds]);
  const budgetActuals = useMemo(() => calculateBudgetVsActual(budgets.find(b => b.month === getCurrentMonth()), filteredTx, categories), [budgets, filteredTx, categories]);
  const fundAnalytics = useMemo(() => calculateFundAnalytics(funds), [funds]);
  const debtAnalytics = useMemo(() => calculateDebtAnalytics(debts, filteredTx), [debts, filteredTx]);
  const m2m = useMemo(() => compareWithPreviousMonth(filteredTx, prevPeriodTx, funds), [filteredTx, prevPeriodTx, funds]);
  const unusual = useMemo(() => detectUnusualSpending(filteredTx, prevPeriodTx, categories), [filteredTx, prevPeriodTx, categories]);
  const health = useMemo(() => calculateFinancialHealthScore(budgetActuals, summary.savingsRate, funds, debts, summary.income), [budgetActuals, summary.savingsRate, funds, debts, summary.income]);
  const insights = useMemo(() => generateSmartInsights(summary, prevSummary, budgetActuals, unusual, health), [summary, prevSummary, budgetActuals, unusual, health]);
  const cashFlow = useMemo(() => getCashFlowData(transactions, funds), [transactions, funds]); // always show full history for chart

  const isEmpty = summary.income === 0 && summary.expense === 0 && summary.savings === 0 && summary.debtPaymentTotal === 0 && summary.debtorsLent === 0;

  const renderChange = (val: number | 'new') => {
    if (val === 'new') return <span className="text-gray-500 dark:text-gray-400 text-xs">Jańa</span>;
    if (val === 0) return <span className="text-gray-500 dark:text-gray-400 text-xs">Өзгерис жоқ</span>;
    if (val > 0) return <span className="text-green-600 text-xs flex items-center gap-1"><TrendingUp size={12}/> +{val.toFixed(1)}%</span>;
    return <span className="text-red-600 text-xs flex items-center gap-1"><TrendingDown size={12}/> {val.toFixed(1)}%</span>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-white"><PieChart /> Analitika</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <select 
            value={periodType} 
            onChange={(e) => setPeriodType(e.target.value)}
            className="bg-gray-50 dark:bg-gray-700 dark:text-white border dark:border-gray-700 border-gray-200 dark:border-gray-700 rounded-lg p-2 font-medium"
          >
            <option value="current_month">Бул ай</option>
            <option value="last_month">Ótken ay</option>
            <option value="last_3_months">Sońǵı 3 ay</option>
            <option value="last_6_months">Sońǵı 6 ay</option>
            <option value="this_year">Бул жыл</option>
            <option value="custom">Basqa waqıt</option>
          </select>
          {periodType === 'custom' && (
            <div className="flex gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border rounded-lg p-2 text-sm dark:bg-gray-800 dark:text-white" />
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border rounded-lg p-2 text-sm dark:bg-gray-800 dark:text-white" />
            </div>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl shadow-sm text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Бул периодта мәлимлеме жоқ.</p>
        </div>
      ) : (
        <>
          {/* 1. Health & Insights Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl text-white shadow-sm flex flex-col justify-center items-center text-center">
              <h3 className="text-indigo-100 font-medium mb-2 flex items-center gap-2"><Activity size={18}/> Финанслық Жағдай</h3>
              <div className="text-5xl font-black mb-1">{health.total}</div>
              <div className="text-lg font-bold bg-white dark:bg-gray-800/20 px-4 py-1 rounded-full dark:text-white">{health.label}</div>
            </div>
            
            <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 border-gray-100 dark:border-gray-700 dark:text-white">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><Lightbulb className="text-yellow-500" size={20}/> Aqıllı keńesler (Jasalma intellekt)</h3>
              <div className="space-y-3">
                {insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {ins.type === 'positive' ? <CheckCircle className="text-green-500 shrink-0" size={18}/> : 
                     ins.type === 'warning' ? <AlertCircle className="text-yellow-500 shrink-0" size={18}/> : 
                     <AlertCircle className="text-red-500 shrink-0" size={18}/>}
                    <p className="text-sm text-gray-700 dark:text-gray-300">{ins.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Financial Summary KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border dark:border-gray-700 dark:text-white">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ulıwma dáramat</p>
              <p className="font-bold text-xl text-gray-900 dark:text-white mb-2">{formatCurrency(summary.income)}</p>
              {renderChange(m2m.incomeChange)}
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border dark:border-gray-700 dark:text-white">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ulıwma shıǵıs</p>
              <p className="font-bold text-xl text-red-600 mb-2">{formatCurrency(summary.expense)}</p>
              {renderChange(m2m.expenseChange)}
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border dark:border-gray-700 dark:text-white">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Jıynaq (Procenti: {summary.savingsRate.toFixed(1)}%)</p>
              <p className="font-bold text-xl text-green-600 mb-2">{formatCurrency(summary.savings)}</p>
              {renderChange(m2m.savingsChange)}
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border dark:border-gray-700 dark:text-white">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Debitor (Bergen qarız)</p>
              <p className="font-bold text-xl text-yellow-500 mb-2">{formatCurrency(summary.debtorsLent)}</p>
              {renderChange(m2m.debtorsLentChange)}
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border dark:border-gray-700 dark:text-white">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Qarız tólemleri</p>
              <p className="font-bold text-xl text-gray-900 dark:text-white mb-1">{formatCurrency(summary.debtPaymentTotal)}</p>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 flex justify-between mt-2">
                <span>P: {formatCurrency(summary.debtPrincipal)}</span>
                <span>I: {formatCurrency(summary.debtInterest)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cash Flow */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 dark:text-white">
              <h3 className="font-bold text-lg mb-4 dark:text-white">Pul aylanbası</h3>
              <div className="space-y-4">
                {cashFlow.slice(-4).map((cf) => {
                  const total = cf.income + cf.expense + cf.savings + cf.debtorsLent + cf.debtPayment || 1;
                  return (
                    <div key={cf.month} className="mb-2">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">{cf.month}</p>
                      <div className="flex h-3 rounded-full overflow-hidden">
                        <div style={{ width: `${(cf.income / total) * 100}%` }} className="bg-green-500"></div>
                        <div style={{ width: `${(cf.expense / total) * 100}%` }} className="bg-red-500"></div>
                        <div style={{ width: `${(cf.savings / total) * 100}%` }} className="bg-blue-500"></div>
                        <div style={{ width: `${(cf.debtorsLent / total) * 100}%` }} className="bg-yellow-500"></div>
                        <div style={{ width: `${(cf.debtPayment / total) * 100}%` }} className="bg-orange-500"></div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-wrap gap-3 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 justify-center mt-4">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div>Dáramat</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div>Shıǵıs</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div>Jıynaq</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div>Debitor</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-500 rounded-full"></div>Qarız</span>
                </div>
              </div>
            </div>

            {/* Expense Breakdown (Top 5) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 dark:text-white">
              <h3 className="font-bold text-lg mb-4 dark:text-white">Eń kóp jumsalǵan 5 shıǵıs (Top-5)</h3>
              <div className="space-y-4">
                {[...budgetActuals].sort((a, b) => b.actualAmount - a.actualAmount).slice(0, 5).map(cat => {
                  const totalCategorySpent = budgetActuals.reduce((sum, c) => sum + c.actualAmount, 0);
                  const percent = totalCategorySpent > 0 ? (cat.actualAmount / totalCategorySpent) * 100 : 0;
                  return (
                    <div key={cat.categoryId}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{cat.categoryName}</span>
                        <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(cat.actualAmount)} ({percent.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-red-700 h-2 rounded-full" style={{ width: `${Math.min(100, percent)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Funds Progress */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 dark:text-white">
              <h3 className="font-bold text-lg mb-4 text-blue-900 dark:text-white">Qorlar Analitikaсы</h3>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Жалпы баланс</span>
                <span className="font-bold dark:text-white">{formatCurrency(fundAnalytics.totalCurrent)} / {formatCurrency(fundAnalytics.totalTarget)}</span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-4 mb-4">
                <div className="bg-blue-600 h-4 rounded-full transition-all" style={{ width: `${fundAnalytics.overallProgress}%` }}></div>
              </div>
              
              <div className="space-y-3 mt-6">
                {fundAnalytics.fundDetails.map(f => (
                  <div key={f.id} className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="font-medium">{f.name}</span>
                    <div className="text-right">
                      <span className="font-bold text-blue-700 dark:text-white">{f.progress.toFixed(0)}%</span>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Мерзим: {f.estimatedTargetDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Debts Progress */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 dark:text-white">
              <h3 className="font-bold text-lg mb-4 text-orange-900 dark:text-white">Qarız Analitikaсы</h3>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Жалпы қарыз қалдығы</span>
                <span className="font-bold text-orange-600 dark:text-white">{formatCurrency(debtAnalytics.remainingDebt)} / {formatCurrency(debtAnalytics.originalDebt)}</span>
              </div>
              <div className="w-full bg-orange-100 rounded-full h-4 mb-4">
                <div className="bg-orange-500 h-4 rounded-full transition-all" style={{ width: `${debtAnalytics.debtProgress}%` }}></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6 border-t pt-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tiykarǵı qarız</p>
                  <p className="font-bold text-green-600">{formatCurrency(debtAnalytics.principalPaid)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Procentlik ústeme</p>
                  <p className="font-bold text-red-600">{formatCurrency(debtAnalytics.interestPaid)}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Budget vs Actual */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 dark:text-white">
            <h3 className="font-bold text-lg mb-4 dark:text-white">Budjettiń orınlanıwı</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetActuals.map(cat => (
                <div key={cat.categoryId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 dark:text-white rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">{cat.categoryName}</p>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Сарпланды: {formatCurrency(cat.actualAmount)}</span>
                      <span>Лимит: {formatCurrency(cat.budgetAmount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${cat.status === 'over' ? 'bg-red-500' : cat.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, cat.utilizationPercent || (cat.status==='over'?100:0))}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="ml-4 text-right min-w-[60px]">
                    <span className={`text-xs font-bold ${cat.status === 'over' ? 'text-red-600' : cat.status === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                      {cat.status === 'over' ? 'OVER' : cat.utilizationPercent !== null ? `${cat.utilizationPercent.toFixed(0)}%` : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};




