import { create } from 'zustand';
import { migrationService, Discrepancy } from '../services/migrationService';
import { useAuthStore } from './useAuthStore';
import { useFinanceStore } from './useFinanceStore';
import { useFamilyStore } from './useFamilyStore';

interface MigrationState {
  isOpen: boolean;
  step: 'detect' | 'mismatch' | 'locked' | 'confirm' | 'uploading' | 'verifying' | 'success' | 'error';
  progressMsg: string;
  discrepancies: Discrepancy[];
  totalCounts: { txs: number; accounts: number; budgets: number; funds: number; debts: number };
  
  openMigration: () => void;
  closeMigration: () => void;
  analyze: () => void;
  resolveMismatch: () => void;
  startUpload: () => Promise<void>;
  checkMigrationStatusOnLogin: () => Promise<void>;
}

export const useMigrationStore = create<MigrationState>((set, get) => ({
  isOpen: false,
  step: 'detect',
  progressMsg: '',
  discrepancies: [],
  totalCounts: { txs: 0, accounts: 0, budgets: 0, funds: 0, debts: 0 },

  openMigration: () => set({ isOpen: true, step: 'detect' }),
  closeMigration: () => set({ isOpen: false }),

  analyze: () => {
    const res = migrationService.analyzeData();
    set({ totalCounts: { txs: res.totalTransactions, accounts: res.totalAccounts, budgets: res.totalBudgets, funds: res.totalFunds, debts: res.totalDebts }});
    
    if (res.discrepancies.length > 0) {
      set({ step: 'mismatch', discrepancies: res.discrepancies });
    } else {
      set({ step: 'confirm' });
    }
  },

  resolveMismatch: () => {
    const { discrepancies } = get();
    discrepancies.forEach(d => {
      migrationService.generateOpeningBalance(d.accountId, d.diff);
    });
    // Re-analyze
    get().analyze();
  },

  startUpload: async () => {
    set({ step: 'uploading', progressMsg: 'Qwlptı alıў (Locking)...' });
    
    const state = useFinanceStore.getState();
    const familyId = state.family?.id;
    if (!familyId) return;
    
    // Use an ephemeral device ID
    const deviceId = Math.random().toString(36).substring(7);

    // 1. Lock
    const locked = await migrationService.acquireLock(familyId, deviceId);
    if (!locked) {
      set({ step: 'locked' });
      return;
    }

    // 2. Upload
    const uploaded = await migrationService.uploadData(deviceId, (msg) => set({ progressMsg: msg }));
    
    if (!uploaded) {
      await migrationService.releaseLock(familyId);
      set({ step: 'error', progressMsg: 'Júkleў barısında qate júz berdi. LocalStorage saqlandı.' });
      return;
    }

    // 3. Verify
    set({ step: 'verifying', progressMsg: 'Balanslar ҳám tekseriўler...' });
    const verified = await migrationService.verifyCloudBalance();
    
    if (verified) {
      await migrationService.completeMigration(familyId);
      set({ step: 'success', progressMsg: '100% SUCCESS' });
      
      // Notify stores
      useAuthStore.getState().completeMigration();
    } else {
      await migrationService.releaseLock(familyId);
      set({ step: 'error', progressMsg: 'Cloud ҳám Local Balansları teń emes! Migraciya biykar etildi. LocalStorage saqlandı.' });
    }
  },

  checkMigrationStatusOnLogin: async () => {
     // This will be called right after authentication
     // Handled inside useAuthStore mainly to prevent cloud boot
  }
}));
