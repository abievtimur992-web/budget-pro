import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Fund } from '../types';

export const fundRepository = {
  async fetchFunds(familyId: string, token?: string): Promise<Fund[]> {
    if (!isSupabaseConfigured) return [];
    
    const res = await supabase.from('funds').select('*', token, '&family_id=eq.' + familyId);
    
    if (res.data) {
      return res.data.map((f: any) => ({
        id: f.id,
        familyId: f.family_id,
        name: f.name,
        targetAmount: f.target_amount,
        currentAmount: f.current_amount,
        targetDate: f.target_date,
        icon: f.icon
      }));
    }
    return [];
  },

  async createFund(fund: Fund, familyId: string, token?: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    
    await supabase.from('funds').insert({
      id: fund.id,
      family_id: familyId,
      name: fund.name,
      target_amount: fund.targetAmount,
      current_amount: fund.currentAmount,
      target_date: fund.targetDate,
      icon: fund.icon
    }, token);
  },

  async updateFund(fund: Fund, token?: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    await supabase.from('funds').update({
      name: fund.name,
      target_amount: fund.targetAmount,
      target_date: fund.targetDate,
      icon: fund.icon
    }, token, 'id=eq.' + fund.id);
  },

  async deleteFund(fundId: string, token?: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.from('funds').delete({}, token, 'id=eq.' + fundId);
  }
};
