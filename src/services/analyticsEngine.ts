import { Transaction, Budget, Fund, Debt, Category } from '../types';
import { getCurrentMonth, getPreviousMonth } from '../utils/format';

export type Period = 'current_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | { start: string, end: string };

export interface FinancialSummary {
  income: number;
  expense: number; // ordinary + interest
  savings: number; // fund_contribution
  debtPaymentTotal: number;
  debtPrincipal: number;
  debtInterest: number;
  savingsRate: number;
}

export interface CategoryActual {
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  actualAmount: number;
  remainingAmount: number;
  utilizationPercent: number | null;
  status: 'normal' | 'warning' | 'over';
}

// ---------------------------------------------------------
// 1. Core Filtering Helpers
// ---------------------------------------------------------
export const filterTransactionsByPeriod = (transactions: Transaction[], period: Period): Transaction[] => {
  const d = new Date();
  let start: Date, end: Date;

  if (typeof period === 'object') {
    start = new Date(period.start);
    end = new Date(period.end);
    end.setHours(23, 59, 59, 999);
  } else {
    end = new Date();
    start = new Date();
    if (period === 'current_month') {
      start = new Date(d.getFullYear(), d.getMonth(), 1);
    } else if (period === 'last_month') {
      start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      end = new Date(d.getFullYear(), d.getMonth(), 0);
    } else if (period === 'last_3_months') {
      start = new Date(d.getFullYear(), d.getMonth() - 2, 1);
    } else if (period === 'last_6_months') {
      start = new Date(d.getFullYear(), d.getMonth() - 5, 1);
    } else if (period === 'this_year') {
      start = new Date(d.getFullYear(), 0, 1);
    }
  }

  return transactions.filter(t => {
    const td = new Date(t.date);
    return td >= start && td <= end;
  });
};

// ---------------------------------------------------------
// 2. Financial Summary & Savings Rate
// ---------------------------------------------------------
export const calculateFinancialSummary = (transactions: Transaction[]): FinancialSummary => {
  let income = 0;
  let ordinaryExpense = 0;
  let savings = 0;
  let debtPrincipal = 0;
  let debtInterest = 0;

  transactions.forEach(t => {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') ordinaryExpense += t.amount;
    else if (t.type === 'fund_contribution') savings += t.amount;
    else if (t.type === 'debt_payment') {
      debtPrincipal += (t.principalPortion || 0);
      debtInterest += (t.interestPortion || 0);
    }
  });

  const expense = ordinaryExpense + debtInterest;
  const debtPaymentTotal = debtPrincipal + debtInterest;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  return { income, expense, savings, debtPaymentTotal, debtPrincipal, debtInterest, savingsRate };
};

// ---------------------------------------------------------
// 3. Budget vs Actual
// ---------------------------------------------------------
export const calculateBudgetVsActual = (
  budget: Budget | undefined,
  transactions: Transaction[], // Should be pre-filtered for the budget month
  categories: Category[]
): CategoryActual[] => {
  const result: CategoryActual[] = [];

  categories.forEach(cat => {
    const bCat = budget?.categories.find(c => c.categoryId === cat.id);
    const budgetAmount = bCat ? bCat.limit : 0;
    
    // Expenses only (no fund contribution, no debt principal)
    const actualAmount = transactions
      .filter(t => (t.type === 'expense' && t.categoryId === cat.id))
      .reduce((sum, t) => sum + t.amount, 0);

    if (budgetAmount === 0 && actualAmount === 0) return;

    let utilizationPercent = null;
    let status: 'normal' | 'warning' | 'over' = 'normal';

    if (budgetAmount === 0) {
      if (actualAmount > 0) status = 'over';
    } else {
      utilizationPercent = (actualAmount / budgetAmount) * 100;
      if (utilizationPercent > 100) status = 'over';
      else if (utilizationPercent >= 80) status = 'warning';
      else status = 'normal';
    }

    result.push({
      categoryId: cat.id,
      categoryName: cat.name,
      budgetAmount,
      actualAmount,
      remainingAmount: budgetAmount - actualAmount,
      utilizationPercent,
      status
    });
  });

  return result.sort((a, b) => b.actualAmount - a.actualAmount);
};

