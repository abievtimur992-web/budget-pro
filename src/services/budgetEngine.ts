import { Transaction, Budget, Category } from '../types';

export const calculateSpentByCategory = (
  transactions: Transaction[],
  categoryId: string,
  month: string
): number => {
  return transactions
    .filter(t => 
      (t.type === 'expense' || t.type === 'income') && 
      t.categoryId === categoryId && 
      t.date.startsWith(month)
    )
    .reduce((sum, t) => sum + t.amount, 0);
};

export const calculateTotalSpent = (
  transactions: Transaction[],
  month: string
): number => {
  return transactions
    .filter(t => t.date.startsWith(month))
    .reduce((sum, t) => {
      if (t.type === 'expense') return sum + t.amount;
      if (t.type === 'debt_payment' && t.interestPortion) return sum + t.interestPortion;
      return sum;
    }, 0);
};

export const getRemainingBudgetForCategory = (
  budget: Budget,
  categoryId: string,
  spent: number
): number => {
  const categoryBudget = budget.categories.find(c => c.categoryId === categoryId);
  const limit = categoryBudget ? categoryBudget.limit : 0;
  return limit - spent;
};

export const getUnallocatedIncome = (budget: Budget): number => {
  const totalAllocated = budget.categories.reduce((sum, c) => sum + c.limit, 0);
  return budget.totalIncome - totalAllocated;
};

export const checkOverspending = (
  budget: Budget,
  categoryId: string,
  spent: number,
  newAmount: number
): boolean => {
  const remaining = getRemainingBudgetForCategory(budget, categoryId, spent);
  return newAmount > remaining;
};
