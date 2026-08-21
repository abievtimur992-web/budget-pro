export type Role = 'admin' | 'adult' | 'child';

export interface User {
  id: string;
  familyId: string;
  name: string;
  role: Role;
  allowance?: number;
}

export interface Family {
  id: string;
  name: string;
}

export interface Account {
  id: string;
  familyId: string;
  name: string;
  type: 'bank' | 'cash' | 'savings';
  balance: number;
}

export interface Category {
  id: string;
  familyId: string;
  name: string;
  icon?: string;
}

export interface Budget {
  id: string;
  familyId: string;
  month: string; // YYYY-MM
  totalIncome: number;
  categories: BudgetCategory[];
}

export interface BudgetCategory {
  id: string;
  categoryId: string;
  limit: number;
}

export interface SyncOperation {
  id: string; // Internal queue ID
  txId: string; // The transaction ID it modifies
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'transactions';
  payload: Transaction;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  version: number;
  createdAt: string;
  serverPayload?: Transaction;
  error?: string;
}

export type DebtStrategy = 'avalanche' | 'snowball' | 'hybrid';

export interface Fund {
  id: string;
  familyId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate?: string;
  priority: 1 | 2 | 3 | 4;
  icon: string;
  color: string;
}

export interface Debt {
  id: string;
  familyId: string;
  name: string;
  creditor: string;
  originalAmount: number;
  remainingAmount: number;
  interestRate: number; // Annual percentage
  minimumPayment: number;
  nextPaymentDate: string;
}

export interface Transaction {
  id: string;
  familyId: string;
  userId: string;
  date: string;
  type: 'income' | 'expense' | 'transfer' | 'fund_contribution' | 'fund_withdrawal' | 'debt_payment';
  amount: number;
  categoryId?: string; // required if expense
  accountId: string;
  targetAccountId?: string; // required if transfer
  comment?: string;
  isOverBudget?: boolean;
  receiptUrl?: string; // Phase 3 receipt/photo support
  // Phase 4.5 fields
  interestPortion?: number;
  principalPortion?: number;
  fundId?: string;
  debtId?: string;
  createdAt: string;
  clientTransactionId?: string;
  version?: number;
}
