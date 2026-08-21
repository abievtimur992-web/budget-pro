import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../utils/format';
import { compareStrategies, calculateDebtFreeDate } from '../services/debtEngine';
import { Plus, CreditCard, ChevronRight, TrendingDown } from 'lucide-react';

export const Debts = () => {
  const { debts, debtStrategy, setDebtStrategy, accounts, addDebtPayment, addDebt } = useFinanceStore();
  const [extraPayment, setExtraPayment] = useState(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  
  // Add Debt Form
  const [dName, setDName] = useState('');
  const [dCreditor, setDCreditor] = useState('');
  const [dAmount, setDAmount] = useState('');
  const [dRate, setDRate] = useState('');
  const [dMin, setDMin] = useState('');

  // Pay Form
  const [selectedDebtId, setSelectedDebtId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payAccount, setPayAccount] = useState('');

  const strategies = compareStrategies(debts, extraPayment);

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (dName && dCreditor && dAmount && dRate && dMin) {
      addDebt({
        name: dName, creditor: dCreditor,
        originalAmount: Number(dAmount),
        interestRate: Number(dRate),
        minimumPayment: Number(dMin),
        nextPaymentDate: new Date().toISOString()
      });
      setShowAddModal(false);
      setDName(''); setDCreditor(''); setDAmount(''); setDRate(''); setDMin('');
    }
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDebtId && payAmount && payAccount) {
      addDebtPayment(selectedDebtId, Number(payAmount), payAccount, new Date().toISOString());
      setShowPayModal(false);
      setPayAmount('');
    }
  };

  const getStrategyName = (key: string) => {
    if (key === 'avalanche') return 'Avalanche (Жоқары пайыз биринши)';
    if (key === 'snowball') return 'Snowball (Киши сумма биринши)';
    return 'Hybrid (Ақыллы/Теңгеримли)';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard /> Қарыздан қутылыў</h1>
        <button onClick={() => setShowAddModal(true)} className="bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700">
          <Plus size={24} />
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-xl font-bold mb-4">Жалпы статус</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Жалпы қарыз</p>
            <p className="font-bold text-xl">{formatCurrency(debts.reduce((a, b) => a + b.remainingAmount, 0))}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Айлық минимал төлем</p>
            <p className="font-bold text-xl text-red-500">{formatCurrency(debts.reduce((a, b) => a + b.minimumPayment, 0))}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Қосымша айлық төлем</p>
            <input 
              type="number" 
              value={extraPayment || ''} 
              onChange={e => setExtraPayment(Number(e.target.value))}
              placeholder="0 сум"
              className="w-full border-b focus:outline-none focus:border-primary-500 font-bold text-xl text-green-600"
            />
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-2">Стратегияны таңлаў</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {(Object.entries(strategies) as [keyof typeof strategies, any][]).map(([key, result]) => (
          <div 
            key={key} 
            onClick={() => setDebtStrategy(key as any)}
            className={`cursor-pointer rounded-2xl p-4 border-2 transition-all ${debtStrategy === key ? 'border-primary-600 bg-primary-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
          >
            <h3 className="font-bold text-lg mb-2">{getStrategyName(key)}</h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-600 flex justify-between"><span>Мерзими:</span> <span className="font-medium text-gray-900">{calculateDebtFreeDate(result.overallMonthsToPayoff)}</span></p>
              <p className="text-sm text-gray-600 flex justify-between"><span>Пайыз (зияны):</span> <span className="font-medium text-red-500">{formatCurrency(result.totalInterestPaid)}</span></p>
            </div>
            {debtStrategy === key && (
              <div className="mt-3 text-xs text-primary-600 font-medium flex items-center justify-center">
                Таңланды
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-4">Менің қарыздарым</h2>
      <div className="space-y-4">
        {debts.map(debt => (
          <div key={debt.id} className="bg-white rounded-2xl p-5 shadow-sm border flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">{debt.name} ({debt.creditor})</h3>
              <p className="text-sm text-gray-500">Пайыз: {debt.interestRate}% | Минимал төлем: {formatCurrency(debt.minimumPayment)}</p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-xs text-gray-500">Қалды:</p>
              <p className="font-bold text-xl text-red-500">{formatCurrency(debt.remainingAmount)}</p>
              <button 
                onClick={() => { setSelectedDebtId(debt.id); setShowPayModal(true); }}
                className="mt-2 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                Төлем жасаў <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Қарыз қосыў</h3>
            <form onSubmit={handleAddDebt} className="space-y-3">
              <input required placeholder="Қарыз аты (мысалы: Машина)" className="w-full border rounded-lg p-2" value={dName} onChange={e => setDName(e.target.value)} />
              <input required placeholder="Кимнен (мысалы: Халық Банк)" className="w-full border rounded-lg p-2" value={dCreditor} onChange={e => setDCreditor(e.target.value)} />
              <input required type="number" placeholder="Улыўма сумма (Қалған)" className="w-full border rounded-lg p-2" value={dAmount} onChange={e => setDAmount(e.target.value)} />
              <input required type="number" placeholder="Жыллық пайыз (мысалы: 24)" className="w-full border rounded-lg p-2" value={dRate} onChange={e => setDRate(e.target.value)} />
              <input required type="number" placeholder="Минимал айлық төлем" className="w-full border rounded-lg p-2" value={dMin} onChange={e => setDMin(e.target.value)} />
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-gray-100 rounded-lg">Бекарлаў</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Қосыў</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Қарыз төлеми</h3>
            <form onSubmit={handlePayment} className="space-y-3">
              <select required className="w-full border rounded-lg p-2" value={payAccount} onChange={e => setPayAccount(e.target.value)}>
                <option value="">Қайсы есаптан алынады?</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
              </select>
              <input required type="number" placeholder="Төлем суммасы" className="w-full border rounded-lg p-2" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 py-2 bg-gray-100 rounded-lg">Бекарлаў</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Төлеў</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