// ---------------------------------------------------------
// 4. Fund & Debt Analytics
// ---------------------------------------------------------
export const calculateFundAnalytics = (funds: Fund[]) => {
  let totalCurrent = 0;
  let totalTarget = 0;
  let totalMonthlyContribution = 0;

  const fundDetails = funds.map(f => {
    totalCurrent += f.currentAmount;
    totalTarget += f.targetAmount;
    totalMonthlyContribution += f.monthlyContribution;
    
    const remaining = Math.max(0, f.targetAmount - f.currentAmount);
    const progress = f.targetAmount > 0 ? Math.min(100, (f.currentAmount / f.targetAmount) * 100) : 100;
    const estimatedMonths = (f.monthlyContribution > 0 && remaining > 0) ? Math.ceil(remaining / f.monthlyContribution) : 0;
    
    let estimatedTargetDate = 'Completed';
    if (estimatedMonths > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() + estimatedMonths);
      const monthsArr = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
      estimatedTargetDate = `${monthsArr[d.getMonth()]} ${d.getFullYear()}`;
    }

    return { ...f, progress, remaining, estimatedMonths, estimatedTargetDate };
  });

  const overallProgress = totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : (funds.length > 0 ? 100 : 0);

  return { totalCurrent, totalTarget, overallProgress, totalMonthlyContribution, fundDetails };
};

export const calculateDebtAnalytics = (debts: Debt[], allTransactions: Transaction[]) => {
  let originalDebt = 0;
  let remainingDebt = 0;
  
  debts.forEach(d => {
    originalDebt += d.originalAmount;
    remainingDebt += d.remainingAmount;
  });

  let principalPaid = 0;
  let interestPaid = 0;
  allTransactions.forEach(t => {
    if (t.type === 'debt_payment') {
      principalPaid += (t.principalPortion || 0);
      interestPaid += (t.interestPortion || 0);
    }
  });

  const debtProgress = originalDebt > 0 ? ((originalDebt - remainingDebt) / originalDebt) * 100 : 0;

  return { originalDebt, remainingDebt, principalPaid, interestPaid, debtProgress: Math.min(100, Math.max(0, debtProgress)) };
};

// ---------------------------------------------------------
// 5. Month-to-Month & Unusual Spending
// ---------------------------------------------------------
export const compareWithPreviousMonth = (currTx: Transaction[], prevTx: Transaction[]) => {
  const curr = calculateFinancialSummary(currTx);
  const prev = calculateFinancialSummary(prevTx);

  const calcChange = (c: number, p: number): string | number => {
    if (p === 0) return c > 0 ? 'new' : 0;
    return ((c - p) / p) * 100;
  };

  return {
    incomeChange: calcChange(curr.income, prev.income),
    expenseChange: calcChange(curr.expense, prev.expense),
    savingsChange: calcChange(curr.savings, prev.savings),
    debtChange: calcChange(curr.debtPaymentTotal, prev.debtPaymentTotal),
  };
};

export const detectUnusualSpending = (
  currTx: Transaction[],
  prevTx: Transaction[],
  categories: Category[],
  threshold = 20
) => {
  const warnings: { categoryName: string, changePercent: number | 'new', prev: number, curr: number }[] = [];

  categories.forEach(cat => {
    const curr = currTx.filter(t => t.type === 'expense' && t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0);
    const prev = prevTx.filter(t => t.type === 'expense' && t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0);

    if (prev === 0 && curr > 0) {
      warnings.push({ categoryName: cat.name, changePercent: 'new', prev, curr });
    } else if (prev > 0) {
      const increase = ((curr - prev) / prev) * 100;
      if (increase >= threshold) {
        warnings.push({ categoryName: cat.name, changePercent: increase, prev, curr });
      }
    }
  });
  return warnings;
};

