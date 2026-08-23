import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../utils/format';
import { Search, Filter, Edit2, Trash2, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Calendar } from 'lucide-react';
import { Transaction } from '../types';

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'last_month';

export const Transactions = () => {
  const { t } = useTranslation();
  const { transactions, categories, accounts, deleteTransaction, updateTransaction, currentUser, family } = useFinanceStore();
  
  // Search and Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  
  // Modals
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter(tx => {
      // Type
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      
      // Category
      if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;
      
      // Account
      if (accountFilter !== 'all' && tx.accountId !== accountFilter && tx.targetAccountId !== accountFilter) return false;

      // Date logic
      const txDate = new Date(tx.date);
      const today = new Date();
      if (dateFilter === 'today') {
        if (txDate.toDateString() !== today.toDateString()) return false;
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (txDate.toDateString() !== yesterday.toDateString()) return false;
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date();
        startOfWeek.setDate(today.getDate() - today.getDay());
        if (txDate < startOfWeek) return false;
      } else if (dateFilter === 'month') {
        if (txDate.getMonth() !== today.getMonth() || txDate.getFullYear() !== today.getFullYear()) return false;
      } else if (dateFilter === 'last_month') {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        if (txDate.getMonth() !== lastMonth.getMonth() || txDate.getFullYear() !== lastMonth.getFullYear()) return false;
      }

      // Search
      if (search) {
        const query = search.toLowerCase();
        const catName = categories.find(c => c.id === tx.categoryId)?.name.toLowerCase() || '';
        const comment = tx.comment?.toLowerCase() || '';
        const amountStr = tx.amount.toString();
        if (!catName.includes(query) && !comment.includes(query) && !amountStr.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [sortedTransactions, search, typeFilter, categoryFilter, accountFilter, dateFilter, categories]);

  const handleDelete = (id: string) => {
    if (confirm('Бул операцияны өширесиз бе?')) {
      deleteTransaction(id);
    }
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTx && editAmount) {
      updateTransaction({
        ...editingTx,
        amount: Number(editAmount)
      });
      setEditingTx(null);
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === 'income') return <ArrowDownRight className="text-green-500" size={20} />;
    if (type === 'expense') return <ArrowUpRight className="text-red-500" size={20} />;
    return <ArrowRightLeft className="text-blue-500" size={20} />;
  };

  const getAmountColor = (type: string) => {
    if (type === 'income') return 'text-green-600';
    if (type === 'expense') return 'text-red-600';
    return 'text-gray-800 dark:text-white';
  };

  const getAmountPrefix = (type: string) => {
    if (type === 'income') return '+';
    if (type === 'expense') return '−';
    return '';
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Операциялар</h1>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700 space-y-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Излеў (категория, комментарий, сумма)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
          />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="border rounded-lg p-2 text-sm bg-gray-50">
            <option value="all">Барлық типлер</option>
            <option value="income">Кирис 🟢</option>
            <option value="expense">Шығыс 🔴</option>
            <option value="transfer">Трансфер 🔵</option>
          </select>

          <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)} className="border rounded-lg p-2 text-sm bg-gray-50">
            <option value="all">Бәрше ўақыт</option>
            <option value="today">Бүгин</option>
            <option value="yesterday">Кеше</option>
            <option value="week">Бул апта</option>
            <option value="month">Бул ай</option>
            <option value="last_month">Өткен ай</option>
          </select>

          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border rounded-lg p-2 text-sm bg-gray-50">
            <option value="all">Барлық категориялар</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} className="border rounded-lg p-2 text-sm bg-gray-50">
            <option value="all">Барлық есаплар</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
            Бул фильтрлер бойынша операциялар табылмады.
          </div>
        ) : (
          filteredTransactions.map(tx => {
            const category = categories.find(c => c.id === tx.categoryId);
            const account = accounts.find(a => a.id === tx.accountId);
            const targetAccount = accounts.find(a => a.id === tx.targetAccountId);
            const userName = currentUser?.id === tx.userId ? currentUser.name : 'Басқа ағза';
            
            return (
              <div key={tx.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4 group hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-gray-50 flex-shrink-0 mt-1">
                    {getTypeIcon(tx.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-400 text-sm">{formatDate(tx.date)}</span>
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg">
                      {tx.type === 'transfer' ? 'Трансфер' : category?.name || 'Кирис'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2 mt-1">
                      <span className="font-medium">
                        {account?.name} {tx.type === 'transfer' && targetAccount ? ` → ${targetAccount.name}` : ''}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span>{userName}</span>
                      {tx.comment && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span className="italic text-gray-500 dark:text-gray-400">"{tx.comment}"</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:gap-1">
                  <span className={`font-bold text-xl whitespace-nowrap ${getAmountColor(tx.type)}`}>
                    {getAmountPrefix(tx.type)}{formatCurrency(tx.amount)}
                  </span>
                  
                  <div className="flex space-x-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingTx(tx); setEditAmount(tx.amount.toString()); }} 
                      className="p-2 text-gray-500 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                      title="Өзгертиў"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(tx.id)} 
                      className="p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg"
                      title="Өшириў"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Операцияны өзгертиў</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Бул жерде өзгертилген сумма автоматлы түрде Басбет ҳәм Бюджет бетинде қайта есапланады.
            </p>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Жаңа сумма</label>
                <input 
                  type="number" 
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  className="w-full border dark:border-gray-700 rounded-lg p-2 bg-gray-50"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setEditingTx(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium">Бекарлаў</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg font-medium">Сақлаў</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



