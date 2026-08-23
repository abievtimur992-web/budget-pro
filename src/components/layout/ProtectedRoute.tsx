import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { initRealtime } from '../../lib/realtime';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, isSupabaseMode, isCloudPrimary, initialize, session } = useAuthStore();
  const { fetchAccounts, fetchTransactions, fetchBudgets, fetchFunds, fetchDebts, handleRealtimeEvent, setSyncStatus, processSyncQueue } = useFinanceStore();
  const { currentFamilyId } = useFamilyStore();
  const location = useLocation();

  useEffect(() => {
    initialize().then(() => {
      const state = useAuthStore.getState();
      if (state.isSupabaseMode && state.isAuthenticated) {
        useFamilyStore.getState().fetchFamily();
      }
    });
  }, [initialize]);

  useEffect(() => {
    let cleanup = () => {};

    if (isCloudPrimary && isSupabaseMode && isAuthenticated && currentFamilyId && session?.access_token) {
      // 1. Initial Fetch
      const refreshAll = () => {
        // First process local queue to sync up changes
        processSyncQueue().then(() => {
          fetchAccounts();
          fetchTransactions();
          fetchBudgets();
          fetchFunds();
          fetchDebts();
        });
      };
      
      refreshAll();

      // 2. Start Realtime Subscription
      cleanup = initRealtime(
        currentFamilyId,
        session.access_token,
        handleRealtimeEvent,
        setSyncStatus,
        refreshAll
      );
    }

    return () => {
      cleanup();
    };
  }, [isCloudPrimary, isSupabaseMode, isAuthenticated, currentFamilyId, session?.access_token, fetchAccounts, fetchTransactions, fetchBudgets, fetchFunds, fetchDebts, handleRealtimeEvent, setSyncStatus, processSyncQueue]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-700 dark:text-white">Loading...</div>;
  }

  // Fallback to LocalStorage mode if no Supabase config exists OR migration not yet completed
  if (!isSupabaseMode || !isCloudPrimary) {
    return <>{children}</>;
  }

  // Cloud Mode: Enforce Authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};