// ---------------------------------------------------------
// 6. Financial Health Score
// ---------------------------------------------------------
export const calculateFinancialHealthScore = (
  budgetActuals: CategoryActual[],
  savingsRate: number,
  funds: Fund[],
  debts: Debt[],
  monthlyIncome: number
) => {
  // 1. Budget Adherence (30 points)
  let budgetScore = 0;
  if (budgetActuals.length > 0) {
    const underBudget = budgetActuals.filter(c => c.status !== 'over').length;
    budgetScore = (underBudget / budgetActuals.length) * 30;
  } else {
    budgetScore = 15; // neutral if no budget
  }

  // 2. Savings Rate (25 points)
  let savingsScore = 0;
  if (savingsRate >= 20) savingsScore = 25;
  else if (savingsRate > 0) savingsScore = 20 * (savingsRate / 10); // proportional roughly
  if (savingsScore > 25) savingsScore = 25;

  // 3. Emergency Fund (20 points)
  let efScore = 0;
  const ef = funds.find(f => f.priority === 1 || f.name.toLowerCase().includes('қауипсизлик'));
  if (ef && monthlyIncome > 0) {
    const monthsSaved = ef.currentAmount / monthlyIncome; // crude estimate of months covered
    if (monthsSaved >= 6) efScore = 20;
    else if (monthsSaved >= 3) efScore = 15;
    else if (monthsSaved >= 1) efScore = 5;
  }

  // 4. Debt Burden (25 points)
  let debtScore = 25;
  const totalDebtMin = debts.reduce((sum, d) => sum + (d.remainingAmount > 0 ? d.minimumPayment : 0), 0);
  if (monthlyIncome > 0 && totalDebtMin > 0) {
    const burdenRate = (totalDebtMin / monthlyIncome) * 100;
    // Lower burden = higher score. If burden > 50%, score 0. If burden 0%, score 25.
    debtScore = Math.max(0, 25 - (burdenRate / 2));
  } else if (monthlyIncome === 0 && totalDebtMin > 0) {
    debtScore = 0;
  }

  const total = Math.round(budgetScore + savingsScore + efScore + debtScore);
  
  let label = 'Қәўипли';
  if (total >= 80) label = 'Өте жақсы';
  else if (total >= 60) label = 'Жақсы';
  else if (total >= 40) label = 'Назар керек';

  return { total, labels: { budgetScore, savingsScore, efScore, debtScore }, label };
};

// ---------------------------------------------------------
// 7. Smart Insights
// ---------------------------------------------------------
export const generateSmartInsights = (
  summary: FinancialSummary,
  prevSummary: FinancialSummary,
  budgetActuals: CategoryActual[],
  unusualSpends: ReturnType<typeof detectUnusualSpending>,
  health: ReturnType<typeof calculateFinancialHealthScore>
) => {
  const insights: { type: 'positive' | 'warning' | 'negative', text: string }[] = [];
  
  if (summary.income === 0 && summary.expense === 0) {
    return [{ type: 'warning', text: 'Бул қорытынды ушын мәлимлеме жетерли емес.' }];
  }

  if (summary.income > prevSummary.income && prevSummary.income > 0) {
    insights.push({ type: 'positive', text: `Кирисиңиз өткен айға қарағанда өсти.` });
  }

  const overBudgets = budgetActuals.filter(b => b.status === 'over');
  if (overBudgets.length > 0) {
    insights.push({ type: 'negative', text: `${overBudgets[0].categoryName} бюджети ${overBudgets[0].utilizationPercent?.toFixed(0) || '>100'}% пайдаланылды.` });
  }

  if (unusualSpends.length > 0) {
    const u = unusualSpends[0];
    if (u.changePercent === 'new') {
      insights.push({ type: 'warning', text: `${u.categoryName} бойынша жаңа шығын пайда болды.` });
    } else {
      insights.push({ type: 'warning', text: `${u.categoryName} шығыны өткен айға қарағанда ${u.changePercent.toFixed(0)}% өсти.` });
    }
  }

  if (summary.debtPrincipal > 0) {
    insights.push({ type: 'positive', text: `Бул периодта қарыз қалдығы ${summary.debtPrincipal.toLocaleString()} сумға азайды.` });
  }

  if (health.labels.savingsScore < 10) {
    insights.push({ type: 'warning', text: `Жинақ процентиңиз төмен (${summary.savingsRate.toFixed(1)}%). Қорларға көбирек ақша бөлиўди ойлап көриң.` });
  }

  if (insights.length === 0) {
    insights.push({ type: 'positive', text: 'Барлығы жақсы! Финанслық жағдайыңыз турақлы.' });
  }

  return insights.slice(0, 4);
};

export const getCashFlowData = (transactions: Transaction[]) => {
  // Group by YYYY-MM
  const map = new Map<string, { income: number, expense: number, savings: number, debtPayment: number }>();
  
  transactions.forEach(t => {
    const m = t.date.substring(0, 7); // YYYY-MM
    if (!map.has(m)) map.set(m, { income: 0, expense: 0, savings: 0, debtPayment: 0 });
    const d = map.get(m)!;
    
    if (t.type === 'income') d.income += t.amount;
    else if (t.type === 'expense') d.expense += t.amount;
    else if (t.type === 'fund_contribution') d.savings += t.amount;
    else if (t.type === 'debt_payment') d.debtPayment += t.amount; // total amount for cash flow!
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({ month, ...data }));
};
