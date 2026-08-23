import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { CreditCard, Plus, Trash2, Edit2 } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export const Accounts = () => {
  const { t } = useTranslation();
  const { isSupabaseMode, isAuthenticated } = useAuthStore();
  const { accounts, fetchAccounts, createAccount, updateAccount, deleteAccount } = useFinanceStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');

  useEffect(() => {
    if (isSupabaseMode && isAuthenticated) {
      fetchAccounts();
    }
  }, [isSupabaseMode, isAuthenticated, fetchAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const existing = accounts.find(a => a.id === editingId);
      await updateAccount({ id: editingId, name, type, balance: existing?.balance || 0, familyId: existing?.familyId || '' });
      setEditingId(null);
      setIsAdding(false);
    } else {
      await createAccount({ name, type });
      setIsAdding(false);
    }
    setName('');
    setType('bank');
  };

  const handleEdit = (acc: any) => {
    setEditingId(acc.id);
    setName(acc.name);
    setType(acc.type);
    setIsAdding(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CreditCard className="text-primary-600" />
          {t('accounts.title') || 'Akkawntlar'}
        </h1>
        <button
          onClick={() => { setIsAdding(!isAdding); setEditingId(null); setName(''); }}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary-700"
        >
          <Plus size={18} /> {t('accounts.add') || 'Schyot qosıў'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-end dark:text-white">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accounts.name') || 'Atı'}</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accounts.type') || 'Túri'}</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white">
              <option value="bank">{t('accounts.bank') || 'Bank kartası'}</option>
              <option value="cash">{t('accounts.cash') || 'Nalichka'}</option>
              <option value="savings">{t('accounts.savings') || 'Jinaq'}</option>
            </select>
          </div>
          <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-xl hover:bg-green-700">
            {t('family.save') || 'Saqlaў'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 border-gray-100 dark:border-gray-700 relative dark:text-white">
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => handleEdit(acc)} className="text-gray-400 hover:text-blue-500"><Edit2 size={16} /></button>
              <button onClick={() => deleteAccount(acc.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 capitalize">{t(`accounts.${acc.type}`) || acc.type}</div>
            <div className="font-bold text-gray-900 dark:text-white mb-2">{acc.name}</div>
            <div className="text-xl font-bold text-primary-600">{formatCurrency(acc.balance)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};




