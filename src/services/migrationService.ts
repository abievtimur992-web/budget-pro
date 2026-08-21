import { supabase } from '../lib/supabase';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { useFamilyStore } from '../store/useFamilyStore';
import { Account, Transaction } from '../types';

export interface Discrepancy {
  accountId: string;
  name: string;
  localBalance: number;
  derivedBalance: number;
  diff: number;
}

export const migrationService = {
  analyzeData(): { totalTransactions: number; totalAccounts: number; totalBudgets: number; totalFunds: number; totalDebts: number; discrepancies: Discrepancy[] } {
    const state = useFinanceStore.getState();
    const accounts = state.accounts;
    const txs = state.transactions;

    const discrepancies: Discrepancy[] = accounts.map(acc => {
      const relatedTxs = txs.filter(t => t.accountId === acc.id || t.targetAccountId === acc.id);
      let derived = 0;
      relatedTxs.forEach(t => {
        if (t.accountId === acc.id) {
          if (t.type === 'income') derived += t.amount;
          else if (t.type === 'expense' || t.type === 'fund_contribution' || t.type === 'debt_payment' || t.type === 'transfer') derived -= t.amount;
        }
        if (t.targetAccountId === acc.id && t.type === 'transfer') {
          derived += t.amount;
        }
      });

      return {
        accountId: acc.id,
        name: acc.name,
        localBalance: acc.balance,
        derivedBalance: derived,
        diff: acc.balance - derived
      };
    }).filter(d => Math.abs(d.diff) > 0.01);

    return {
      totalTransactions: txs.length,
      totalAccounts: accounts.length,
      totalBudgets: state.budgets.length,
      totalFunds: state.funds.length,
      totalDebts: state.debts.length,
      discrepancies
    };
  },

  generateOpeningBalance(accountId: string, amount: number) {
    const state = useFinanceStore.getState();
    if (!state.currentUser || !state.family) return;

    state.addTransaction({
      familyId: state.family.id,
      userId: state.currentUser.id,
      date: new Date().toISOString(),
      type: amount > 0 ? 'income' : 'expense',
      amount: Math.abs(amount),
      accountId,
      comment: 'Басланғыш баланс түзетуі (Миграция)',
      categoryId: undefined,
    });
  },

  async acquireLock(familyId: string, deviceId: string): Promise<boolean> {
    const { session } = useAuthStore.getState();
    if (!session) return false;

    // Check current lock
    const { data: family } = await supabase.from('families').select('migration_status, migration_device_id').eq('id', familyId).single();
    
    if (family && family.migration_status === 'migrating' && family.migration_device_id !== deviceId) {
      return false; // Locked by another device
    }

    const { error } = await supabase.from('families')
      .update({
        migration_status: 'migrating',
        migration_device_id: deviceId,
        migration_updated_at: new Date().toISOString()
      })
      .eq('id', familyId);

    return !error;
  },

  async completeMigration(familyId: string): Promise<boolean> {
    const { error } = await supabase.from('families')
      .update({
        migration_status: 'completed',
        migration_updated_at: new Date().toISOString()
      })
      .eq('id', familyId);
    return !error;
  },

  async releaseLock(familyId: string): Promise<boolean> {
    const { error } = await supabase.from('families')
      .update({
        migration_status: 'pending',
        migration_device_id: null
      })
      .eq('id', familyId);
    return !error;
  },

  async uploadData(deviceId: string, onProgress: (msg: string) => void): Promise<boolean> {
    // BACKUP
    try {
      const currentStorage = localStorage.getItem('budget-pro-storage');
      if (currentStorage) {
        localStorage.setItem('budget-pro-backup', currentStorage);
      }
    } catch (e) {
      console.warn('Backup failed', e);
    }

    const state = useFinanceStore.getState();
    const familyId = state.family?.id;
    if (!familyId) return false;
    const token = useAuthStore.getState().session?.access_token;
    if (!token) return false;

    try {
      // 1. ACCOUNTS (With Balance = 0 initially to avoid double counting)
      onProgress('Аккаунтлар жүкленбекте...');
      const accountsPayload = state.accounts.map(a => ({
        id: a.id,
        family_id: familyId,
        name: a.name,
        type: a.type,
        currency: a.currency,
        balance: 0, // CRITICAL: Allow triggers to rebuild it
        icon: a.icon,
        color: a.color,
        is_default: a.isDefault,
        is_hidden: a.isHidden
      }));
      await supabase.from('accounts').upsert(accountsPayload, { onConflict: 'id' }).setHeader('Authorization', `Bearer ${token}`);

      // 2. FUNDS
      onProgress('Қорлар жүкленбекте...');
      const fundsPayload = state.funds.map(f => ({
        id: f.id,
        family_id: familyId,
        name: f.name,
        target_amount: f.targetAmount,
        current_amount: 0, // Let trigger rebuild
        monthly_contribution: f.monthlyContribution,
        target_date: f.targetDate,
        priority: f.priority,
        icon: f.icon,
        color: f.color
      }));
      if (fundsPayload.length > 0) {
        await supabase.from('funds').upsert(fundsPayload, { onConflict: 'id' }).setHeader('Authorization', `Bearer ${token}`);
      }

      // 3. DEBTS
      onProgress('Қарызлар жүкленбекте...');
      const debtsPayload = state.debts.map(d => ({
        id: d.id,
        family_id: familyId,
        name: d.name,
        creditor: d.creditor,
        original_amount: d.originalAmount,
        remaining_amount: d.originalAmount, // Let trigger reduce it based on payments
        interest_rate: d.interestRate,
        minimum_payment: d.minimumPayment,
        next_payment_date: d.nextPaymentDate
      }));
      if (debtsPayload.length > 0) {
        await supabase.from('debts').upsert(debtsPayload, { onConflict: 'id' }).setHeader('Authorization', `Bearer ${token}`);
      }

      // 4. BUDGETS
      onProgress('Бюджетлер жүкленбекте...');
      const budgetsPayload = state.budgets.map(b => ({
        id: b.id,
        family_id: familyId,
        month: b.month,
        total_income: b.totalIncome
      }));
      if (budgetsPayload.length > 0) {
        await supabase.from('budgets').upsert(budgetsPayload, { onConflict: 'id' }).setHeader('Authorization', `Bearer ${token}`);
        
        // 5. BUDGET CATEGORIES
        const categoriesPayload = state.budgets.flatMap(b => b.categories.map(c => ({
          id: c.id,
          budget_id: b.id,
          category_id: c.categoryId,
          limit_amount: c.limit
        })));
        if (categoriesPayload.length > 0) {
          await supabase.from('budget_categories').upsert(categoriesPayload, { onConflict: 'id' }).setHeader('Authorization', `Bearer ${token}`);
        }
      }

      // 6. TRANSACTIONS (Batch upload)
      onProgress('Транзакциялар жүкленбекте...');
      const txs = state.transactions;
      const BATCH_SIZE = 50;
      
      for (let i = 0; i < txs.length; i += BATCH_SIZE) {
        const batch = txs.slice(i, i + BATCH_SIZE);
        const txPayload = batch.map(tx => ({
          family_id: familyId,
          created_by: tx.userId,
          date: tx.date,
          type: tx.type,
          amount: tx.amount,
          account_id: tx.accountId,
          target_account_id: tx.targetAccountId,
          category_id: tx.categoryId,
          comment: tx.comment,
          client_transaction_id: tx.id, // Idempotency key
          fund_id: tx.fundId,
          debt_id: tx.debtId,
          interest_portion: tx.interestPortion,
          principal_portion: tx.principalPortion
        }));

        await supabase.from('transactions').upsert(txPayload, { onConflict: 'client_transaction_id', ignoreDuplicates: true }).setHeader('Authorization', `Bearer ${token}`);
      }

      return true;
    } catch (e) {
      console.error('Upload Error:', e);
      return false;
    }
  },

  async verifyCloudBalance(): Promise<boolean> {
    const state = useFinanceStore.getState();
    const familyId = state.family?.id;
    const token = useAuthStore.getState().session?.access_token;
    if (!familyId || !token) return false;

    // Fetch cloud accounts
    const { data: cloudAccounts } = await supabase.from('accounts').select('id, balance').eq('family_id', familyId).setHeader('Authorization', `Bearer ${token}`);
    if (!cloudAccounts) return false;

    // Compare Balances
    for (const localAcc of state.accounts) {
      const cloudAcc = cloudAccounts.find(a => a.id === localAcc.id);
      if (!cloudAcc || Math.abs(cloudAcc.balance - localAcc.balance) > 0.01) {
        return false;
      }
    }
    
    // Verify Transaction Count
    const { count, error: countError } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('family_id', familyId).setHeader('Authorization', `Bearer ${token}`);
    if (countError || count !== state.transactions.length) {
      return false;
    }
    
    return true; // All matched!
  }
};
