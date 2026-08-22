import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Family, Account, Transaction, Category, Budget, Fund, Debt, DebtStrategy, SyncOperation } from '../types';
import { getCurrentMonth, getPreviousMonth } from '../utils/format';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useFamilyStore } from './useFamilyStore';
import { transactionRepository } from '../services/transactionRepository';
import { budgetRepository } from '../services/budgetRepository';
import { fundRepository } from '../services/fundRepository';
import { debtRepository } from '../services/debtRepository';

interface FinanceState {
  family: Family | null;
  currentUser: User | null;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  
  // Phase 6.9 Offline Queue
  syncQueue: SyncOperation[];
  conflictOperation: SyncOperation | null;
  enqueueTransaction: (tx: Transaction, type: 'INSERT' | 'UPDATE' | 'DELETE') => void;
  processSyncQueue: () => Promise<void>;
  resolveConflict: (resolution: 'server' | 'client') => void;
  
  // Actions
  initFamily: (familyName: string, userName: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateBudget: (budget: Budget) => void;
  addIncome: (amount: number, accountId: string, comment?: string, categoryId?: string) => void;
  
  // Phase 2 Budget Actions
  createBudgetForMonth: (month: string, copyFromMonth?: string) => void;
  updateCategoryLimit: (month: string, categoryId: string, limit: number) => void;
  transferCategoryLimit: (month: string, fromId: string, toId: string, amount: number) => void;
  addCategory: (name: string, icon: string, initialLimit: number, currentMonth: string, type?: 'income' | 'expense') => void;
  deleteCategory: (categoryId: string, reassignToId: string | null) => void;
// Phase 3 Transaction Actions
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;

  // Phase 4.5 Fund & Debt Actions
  funds: Fund[];
  debts: Debt[];
  debtStrategy: DebtStrategy;
  addFund: (fund: Omit<Fund, 'id' | 'familyId' | 'currentAmount'>) => void;
  updateFund: (fund: Fund) => void;
  deleteFund: (id: string) => void;
  addFundContribution: (fundId: string, amount: number, accountId: string, date: string) => void;
  addFundWithdrawal: (fundId: string, amount: number, accountId: string, date: string) => void;
  
  addDebt: (debt: Omit<Debt, 'id' | 'familyId' | 'remainingAmount'>) => void;
  updateDebt: (debt: Debt) => void;
  deleteDebt: (id: string) => void;
  setDebtStrategy: (strategy: DebtStrategy) => void;
  addDebtPayment: (debtId: string, amount: number, accountId: string, date: string) => void;
  
  // Phase 6.4 Accounts CRUD
  fetchAccounts: () => Promise<void>;
  createAccount: (acc: Omit<Account, 'id' | 'familyId' | 'balance'>) => Promise<void>;
  updateAccount: (acc: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  // Phase 6.5 Transactions Fetch
  fetchTransactions: () => Promise<void>;
  
  // Phase 6.6 Budgets Fetch
  fetchBudgets: () => Promise<void>;
  
  // Phase 6.7 Funds and Debts Fetch
  fetchFunds: () => Promise<void>;
  fetchDebts: () => Promise<void>;

  // Phase 6.8 Realtime
  syncStatus: 'online' | 'syncing' | 'offline' | 'conflict' | null;
  setSyncStatus: (status: 'online' | 'syncing' | 'offline' | 'conflict' | null) => void;
  handleRealtimeEvent: (payload: { table: string, type: 'INSERT'|'UPDATE'|'DELETE', record: any, old_record: any }) => void;
}

const uuid = () => Math.random().toString(36).substring(2, 9);

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      family: null,
      currentUser: null,
      accounts: [],
      transactions: [],
      categories: [
        { id: 'cat-1', familyId: '', name: 'Азық-түлик', icon: 'shopping-cart', type: 'expense' },
        { id: 'cat-2', familyId: '', name: 'Транспорт', icon: 'car', type: 'expense' },
        { id: 'cat-3', familyId: '', name: 'Балалар', icon: 'users', type: 'expense' },
        { id: 'cat-4', familyId: '', name: 'Жинақ', icon: 'piggy-bank', type: 'expense' },
        { id: 'cat-inc-1', familyId: '', name: 'Айлық ТМВ', icon: 'briefcase', type: 'income' },
        { id: 'cat-inc-2', familyId: '', name: 'Бизнес', icon: 'trending-up', type: 'income' },
      ],
      budgets: [],
      funds: [],
      debts: [],
      debtStrategy: 'hybrid',

      initFamily: (familyName, userName) => {
        const familyId = uuid();
        const userId = uuid();
        const initialAccount: Account = {
          id: uuid(),
          familyId,
          name: 'Негизги Хапшық (Main)',
          type: 'bank',
          balance: 25000000 
        };
        const cashAccount: Account = {
          id: uuid(),
          familyId,
          name: 'Қолма-қол ақша',
          type: 'cash',
          balance: 0
        };
        
        const updatedCategories = get().categories.map(c => ({ ...c, familyId }));
        
        const initialBudget: Budget = {
          id: uuid(),
          familyId,
          month: getCurrentMonth(),
          totalIncome: 25000000,
          categories: [
            { id: uuid(), categoryId: updatedCategories[0].id, limit: 4000000 },
            { id: uuid(), categoryId: updatedCategories[1].id, limit: 1000000 },
            { id: uuid(), categoryId: updatedCategories[2].id, limit: 2000000 },
            { id: uuid(), categoryId: updatedCategories[3].id, limit: 4000000 },
            { id: uuid(), categoryId: updatedCategories[4].id, limit: 15000000 },
            { id: uuid(), categoryId: updatedCategories[5].id, limit: 10000000 },
          ]
        };

        // Phase 4.5 Test Data
        const initialFunds: Fund[] = [
          {
            id: uuid(), familyId, name: 'Қауипсизлик қоры',
            targetAmount: 24000000, currentAmount: 5000000,
            monthlyContribution: 2500000, priority: 1, icon: 'shield', color: 'bg-blue-500'
          },
          {
            id: uuid(), familyId, name: 'Машина қоры',
            targetAmount: 12000000, currentAmount: 4000000,
            monthlyContribution: 1000000, priority: 3, icon: 'car', color: 'bg-purple-500'
          }
        ];

        const initialDebts: Debt[] = [
          {
            id: uuid(), familyId, name: 'Кредит карта', creditor: 'ТБС Банк',
            originalAmount: 50000000, remainingAmount: 50000000,
            interestRate: 24, minimumPayment: 2500000, nextPaymentDate: new Date().toISOString()
          },
          {
            id: uuid(), familyId, name: 'Авто кредит', creditor: 'Халық Банк',
            originalAmount: 20000000, remainingAmount: 20000000,
            interestRate: 18, minimumPayment: 1500000, nextPaymentDate: new Date().toISOString()
          }
        ];

        set({
          family: { id: familyId, name: familyName },
          currentUser: { id: userId, familyId, name: userName, role: 'admin' },
          accounts: [initialAccount, cashAccount],
          categories: updatedCategories,
          budgets: [initialBudget],
          funds: initialFunds,
          debts: initialDebts,
          transactions: [
            {
              id: uuid(),
              familyId,
              userId,
              date: new Date().toISOString(),
              type: 'income',
              amount: 25000000,
              accountId: initialAccount.id,
              comment: 'Айлық кирис',
              createdAt: new Date().toISOString()
            },
            {
              id: uuid(),
              familyId,
              userId,
              date: new Date().toISOString(),
              type: 'expense',
              amount: 2650000,
              categoryId: updatedCategories[0].id, // Азық-түлик
              accountId: initialAccount.id,
              createdAt: new Date().toISOString()
            },
            {
              id: uuid(),
              familyId,
              userId,
              date: new Date().toISOString(),
              type: 'expense',
              amount: 200000,
              categoryId: updatedCategories[1].id, // Транспорт
              accountId: initialAccount.id,
              comment: 'Бензин',
              createdAt: new Date().toISOString()
            },
            {
              id: uuid(),
              familyId,
              userId,
              date: new Date().toISOString(),
              type: 'expense',
              amount: 300000,
              categoryId: updatedCategories[2].id, // Балалар
              accountId: initialAccount.id,
              createdAt: new Date().toISOString()
            },
            {
              id: uuid(),
              familyId,
              userId,
              date: new Date().toISOString(),
              type: 'transfer',
              amount: 500000,
              accountId: initialAccount.id,
              targetAccountId: cashAccount.id,
              comment: 'Қолма-қол пул алдым',
              createdAt: new Date().toISOString()
            }
          ]
        });
      },

      addTransaction: async (tx) => {
        const state = get();
        const newTx: Transaction = {
          ...tx,
          id: uuid(),
          familyId: state.family!.id,
          createdAt: new Date().toISOString()
        };

        set((state) => {
          const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === tx.accountId) {
              const modifier = tx.type === 'income' ? tx.amount : -tx.amount;
              return { ...acc, balance: acc.balance + modifier };
            }
            if (tx.type === 'transfer' && tx.targetAccountId && acc.id === tx.targetAccountId) {
              return { ...acc, balance: acc.balance + tx.amount };
            }
            return acc;
          });

          return {
            transactions: [...state.transactions, newTx],
            accounts: updatedAccounts
          };
        });

        get().enqueueTransaction(newTx, 'INSERT');
      },

      updateTransaction: async (newTx: Transaction) => {
        set((state) => {
          const oldTx = state.transactions.find(t => t.id === newTx.id);
          if (!oldTx) return state;

          let tempAccounts = [...state.accounts];
          
          // Revert old transaction logic
          tempAccounts = tempAccounts.map(acc => {
            if (acc.id === oldTx.accountId) {
              const mod = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
              return { ...acc, balance: acc.balance + mod };
            }
            if (oldTx.type === 'transfer' && oldTx.targetAccountId && acc.id === oldTx.targetAccountId) {
              return { ...acc, balance: acc.balance - oldTx.amount };
            }
            return acc;
          });

          // Apply new transaction logic
          tempAccounts = tempAccounts.map(acc => {
            if (acc.id === newTx.accountId) {
              const mod = newTx.type === 'income' ? newTx.amount : -newTx.amount;
              return { ...acc, balance: acc.balance + mod };
            }
            if (newTx.type === 'transfer' && newTx.targetAccountId && acc.id === newTx.targetAccountId) {
              return { ...acc, balance: acc.balance + newTx.amount };
            }
            return acc;
          });

          return {
            transactions: state.transactions.map(t => t.id === newTx.id ? newTx : t),
            accounts: tempAccounts
          };
        });
        
        get().enqueueTransaction(newTx, 'UPDATE');
      },

      deleteTransaction: async (id: string) => {
        const state = get();
        const txToDelete = state.transactions.find(t => t.id === id);
        if (!txToDelete) return;

        set((state) => {
          const tx = state.transactions.find(t => t.id === id);
          if (!tx) return state;
          
          const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === tx.accountId) {
              const modifier = tx.type === 'income' ? -tx.amount : tx.amount;
              return { ...acc, balance: acc.balance + modifier };
            }
            if (tx.type === 'transfer' && tx.targetAccountId && acc.id === tx.targetAccountId) {
              return { ...acc, balance: acc.balance - tx.amount };
            }
            return acc;
          });

          return {
            transactions: state.transactions.filter(t => t.id !== id),
            accounts: updatedAccounts
          };
        });

        get().enqueueTransaction(txToDelete, 'DELETE');
      },

      updateBudget: async (budget) => {
        if (isSupabaseConfigured && useAuthStore.getState().isAuthenticated) {
          try {
            await budgetRepository.updateBudgetIncome(budget.id, budget.totalIncome, useAuthStore.getState().session?.access_token);
          } catch (e) { console.error('Failed to update cloud budget income', e); }
        }
        set((state) => ({
          budgets: state.budgets.map(b => b.id === budget.id ? budget : b)
        }));
      },

      // Phase 4.5 implementations (Funds/Debts)
      addFund: async (fundInput) => {
        const state = get();
        const newFund: Fund = { ...fundInput, id: uuid(), familyId: state.family!.id, currentAmount: 0 };
        
        if (isSupabaseConfigured && useAuthStore.getState().isAuthenticated) {
          try {
            await fundRepository.createFund(newFund, state.family!.id, useAuthStore.getState().session?.access_token);
          } catch (e) {
            console.error('Failed to create fund', e);
            return;
          }
        }
        set(state => ({ funds: [...state.funds, newFund] }));
      },
      updateFund: async (fund) => {
        if (isSupabaseConfigured && useAuthStore.getState().isAuthenticated) {
          try {
            await fundRepository.updateFund(fund, useAuthStore.getState().session?.access_token);
          } catch (e) {
            console.error('Failed to update fund', e);
            return;
          }
        }
        set(state => ({ funds: state.funds.map(f => f.id === fund.id ? fund : f) }));
      },
      deleteFund: async (fundId: string) => {
        if (isSupabaseConfigured && useAuthStore.getState().isAuthenticated) {
          try {
            await fundRepository.deleteFund(fundId, useAuthStore.getState().session?.access_token);
          } catch (e) {
            console.error('Failed to delete fund', e);
            return;
          }
        }
        set(state => ({ funds: state.funds.filter(f => f.id !== fundId) }));
      },
      addFundContribution: async (fundId, amount, accountId, date) => {
        const state = get();
        const fund = state.funds.find(f => f.id === fundId);
        if (!fund) return;

        const tx: Transaction = {
          id: uuid(),
          familyId: state.family!.id,
          userId: state.currentUser!.id,
          date,
          type: 'fund_contribution',
          amount,
          accountId,
          fundId,
          comment: 'Қорға ақша қосыў',
          createdAt: new Date().toISOString()
        };

        get().enqueueTransaction(tx, 'INSERT');

        set(state => {
          const updatedFunds = state.funds.map(f => f.id === fundId ? { ...f, currentAmount: f.currentAmount + amount } : f);
          const updatedAccounts = state.accounts.map(a => a.id === accountId ? { ...a, balance: a.balance - amount } : a);
          return { transactions: [...state.transactions, tx], funds: updatedFunds, accounts: updatedAccounts };
        });
      },
      addFundWithdrawal: async (fundId, amount, accountId, date) => {
        const state = get();
        const fund = state.funds.find(f => f.id === fundId);
        if (!fund) return;

        const tx: Transaction = {
          id: uuid(),
          familyId: state.family!.id,
          userId: state.currentUser!.id,
          date,
          type: 'fund_withdrawal',
          amount,
          accountId,
          fundId,
          comment: 'Қордан ақша алыў',
          createdAt: new Date().toISOString()
        };

        get().enqueueTransaction(tx, 'INSERT');

        set(state => {
          const updatedFunds = state.funds.map(f => f.id === fundId ? { ...f, currentAmount: f.currentAmount - amount } : f);
          const updatedAccounts = state.accounts.map(a => a.id === accountId ? { ...a, balance: a.balance + amount } : a);
          return { transactions: [...state.transactions, tx], funds: updatedFunds, accounts: updatedAccounts };
        });
      },
      addDebt: async (debtInput) => {
        const state = get();
        const newDebt: Debt = { ...debtInput, id: uuid(), familyId: state.family!.id, remainingAmount: debtInput.originalAmount };
        if (isSupabaseConfigured && useAuthStore.getState().isAuthenticated) {
          try {
            await debtRepository.createDebt(newDebt, state.family!.id, useAuthStore.getState().session?.access_token);
          } catch (e) {
            console.error('Failed to create debt', e);
            return;
          }
        }
        set(state => ({ debts: [...state.debts, newDebt] }));
      },
      updateDebt: async (debt) => {
        if (isSupabaseConfigured && useAuthStore.getState().isAuthenticated) {
          try {
            await debtRepository.updateDebt(debt, useAuthStore.getState().session?.access_token);
          } catch (e) {
            console.error('Failed to update debt', e);
            return;
          }
        }
        set(state => ({ debts: state.debts.map(d => d.id === debt.id ? debt : d) }));
      },
      deleteDebt: async (debtId: string) => {
        if (isSupabaseConfigured && useAuthStore.getState().isAuthenticated) {
          try {
            await debtRepository.deleteDebt(debtId, useAuthStore.getState().session?.access_token);
          } catch (e) {
            console.error('Failed to delete debt', e);
            return;
          }
        }
        set(state => ({ debts: state.debts.filter(d => d.id !== debtId) }));
      },
      setDebtStrategy: (strategy) => {
        set({ debtStrategy: strategy });
      },
      addDebtPayment: async (debtId, amount, accountId, date) => {
        const state = get();
        const debt = state.debts.find(d => d.id === debtId);
        if (!debt) return;

        const interest = debt.remainingAmount * (debt.interestRate / 100 / 12);
        const actualInterest = Math.min(interest, amount);
        const principal = amount - actualInterest;

        const tx: Transaction = {
          id: uuid(),
          familyId: state.family!.id,
          userId: state.currentUser!.id,
          date,
          type: 'debt_payment',
          amount,
          accountId,
          debtId,
          interestPortion: actualInterest,
          principalPortion: principal,
          comment: 'Қарыз төлеми',
          createdAt: new Date().toISOString()
        };

        get().enqueueTransaction(tx, 'INSERT');

        set(state => {
          const updatedDebts = state.debts.map(d => d.id === debtId ? { ...d, remainingAmount: Math.max(0, d.remainingAmount - principal) } : d);
          const updatedAccounts = state.accounts.map(a => a.id === accountId ? { ...a, balance: a.balance - amount } : a);
          return { transactions: [...state.transactions, tx], debts: updatedDebts, accounts: updatedAccounts };
        });
      },
      
      addIncome: (amount, accountId, comment, categoryId) => {
        const state = get();
        if (!state.family || !state.currentUser) return;
        
        state.addTransaction({
          familyId: state.family.id,
          userId: state.currentUser.id,
          date: new Date().toISOString(),
          type: 'income',
          amount,
          accountId,
          categoryId,
          comment: comment || ''
        });
      },

      // Phase 2 actions
      createBudgetForMonth: async (month, copyFromMonth) => {
        const state = get();
        if (state.budgets.find(b => b.month === month)) return; // Already exists
        
        const familyId = state.family?.id || '';
        let categories = state.categories.map(c => ({ id: uuid(), categoryId: c.id, limit: 0 }));
        let totalIncome = 0;

        if (copyFromMonth) {
          const prevBudget = state.budgets.find(b => b.month === copyFromMonth);
          if (prevBudget) {
            categories = prevBudget.categories.map(c => ({ ...c, id: uuid() }));
            totalIncome = prevBudget.totalIncome;
          }
        }

        const newBudget: Budget = {
          id: uuid(),
          familyId,
          month,
          totalIncome,
          categories
        };

        if (isSupabaseConfigured && useAuthStore.getState().isAuthenticated) {
          try {
            await budgetRepository.createBudget(newBudget, familyId, useAuthStore.getState().session?.access_token);
          } catch (e) {
            console.error('Failed to create cloud budget', e);
            return;
          }
        }

        set(state => ({ budgets: [...state.budgets, newBudget] }));
      },

      updateCategoryLimit: async (month, categoryId, limit) => {
        const state = get();
        const budget = state.budgets.find(b => b.month === month);
        if (!budget) return;

        const cat = budget.categories.find(c => c.categoryId === categoryId);
        if (!cat) return;

        if (isSupabaseConfigured && useAuthStore.getState().isAuthenticated) {
          try {
            await budgetRepository.updateCategoryLimit(budget.id, categoryId, cat.id, limit, useAuthStore.getState().session?.access_token);
          } catch (e) {
            console.error('Failed to update category limit', e);
            return;
          }
        }

        set(state => ({
          budgets: state.budgets.map(b => {
            if (b.month !== month) return b;
            const cats = b.categories.map(c => c.categoryId === categoryId ? { ...c, limit } : c);
            return { ...b, categories: cats };
          })
        }));
      },

      transferCategoryLimit: async (month, fromId, toId, amount) => {
        const state = get();
        const budget = state.budgets.find(b => b.month === month);
        if (!budget) return;

        const fromCat = budget.categories.find(c => c.categoryId === fromId);
        const toCat = budget.categories.find(c => c.categoryId === toId);
        if (!fromCat || !toCat) return;

        const newFromLimit = Math.max(0, fromCat.limit - amount);
        const newToLimit = toCat.limit + amount;

        if (isSupabaseConfigured && useAuthStore.getState().isAuthenticated) {
          try {
            await budgetRepository.updateCategoryLimit(budget.id, fromId, fromCat.id, newFromLimit, useAuthStore.getState().session?.access_token);
            await budgetRepository.updateCategoryLimit(budget.id, toId, toCat.id, newToLimit, useAuthStore.getState().session?.access_token);
          } catch (e) {
            console.error('Failed to transfer category limit', e);
            return;
          }
        }

        set(state => ({
          budgets: state.budgets.map(b => {
            if (b.month !== month) return b;
            const cats = b.categories.map(c => {
              if (c.categoryId === fromId) return { ...c, limit: newFromLimit };
              if (c.categoryId === toId) return { ...c, limit: newToLimit };
              return c;
            });
            return { ...b, categories: cats };
          })
        }));
      },

      addCategory: (name, icon, initialLimit, currentMonth, type) => {
        set(state => {
          const familyId = state.family?.id || '';
          const newCat = { id: uuid(), familyId, name, icon, type: type || 'expense' };
          
          // Add to categories array
          const categories = [...state.categories, newCat];
          
          // Also add to current month's budget if it exists
          const budgets = state.budgets.map(b => {
            if (b.month === currentMonth) {
              return {
                ...b,
                categories: [...b.categories, { id: uuid(), categoryId: newCat.id, limit: initialLimit }]
              };
            }
            return b;
          });

          return { categories, budgets };
        });
      },

      deleteCategory: (categoryId, reassignToId) => {
        set(state => {
          // Reassign transactions
          const transactions = state.transactions.map(tx => {
            if (tx.categoryId === categoryId && reassignToId) {
              return { ...tx, categoryId: reassignToId };
            }
            return tx;
          });

          // Reassign budgets
          const budgets = state.budgets.map(b => {
            const deletedCatLimit = b.categories.find(c => c.categoryId === categoryId)?.limit || 0;
            let newCats = b.categories.filter(c => c.categoryId !== categoryId);
            
            if (reassignToId && deletedCatLimit > 0) {
              newCats = newCats.map(c => {
                if (c.categoryId === reassignToId) {
                  return { ...c, limit: c.limit + deletedCatLimit };
                }
                return c;
              });
            }
            return { ...b, categories: newCats };
          });

          // Remove category
          const categories = state.categories.filter(c => c.id !== categoryId);

          return { transactions, budgets, categories };
        });
      },

      // Phase 6.4 Accounts CRUD Implementations
      fetchAccounts: async () => {
        if (!isSupabaseConfigured) return;
        const { session, isAuthenticated } = useAuthStore.getState();
        const fId = useFamilyStore.getState().currentFamilyId;
        if (!isAuthenticated || !fId) return;

        try {
          const res = await supabase.from('accounts').select('*', session?.access_token, '&family_id=eq.' + fId);
          if (res.data) {
            const mapped = res.data.map((a: any) => ({
              id: a.id, familyId: a.family_id, name: a.name, type: a.type, balance: a.balance || 0
            }));
            set({ accounts: mapped });
          }
        } catch (e) {
          console.error('Failed to fetch accounts:', e);
        }
      },
      createAccount: async (acc) => {
        set(state => {
          if (isSupabaseConfigured) {
            const fId = useFamilyStore.getState().currentFamilyId;
            const token = useAuthStore.getState().session?.access_token;
            if (fId && token) {
              const newAcc = { family_id: fId, name: acc.name, type: acc.type, balance: 0 };
              supabase.from('accounts').insert(newAcc, token).then(res => {
                if (res.data) get().fetchAccounts();
              }).catch(console.error);
            }
            return state; // Cloud fetch updates it
          } else {
            return { accounts: [...state.accounts, { ...acc, id: uuid(), familyId: state.family!.id, balance: 0 }] };
          }
        });
      },
      updateAccount: async (acc) => {
        set(state => {
          if (isSupabaseConfigured) {
            const token = useAuthStore.getState().session?.access_token;
            if (token) {
              const payload = { name: acc.name, type: acc.type }; // balance is derived in DB, don't update directly
              supabase.from('accounts').update(payload, token, 'id=eq.' + acc.id).then(() => {
                get().fetchAccounts();
              }).catch(console.error);
            }
            return state;
          } else {
            return { accounts: state.accounts.map(a => a.id === acc.id ? acc : a) };
          }
        });
      },
      deleteAccount: async (id) => {
        set(state => {
          if (isSupabaseConfigured) {
            const token = useAuthStore.getState().session?.access_token;
            if (token) {
              supabase.from('accounts').delete({}, token, 'id=eq.' + id).then(() => {
                get().fetchAccounts();
              }).catch(console.error);
            }
            return state;
          } else {
            return { accounts: state.accounts.filter(a => a.id !== id) };
          }
        });
      },
      // Phase 6.5 Transactions Fetch
      fetchTransactions: async () => {
        if (!isSupabaseConfigured) return;
        const { session, isAuthenticated } = useAuthStore.getState();
        const fId = useFamilyStore.getState().currentFamilyId;
        if (!isAuthenticated || !fId) return;

        try {
          const cloudTxs = await transactionRepository.fetchTransactions(fId, session?.access_token);
          set({ transactions: cloudTxs });
        } catch (e) {
          console.error('Failed to fetch transactions:', e);
        }
      },
      // Phase 6.6 Budgets Fetch
      fetchBudgets: async () => {
        if (!isSupabaseConfigured) return;
        const { session, isAuthenticated } = useAuthStore.getState();
        const fId = useFamilyStore.getState().currentFamilyId;
        if (!isAuthenticated || !fId) return;

        try {
          const cloudBudgets = await budgetRepository.fetchBudgets(fId, session?.access_token);
          set({ budgets: cloudBudgets });
        } catch (e) {
          console.error('Failed to fetch budgets:', e);
        }
      },

      // Phase 6.7 Funds & Debts Fetch
      fetchFunds: async () => {
        if (!isSupabaseConfigured) return;
        const { session, isAuthenticated } = useAuthStore.getState();
        const fId = useFamilyStore.getState().currentFamilyId;
        if (!isAuthenticated || !fId) return;

        try {
          const cloudFunds = await fundRepository.fetchFunds(fId, session?.access_token);
          set({ funds: cloudFunds });
        } catch (e) {
          console.error('Failed to fetch funds:', e);
        }
      },
      fetchDebts: async () => {
        if (!isSupabaseConfigured) return;
        const { session, isAuthenticated } = useAuthStore.getState();
        const fId = useFamilyStore.getState().currentFamilyId;
        if (!isAuthenticated || !fId) return;

        try {
          const cloudDebts = await debtRepository.fetchDebts(fId, session?.access_token);
          set({ debts: cloudDebts });
        } catch (e) {
          console.error('Failed to fetch debts:', e);
        }
      },

      // Phase 6.9 Offline Queue & Conflict Resolution
      syncQueue: [],
      conflictOperation: null,
      enqueueTransaction: (tx, type) => {
        set(state => {
          const op: SyncOperation = {
            id: uuid(),
            txId: tx.id,
            type,
            table: 'transactions',
            payload: tx,
            status: 'pending',
            version: tx.version || 1,
            createdAt: new Date().toISOString()
          };
          return { syncQueue: [...state.syncQueue, op] };
        });
        get().processSyncQueue();
      },
      resolveConflict: async (resolution) => {
        const state = get();
        const op = state.conflictOperation;
        if (!op) return;

        if (resolution === 'server') {
          // Drop our queue item, server wins. Realtime/refresh gets server data.
          set(s => ({
            syncQueue: s.syncQueue.filter(q => q.id !== op.id),
            conflictOperation: null,
            syncStatus: 'online'
          }));
        } else {
          // Client wins. Upgrade version to match server's so it passes DB trigger.
          set(s => ({
            syncQueue: s.syncQueue.map(q => q.id === op.id ? { ...q, version: op.serverPayload?.version || q.version, status: 'pending' } : q),
            conflictOperation: null,
            syncStatus: 'syncing'
          }));
        }
        get().processSyncQueue();
      },
      processSyncQueue: async () => {
        const state = get();
        if (!isSupabaseConfigured || !useAuthStore.getState().isAuthenticated || state.syncStatus === 'offline') return;

        let queue = state.syncQueue.filter(op => op.status === 'pending' || op.status === 'failed');
        if (queue.length === 0) return;

        set({ syncStatus: 'syncing' });
        let currentQueue = [...state.syncQueue];
        let hasConflict = false;

        for (const op of queue) {
          try {
            if (op.type === 'INSERT') {
              await transactionRepository.createTransaction(op.payload, state.family!.id, useAuthStore.getState().session?.access_token);
            } else {
              const serverTx = await transactionRepository.getTransaction(op.txId, useAuthStore.getState().session?.access_token);
              if (serverTx && serverTx.version && serverTx.version > op.version) {
                 currentQueue = currentQueue.map(q => q.id === op.id ? { ...q, status: 'conflict', serverPayload: serverTx } : q);
                 hasConflict = true;
                 set({ conflictOperation: currentQueue.find(q => q.id === op.id) });
                 break; 
              }
              if (op.type === 'UPDATE') {
                await transactionRepository.updateTransaction(op.payload, state.family!.id, useAuthStore.getState().session?.access_token);
              } else if (op.type === 'DELETE') {
                await transactionRepository.deleteTransaction(op.txId, state.family!.id, useAuthStore.getState().session?.access_token);
              }
            }
            currentQueue = currentQueue.filter(q => q.id !== op.id);
          } catch (e: any) {
            if (e.code === '23505' && op.type === 'INSERT') { // unique violation = already synced
               currentQueue = currentQueue.filter(q => q.id !== op.id);
            } else {
               currentQueue = currentQueue.map(q => q.id === op.id ? { ...q, status: 'failed' } : q);
               set({ syncStatus: 'offline' });
               break;
            }
          }
        }

        if (hasConflict) {
          set({ syncQueue: currentQueue, syncStatus: 'conflict' });
        } else {
          set({ syncQueue: currentQueue });
          if (currentQueue.filter(op => op.status === 'pending' || op.status === 'failed').length === 0 && get().syncStatus !== 'offline') {
             set({ syncStatus: 'online' });
             get().fetchTransactions();
             get().fetchAccounts();
             get().fetchFunds();
             get().fetchDebts();
          }
        }
      },

      // Phase 6.8 Realtime Handlers
      syncStatus: null,
      setSyncStatus: (status) => set({ syncStatus: status }),
      handleRealtimeEvent: (payload) => {
        const { table, type, record, old_record } = payload;
        
        // Strategy for handling Realtime:
        // For simplicity and 100% DB consistency without huge mappers,
        // we can simply re-fetch the specific entity domain that changed!
        // This is safe because Zustand batches updates, and fetching guarantees derived states are flawless.
        // Wait, prompt explicitly said: "Zustand state жаңартылсын... Duplicate transaction жасалмасын".
        // Let's do a fast re-fetch for now to ensure consistency, it fulfills all requirements elegantly.
        
        const store = get();
        
        if (table === 'transactions' || table === 'fund_transactions' || table === 'debt_payments') {
           // We will fetch transactions. We also fetch accounts because trigger affects accounts.
           store.fetchTransactions();
           store.fetchAccounts();
           store.fetchFunds();
           store.fetchDebts();
           store.fetchBudgets();
        } 
        else if (table === 'accounts') {
           store.fetchAccounts();
        }
        else if (table === 'budgets' || table === 'budget_categories') {
           store.fetchBudgets();
        }
        else if (table === 'funds') {
           store.fetchFunds();
        }
        else if (table === 'debts') {
           store.fetchDebts();
        }
        // Minimalist UI ensures it stays consistent.
      }
    }),
    {
      name: 'budget-pro-storage',
    }
  )
);
