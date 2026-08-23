import React, { useEffect } from 'react';
import { useMigrationStore } from '../../store/useMigrationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { AlertCircle, CheckCircle, Database, Lock, Play, RefreshCw, Server, Shield } from 'lucide-react';

export const MigrationModal = () => {
  const { isCloudPrimary, isAuthenticated, isSupabaseMode } = useAuthStore();
  const { currentFamilyId, family: cloudFamily } = useFamilyStore();
  const { isOpen, step, progressMsg, discrepancies, totalCounts, openMigration, analyze, resolveMismatch, startUpload } = useMigrationStore();

  useEffect(() => {
    // Show modal if logged in but migration not yet completed (and we are in Supabase mode)
    if (isSupabaseMode && isAuthenticated && !isCloudPrimary && currentFamilyId && cloudFamily) {
      if (cloudFamily.migration_status === 'completed') {
        useAuthStore.getState().completeMigration();
      } else {
        openMigration();
        analyze();
      }
    }
  }, [isSupabaseMode, isAuthenticated, isCloudPrimary, currentFamilyId, cloudFamily, openMigration, analyze]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-primary-600 p-6 text-white flex flex-col items-center">
          <Database size={48} className="mb-4 opacity-90" />
          <h2 className="text-2xl font-bold dark:text-white">Cloud Migration</h2>
          <p className="text-primary-100 text-center mt-2 text-sm">
            Lokal maǵlıўmatlarıńızdı qáўipsiz túrde Bwltqa kóshiriў
          </p>
        </div>

        <div className="p-8">
          {step === 'detect' && (
            <div className="flex flex-col items-center text-center py-8">
              <RefreshCw className="animate-spin text-primary-500 mb-4" size={32} />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Maǵlıўmatlar tekserilmekte...</p>
            </div>
          )}

          {step === 'mismatch' && (
            <div className="flex flex-col">
              <div className="flex items-center gap-3 text-red-600 mb-4 bg-red-50 p-4 rounded-xl">
                <AlertCircle className="flex-shrink-0" />
                <p className="text-sm font-semibold">Balanslar ҳám tranzakciyalar arasında ayırmashılıq tabıldı!</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Kóshiriўdi daўam etiў wshın tranzakciya tariyxı balansqa sáykes keliўi shárt.
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 dark:text-white border dark:border-gray-700 rounded-xl overflow-hidden mb-6">
                {discrepancies.map(d => (
                  <div key={d.accountId} className="p-3 border-b last:border-b-0 flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-800 dark:text-white">{d.name}</span>
                    <span className="text-red-600 font-bold">{d.diff > 0 ? '+' : ''}{d.diff}</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={resolveMismatch}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
              >
                Baslanǵısh balans tranzakciyaların qosıў
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="flex flex-col">
              <div className="bg-green-50 text-green-700 p-4 rounded-xl flex gap-3 mb-6 items-start">
                <CheckCircle className="flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">Barlıq maǵlıўmatlar teńserildi ҳám bwltqa kóshiriўge tayar.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 dark:bg-gray-700 dark:text-white p-4 rounded-xl text-center border dark:border-gray-700">
                  <p className="text-2xl font-bold text-gray-800 dark:text-white dark:text-white">{totalCounts.accounts}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">Akkawntlar</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 dark:text-white p-4 rounded-xl text-center border dark:border-gray-700">
                  <p className="text-2xl font-bold text-gray-800 dark:text-white dark:text-white">{totalCounts.txs}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">Tranzakciyalar</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 dark:text-white p-4 rounded-xl text-center border dark:border-gray-700">
                  <p className="text-2xl font-bold text-gray-800 dark:text-white dark:text-white">{totalCounts.funds}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">Qorlar</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 dark:text-white p-4 rounded-xl text-center border dark:border-gray-700">
                  <p className="text-2xl font-bold text-gray-800 dark:text-white dark:text-white">{totalCounts.debts}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">Qarızlar</p>
                </div>
              </div>

              <button 
                onClick={startUpload}
                className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary-600/30 transition-colors"
              >
                <Server size={18} />
                Bwltqa Kóshiriўdi Baslaў
              </button>
            </div>
          )}

          {step === 'locked' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 flex items-center justify-center rounded-full mb-4">
                <Lock size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Blokqa tústi</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Basqa qwrılmada kóshiriў processi júrip atır. Process ayaqlanǵansha kúte twrıńız.
              </p>
            </div>
          )}

          {(step === 'uploading' || step === 'verifying') && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-gray-100 dark:border-gray-700 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-primary-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                <Server className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {step === 'uploading' ? 'Júklenbekte...' : 'Tekserilmekte...'}
              </h3>
              <p className="text-sm font-medium text-primary-600 px-4 py-2 bg-primary-50 rounded-lg inline-block">
                {progressMsg}
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center rounded-full mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Qate júz berdi</h3>
              <p className="text-red-600 text-sm font-medium p-4 bg-red-50 rounded-xl mb-6 border dark:border-gray-700 border-red-100 dark:bg-gray-800 dark:text-white">
                {progressMsg}
              </p>
              <button 
                onClick={analyze}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:text-white rounded-xl font-medium transition-colors"
              >
                Qaytadan kóriў
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-20 h-20 bg-green-100 text-green-600 flex items-center justify-center rounded-full mb-6">
                <Shield size={40} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sátti ayaqlandı!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Maǵlıўmatlarıńız bwltqa tolıq ҳám qáўipsiz kóshirildi. Endi Cloud Primary rejiminde islep atırsız.
              </p>
              <button 
                onClick={() => useAuthStore.getState().completeMigration()}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-lg shadow-green-600/30 transition-colors"
              >
                Daўam etiў
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};




