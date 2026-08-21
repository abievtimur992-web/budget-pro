import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Debt } from '../types';

export const debtRepository = {
  async fetchDebts(familyId: string, token?: string): Promise<Debt[]> {
    if (!isSupabaseConfigured) return [];
    
    const res = await supabase.from('debts').select('*', token, '&family_id=eq.' + familyId);
    
    if (res.data) {
      return res.data.map((d: any) => ({
        id: d.id,
        familyId: d.family_id,
        name: d.name,
        originalAmount: d.original_amount,
        remainingAmount: d.remaining_amount,
        interestRate: d.interest_rate,
        minimumPayment: d.minimum_payment
      }));
    }
    return [];
  },

  async createDebt(debt: Debt, familyId: string, token?: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    
    await supabase.from('debts').insert({
      id: debt.id,
      family_id: familyId,
      name: debt.name,
      original_amount: debt.originalAmount,
      remaining_amount: debt.remainingAmount,
      interest_rate: debt.interestRate,
      minimum_payment: debt.minimumPayment
    }, token);
  },

  async updateDebt(debt: Debt, token?: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    await supabase.from('debts').update({
      name: debt.name,
      original_amount: debt.originalAmount,
      interest_rate: debt.interestRate,
      minimum_payment: debt.minimumPayment
    }, token, 'id=eq.' + debt.id);
  },

  async deleteDebt(debtId: string, token?: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.from('debts').delete({}, token, 'id=eq.' + debtId);
  }
};
