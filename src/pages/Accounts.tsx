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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="text-primary-600" />
          {t('accounts.title') || 'Аккаунтлар'}
        </h1>
        <button
          onClick={() => { setIsAdding(!isAdding); setEditingId(null); setName(''); }}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary-700"
        >
          <Plus size={18} /> {t('accounts.add') || 'Счёт қосыў'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('accounts.name') || 'Аты'}</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('accounts.type') || 'Түри'}</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-4 py-2 border rounded-xl bg-white">
              <option value="bank">{t('accounts.bank') || 'Банк картасы'}</option>
              <option value="cash">{t('accounts.cash') || 'Наличка'}</option>
              <option value="savings">{t('accounts.savings') || 'Жинақ'}</option>
            </select>
          </div>
          <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-xl hover:bg-green-700">
            {t('family.save') || 'Сақлаў'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => handleEdit(acc)} className="text-gray-400 hover:text-blue-500"><Edit2 size={16} /></button>
              <button onClick={() => deleteAccount(acc.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            <div className="text-sm text-gray-500 mb-1 capitalize">{t(`accounts.${acc.type}`) || acc.type}</div>
            <div className="font-bold text-gray-900 mb-2">{acc.name}</div>
            <div className="text-xl font-bold text-primary-600">{formatCurrency(acc.balance)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
