import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, getCurrentMonth, getPreviousMonth, getNextMonth, formatMonthName } from '../utils/format';
import { calculateSpentByCategory, calculateTotalSpent, getUnallocatedIncome } from '../services/budgetEngine';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, ArrowRightLeft } from 'lucide-react';

export const Budget = () => {
  const { t } = useTranslation();
  const { categories, budgets, transactions, debts, createBudgetForMonth, updateCategoryLimit, addCategory, deleteCategory, transferCategoryLimit } = useFinanceStore();
  
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  
  const currentBudget = budgets.find(b => b.month === selectedMonth);
  const prevBudget = budgets.find(b => b.month === getPreviousMonth(selectedMonth));

  // Edit Modal States
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState('');

  // Add Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatLimit, setNewCatLimit] = useState('');

  // Transfer Modal
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Virtual Debt Row
  const totalDebtMinLimit = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const totalDebtSpent = transactions
    .filter(t => t.type === 'debt_payment' && t.date.startsWith(selectedMonth))
    .reduce((sum, t) => sum + t.amount, 0);

  // Computed Values
  const monthlyIncome = currentBudget?.totalIncome || 0;
  const allocatedBudget = (currentBudget?.categories.reduce((sum, c) => sum + c.limit, 0) || 0) + totalDebtMinLimit;
  const unallocated = monthlyIncome - allocatedBudget;
  const totalSpent = calculateTotalSpent(transactions, selectedMonth);
  const remainingTotal = monthlyIncome - totalSpent;
  const varianceTotal = allocatedBudget - totalSpent;

  const handleCopyPrev = () => {
    createBudgetForMonth(selectedMonth, getPreviousMonth(selectedMonth));
  };

  const handleCreateEmpty = () => {
    createBudgetForMonth(selectedMonth);
  };

  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCatId && currentBudget) {
      updateCategoryLimit(selectedMonth, editingCatId, Number(editLimit));
      setEditingCatId(null);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName) {
      addCategory(newCatName, 'tag', Number(newCatLimit) || 0, selectedMonth);
      setShowAddModal(false);
      setNewCatName('');
      setNewCatLimit('');
    }
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferFrom && transferTo && transferAmount) {
      transferCategoryLimit(selectedMonth, transferFrom, transferTo, Number(transferAmount));
      setShowTransferModal(false);
      setTransferAmount('');
    }
  };

  const handleDelete = (id: string) => {
    const isUsed = calculateSpentByCategory(transactions, id, selectedMonth) > 0 || (currentBudget?.categories.find(c => c.categoryId === id)?.limit || 0) > 0;
    if (isUsed) {
      const confirmTransfer = confirm('Бул категорияда бюджет ямаса транзакциялар бар. Басқа категорияға өткериўди қәлейсиз бе? (ОК - Ҳәзирше жай ғана өшириў)');
      if (confirmTransfer) {
        deleteCategory(id, null); // In real app, prompt for which category to transfer to
      }
    } else {
      deleteCategory(id, null);
    }
  };

  if (!currentBudget) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
          <button onClick={() => setSelectedMonth(getPreviousMonth(selectedMonth))} className="p-2"><ChevronLeft /></button>
          <h2 className="text-xl font-bold">{formatMonthName(selectedMonth)}</h2>
          <button onClick={() => setSelectedMonth(getNextMonth(selectedMonth))} className="p-2"><ChevronRight /></button>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
          <h3 className="text-xl font-medium mb-4">Бул айға бюджет қурылмаған</h3>
          <div className="space-x-4">
            {prevBudget && (
              <button onClick={handleCopyPrev} className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium">
                Өткен ай бюджетин көшириў
              </button>
            )}
            <button onClick={handleCreateEmpty} className="bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-medium">
              Жаңадан баслаў
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Month Selector */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <button onClick={() => setSelectedMonth(getPreviousMonth(selectedMonth))} className="p-2"><ChevronLeft /></button>
        <h2 className="text-xl font-bold">{formatMonthName(selectedMonth)}</h2>
        <button onClick={() => setSelectedMonth(getNextMonth(selectedMonth))} className="p-2"><ChevronRight /></button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Айлық кирис</p>
          <p className="font-bold">{formatCurrency(monthlyIncome)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Жалпы бюджет</p>
          <p className="font-bold">{formatCurrency(allocatedBudget)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Жумсалғаны</p>
          <p className="font-bold text-red-600">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-gray-500">Қалған бюджет</p>
          <p className="font-bold text-green-600">{formatCurrency(remainingTotal)}</p>
        </div>
      </div>

      {/* Zero-based Alert */}
      {unallocated === 0 ? (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl text-center font-bold">
          ✓ БАРЛЫҚ АҚШАҢЫЗҒА МАҚСЕТ БЕРИЛДИ
        </div>
      ) : unallocated > 0 ? (
        <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-center font-bold">
          🟢 БӨЛИНБЕГЕН АҚША: {formatCurrency(unallocated)}
        </div>
      ) : (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-center font-bold">
          🔴 БЮДЖЕТ АРТЫҚ БӨЛИНГЕН: {formatCurrency(Math.abs(unallocated))}
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Категориялар</h3>
          <div className="flex space-x-2">
            <button onClick={() => setShowTransferModal(true)} className="text-gray-500 p-2 bg-white rounded-full shadow-sm"><ArrowRightLeft size={18} /></button>
            <button onClick={() => setShowAddModal(true)} className="text-primary-600 p-2 bg-white rounded-full shadow-sm"><Plus size={18} /></button>
          </div>
        </div>

        {/* Debt Virtual Category */}
        {debts.length > 0 && (
          <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-100">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-red-800">Қарыз төлемлери (Мәжбүрий)</h4>
                <p className="text-xs text-red-600">{totalDebtSpent >= totalDebtMinLimit ? '🟢 Нормада (Жабылды)' : '🟡 Төлеў керек'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mb-3">
              <div>
                <p className="text-red-400 text-xs">Бюджет:</p>
                <p className="font-medium text-red-900">{formatCurrency(totalDebtMinLimit)}</p>
              </div>
              <div>
                <p className="text-red-400 text-xs">Төленгени:</p>
                <p className="font-medium text-red-900">{formatCurrency(totalDebtSpent)}</p>
              </div>
              <div>
                <p className="text-red-400 text-xs">Қалғаны:</p>
                <p className="font-medium text-red-900">{formatCurrency(totalDebtMinLimit - totalDebtSpent)}</p>
              </div>
            </div>
            <div className="w-full bg-red-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-red-600"
                style={{ width: `${Math.min((totalDebtSpent / (totalDebtMinLimit || 1)) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {currentBudget.categories.map(cb => {
          const cat = categories.find(c => c.id === cb.categoryId);
          if (!cat) return null;
          
          const spent = calculateSpentByCategory(transactions, cb.categoryId, selectedMonth);
          const remaining = cb.limit - spent;
          const percent = cb.limit > 0 ? (spent / cb.limit) * 100 : (spent > 0 ? 100 : 0);
          
          let statusColor = 'bg-green-500';
          let statusText = '🟢 Нормада';
          if (percent >= 100) {
            statusColor = 'bg-red-500';
            statusText = '🔴 Лимиттен асты (Артық шығын)';
          } else if (percent >= 75) {
            statusColor = 'bg-yellow-500';
            statusText = '🟡 Абай болыңыз';
          }

          return (
            <div key={cb.id} className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold">{cat.name}</h4>
                  <p className="text-xs text-gray-500">{statusText}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => { setEditingCatId(cb.categoryId); setEditLimit(cb.limit.toString()); }} className="text-gray-400 hover:text-blue-500"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(cb.categoryId)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div>
                  <p className="text-gray-500 text-xs">Бюджет:</p>
                  <p className="font-medium">{formatCurrency(cb.limit)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Жумсалғаны:</p>
                  <p className="font-medium text-red-500">{formatCurrency(spent)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Қалғаны (Variance):</p>
                  <p className={`font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(remaining)}</p>
                </div>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${statusColor}`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                ></div>
              </div>
              <div className="text-right mt-1">
                <span className="text-xs font-bold text-gray-500">{percent.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {editingCatId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Бюджетти өзгертиў</h3>
            <form onSubmit={handleSaveLimit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Жаңа лимит суммасы</label>
                <input 
                  type="number" 
                  value={editLimit}
                  onChange={e => setEditLimit(e.target.value)}
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setEditingCatId(null)} className="flex-1 py-2 bg-gray-100 rounded-lg">Бекарлаў</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Сақлаў</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Категория қосыў</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Категория аты</label>
                <input required type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full border rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Айлық лимит</label>
                <input required type="number" value={newCatLimit} onChange={e => setNewCatLimit(e.target.value)} className="w-full border rounded-lg p-2" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-gray-100 rounded-lg">Бекарлаў</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Қосыў</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Ақша аўыстырыў</h3>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Қайсы категориядан алынады?</label>
                <select required value={transferFrom} onChange={e => setTransferFrom(e.target.value)} className="w-full border rounded-lg p-2">
                  <option value="">Таңлаң...</option>
                  {currentBudget.categories.map(cb => {
                    const c = categories.find(cat => cat.id === cb.categoryId);
                    return c ? <option key={c.id} value={c.id}>{c.name} ({formatCurrency(cb.limit)})</option> : null;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Қайсы категорияға қосылады?</label>
                <select required value={transferTo} onChange={e => setTransferTo(e.target.value)} className="w-full border rounded-lg p-2">
                  <option value="">Таңлаң...</option>
                  {currentBudget.categories.map(cb => {
                    const c = categories.find(cat => cat.id === cb.categoryId);
                    return c ? <option key={c.id} value={c.id}>{c.name}</option> : null;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Сумма</label>
                <input required type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="w-full border rounded-lg p-2" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 py-2 bg-gray-100 rounded-lg">Бекарлаў</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Аўыстырыў</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
