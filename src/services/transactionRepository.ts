import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Transaction } from '../types';
import { useAuthStore } from '../store/useAuthStore';

// Transaction Repository handling Supabase interactions cleanly
export const transactionRepository = {
  async fetchTransactions(familyId: string, token?: string): Promise<Transaction[]> {
    if (!isSupabaseConfigured) return [];
    
    // Convert API query format if necessary
    const res = await supabase.from('transactions').select('*', token, '&family_id=eq.' + familyId + '&order=date.desc');
    
    if (res.data) {
      return res.data.map((t: any) => ({
        id: t.client_transaction_id || t.id,
        familyId: t.family_id,
        userId: t.created_by,
        date: t.date,
        type: t.type,
        amount: t.amount,
        accountId: t.account_id,
        targetAccountId: t.target_account_id,
        categoryId: t.category_id,
        comment: t.comment,
        createdAt: t.created_at,
        clientTransactionId: t.client_transaction_id,
        fundId: t.fund_id,
        debtId: t.debt_id,
        interestPortion: t.interest_portion,
        principalPortion: t.principal_portion,
        version: t.version
      }));
    }
    return [];
  },

  async createTransaction(tx: Transaction, familyId: string, token?: string): Promise<any> {
    if (!isSupabaseConfigured) return null;
    
    const payload = {
      family_id: familyId,
      created_by: tx.userId,
      date: tx.date,
      type: tx.type,
      amount: tx.amount,
      account_id: tx.accountId,
      target_account_id: tx.targetAccountId,
      category_id: tx.categoryId,
      comment: tx.comment,
      client_transaction_id: tx.id, // Using standard ID as the client idempotent key
      fund_id: tx.fundId,
      debt_id: tx.debtId,
      interest_portion: tx.interestPortion,
      principal_portion: tx.principalPortion
    };

    const res = await supabase.from('transactions').insert(payload, token);
    return res.data;
  },

  async getTransaction(txId: string, token?: string): Promise<Transaction | null> {
    if (!isSupabaseConfigured) return null;
    const res = await supabase.from('transactions').select('*', token, '&client_transaction_id=eq.' + txId);
    if (res.data && res.data.length > 0) {
      const t = res.data[0];
      return {
        id: t.client_transaction_id || t.id,
        familyId: t.family_id,
        userId: t.created_by,
        date: t.date,
        type: t.type,
        amount: t.amount,
        accountId: t.account_id,
        targetAccountId: t.target_account_id,
        categoryId: t.category_id,
        comment: t.comment,
        createdAt: t.created_at,
        clientTransactionId: t.client_transaction_id,
        fundId: t.fund_id,
        debtId: t.debt_id,
        interestPortion: t.interest_portion,
        principalPortion: t.principal_portion,
        version: t.version
      };
    }
    return null;
  },

  async updateTransaction(tx: Transaction, familyId: string, token?: string): Promise<any> {
    if (!isSupabaseConfigured) return null;

    const payload = {
      date: tx.date,
      type: tx.type,
      amount: tx.amount,
      account_id: tx.accountId,
      target_account_id: tx.targetAccountId,
      category_id: tx.categoryId,
      comment: tx.comment,
      fund_id: tx.fundId,
      debt_id: tx.debtId,
      interest_portion: tx.interestPortion,
      principal_portion: tx.principalPortion
    };

    // Assuming we match via client_transaction_id (tx.id)
    const res = await supabase.from('transactions').update(payload, token, 'client_transaction_id=eq.' + tx.id + '&family_id=eq.' + familyId);
    return res.data;
  },

  async deleteTransaction(txId: string, familyId: string, token?: string): Promise<any> {
    if (!isSupabaseConfigured) return null;
    
    const res = await supabase.from('transactions').delete({}, token, 'client_transaction_id=eq.' + txId + '&family_id=eq.' + familyId);
    return res;
  }
};
