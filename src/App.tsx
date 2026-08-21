import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import i18n from './i18n';
import { authTranslations } from './locales/authTranslations';
import { familyTranslations } from './locales/familyTranslations';
import { accountsTranslations } from './locales/accountsTranslations';
import { useFinanceStore } from './store/useFinanceStore';
import { useAuthStore } from './store/useAuthStore';
import { AppLayout } from './components/layout/AppLayout';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Budget } from './pages/Budget';
import { Transactions } from './pages/Transactions';
import { Funds } from './pages/Funds';
import { Debts } from './pages/Debts';
import { Analytics } from './pages/Analytics';
import { FamilySettings } from './pages/FamilySettings';
import { Accounts } from './pages/Accounts';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Recovery } from './pages/auth/Recovery';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Inject Auth, Family & Accounts Translations safely
Object.keys(authTranslations).forEach(lng => {
  i18n.addResourceBundle(lng, 'translation', authTranslations[lng as keyof typeof authTranslations], true, true);
  i18n.addResourceBundle(lng, 'translation', familyTranslations[lng as keyof typeof familyTranslations], true, true);
  i18n.addResourceBundle(lng, 'translation', accountsTranslations[lng as keyof typeof accountsTranslations], true, true);
});

export default function App() {
  const family = useFinanceStore(state => state.family);
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recovery" element={<Recovery />} />

        {/* Protected Application Routes */}
        {!family ? (
          <>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </>
        ) : (
          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/funds" element={<Funds />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/family" element={<FamilySettings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}
