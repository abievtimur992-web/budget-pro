import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Budget } from '../types';

export const budgetRepository = {
  async fetchBudgets(familyId: string, token?: string): Promise<Budget[]> {
    if (!isSupabaseConfigured) return [];
    
    // Fetch budgets and nested categories
    const res = await supabase.from('budgets').select('*, budget_categories(*)', token, '&family_id=eq.' + familyId);
    
    if (res.data) {
      return res.data.map((b: any) => ({
        id: b.id,
        familyId: b.family_id,
        month: b.month,
        totalIncome: b.total_income,
        categories: b.budget_categories ? b.budget_categories.map((c: any) => ({
          id: c.id,
          categoryId: c.category_id,
          limit: c.limit_amount
        })) : []
      }));
    }
    return [];
  },

  async createBudget(budget: Budget, familyId: string, token?: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    // 1. Insert Budget
    await supabase.from('budgets').insert({
      id: budget.id,
      family_id: familyId,
      month: budget.month,
      total_income: budget.totalIncome
    }, token);

    // 2. Insert Categories (if any)
    if (budget.categories.length > 0) {
      const payload = budget.categories.map(c => ({
        id: c.id,
        budget_id: budget.id,
        category_id: c.categoryId,
        limit_amount: c.limit
      }));
      // Our minimal fetch client handles array payloads for insert automatically if mapped correctly
      // But standard PostgREST array inserts work perfectly.
      await supabase.from('budget_categories').insert(payload, token);
    }
  },

  async updateBudgetIncome(budgetId: string, totalIncome: number, token?: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.from('budgets').update({ total_income: totalIncome }, token, 'id=eq.' + budgetId);
  },

  async updateCategoryLimit(budgetId: string, categoryId: string, limitId: string, limitAmount: number, token?: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    
    // Try updating first (via upsert logic or manual)
    // Since our fetch client might not support pure upsert headers out of the box, we update existing row.
    // If it doesn't exist, we should insert it, but our store creates them upfront.
    await supabase.from('budget_categories').update({ limit_amount: limitAmount }, token, 'id=eq.' + limitId);
  }
};
