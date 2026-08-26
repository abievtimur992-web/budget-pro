import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
}

interface InvestState {
  initialIncome: number;
  initialExpense: number;
  incomeGrowth: number;
  expenseGrowth: number;
  newSavingsReturn: number;
  existingCapitalReturn: number;
  years: number;
  goals: Goal[];
  setParameters: (params: Partial<InvestState>) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  removeGoal: (id: string) => void;
}

export const useInvestStore = create<InvestState>()(
  persist(
    (set) => ({
      initialIncome: 3000,
      initialExpense: 2400,
      incomeGrowth: 30,
      expenseGrowth: 15,
      newSavingsReturn: 25,
      existingCapitalReturn: 30,
      years: 15,
      goals: [
        { id: 'goal-1', name: 'Avtomobil', targetAmount: 10000 },
        { id: 'goal-2', name: 'Úy', targetAmount: 50000 }
      ],
      setParameters: (params) => set((state) => ({ ...state, ...params })),
      addGoal: (goal) => set((state) => ({
        goals: [...state.goals, { ...goal, id: `goal-${Date.now()}` }]
      })),
      removeGoal: (id) => set((state) => ({
        goals: state.goals.filter(g => g.id !== id)
      }))
    }),
    {
      name: 'invest-storage'
    }
  )
);
