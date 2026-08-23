import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../utils/format';
import { compareStrategies, calculateDebtFreeDate } from '../services/debtEngine';
import { Plus, CreditCard, ChevronRight, Trash2, Users } from 'lucide-react';

export const Debts = () => {
  const { 
    debts, debtStrategy, setDebtStrategy, accounts, addDebtPayment, addDebt, deleteDebt,
    funds, addFund, addFundContribution, addFundWithdrawal, deleteFund 
  } = useFinanceStore();
  
  const [activeTab, setActiveTab] = useState<'debts' | 'debtors'>('debts');
  const [extraPayment, setExtraPayment] = useState(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  
  // Forms
  const [dName, setDName] = useState('');
  const [dCreditor, setDCreditor] = useState('');
  const [dAmount, setDAmount] = useState('');
  const [dRate, setDRate] = useState('');
  const [dMin, setDMin] = useState('');
  const [dAccount, setDAccount] = useState(''); // For debtor lend account

  const [selectedDebtId, setSelectedDebtId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  // Data processing
  const strategies = compareStrategies(debts, extraPayment);
  const sortedDebts = [...debts].sort((a, b) => {
    if (debtStrategy === 'avalanche') return b.interestRate - a.interestRate;
    if (debtStrategy === 'snowball') return a.remainingAmount - b.remainingAmount;
    if (a.interestRate > 15 && b.interestRate <= 15) return -1;
    if (b.interestRate > 15 && a.interestRate <= 15) return 1;
    return a.remainingAmount - b.remainingAmount;
  });

  const debtors = funds.filter(f => f.name.startsWith('DEBTOR:'));

  const getStrategyName = (key: string) => {
    if (key === 'avalanche') return 'Avalanche (Жоғары пайыз бірінші)';
    if (key === 'snowball') return 'Snowball (Кіші сумма бірінші)';
    return 'Hybrid (Ақылды / Теңгерімді)';
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'debts') {
      if (dName && dCreditor && dAmount && dRate && dMin) {
        addDebt({
          name: dName, creditor: dCreditor,
          originalAmount: Number(dAmount),
          interestRate: Number(dRate),
          minimumPayment: Number(dMin),
          nextPaymentDate: new Date().toISOString()
        });
        setShowAddModal(false);
      }
    } else {
      if (dName && dAmount && dAccount) {
        const fundId = await addFund({
          name: `DEBTOR:${dName}`,
          targetAmount: Number(dAmount),
          icon: 'users',
          color: '#f59e0b'
        });
        if (fundId) {
          addFundContribution(fundId, Number(dAmount), dAccount, new Date().toISOString());
        }
        setShowAddModal(false);
      }
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDebtId && payAmount && payAccount && payDate) {
      if (activeTab === 'debts') {
        addDebtPayment(selectedDebtId, Number(payAmount), payAccount, new Date(payDate).toISOString());
      } else {
        // Receiving money from debtor means withdrawing from the fund to the account
        addFundWithdrawal(selectedDebtId, Number(payAmount), payAccount, new Date(payDate).toISOString());
      }
      setShowPayModal(false);
    }
  };

  const openAddModal = () => {
    setDName(''); setDCreditor(''); setDAmount(''); setDRate(''); setDMin(''); setDAccount('');
    setShowAddModal(true);
  };

  const openPayModal = (id: string) => {
    setSelectedDebtId(id);
    setPayAmount(''); setPayAccount('');
    setPayDate(new Date().toISOString().slice(0, 10));
    setShowPayModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
          {activeTab === 'debts' ? <CreditCard /> : <Users />} 
          Қарыздар
        </h1>
        <button onClick={openAddModal} className="bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700">
          <Plus size={24} />
        </button>
      </div>

      <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        <button 
          onClick={() => setActiveTab('debts')} 
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${activeTab === 'debts' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'}`}
        >
          Менің қарыздарым (Банктер)
        </button>
        <button 
          onClick={() => setActiveTab('debtors')} 
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${activeTab === 'debtors' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'}`}
        >
          Маған қарыздар (Дебиторка)
        </button>
      </div>

      {activeTab === 'debts' ? (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Жалпы статус</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Жалпы қарыз</p>
                <p className="font-bold text-xl dark:text-white">{formatCurrency(debts.reduce((a, b) => a + b.remainingAmount, 0))}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Айлық минимал төлем</p>
                <p className="font-bold text-xl text-red-500">{formatCurrency(debts.reduce((a, b) => a + b.minimumPayment, 0))}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Қосымша айлық төлем</p>
                <input 
                  type="number" 
                  value={extraPayment || ''} 
                  onChange={e => setExtraPayment(Number(e.target.value))}
                  placeholder="0 сум"
                  className="w-full border-b dark:border-gray-700 focus:outline-none focus:border-primary-500 font-bold text-xl text-green-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-2 dark:text-white">Стратегияны таңлау</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {(Object.entries(strategies) as [keyof typeof strategies, any][]).map(([key, result]) => (
              <div 
                key={key} 
                onClick={() => setDebtStrategy(key as any)}
                className={`cursor-pointer rounded-2xl p-4 border-2 transition-all ${debtStrategy === key ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600'}`}
              >
                <h3 className="font-bold text-lg mb-2 dark:text-white">{getStrategyName(key)}</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex justify-between"><span>Мерзімі:</span> <span className="font-medium text-gray-900 dark:text-white">{calculateDebtFreeDate(result.overallMonthsToPayoff)}</span></p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex justify-between"><span>Пайыз (зияны):</span> <span className="font-medium text-red-500">{formatCurrency(result.totalInterestPaid)}</span></p>
                </div>
                {debtStrategy === key && (
                  <div className="mt-3 text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center justify-center">Таңланды</div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {sortedDebts.map(debt => (
              <div key={debt.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border dark:border-gray-700 flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg dark:text-white">{debt.name} ({debt.creditor})</h3>
                    <button onClick={() => deleteDebt(debt.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={18} /></button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Пайыз: {debt.interestRate}% | Минимал төлем: {formatCurrency(debt.minimumPayment)}</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Қалды:</p>
                    <p className="font-bold text-xl text-red-500">{formatCurrency(debt.remainingAmount)}</p>
                  </div>
                  <button onClick={() => openPayModal(debt.id)} className="mt-2 text-sm bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg flex items-center gap-1">Төлем жасау <ChevronRight size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Жалпы Дебиторлық Қарыз</h2>
            <div className="grid grid-cols-1">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Достардағы ақша (Сырттағы ақша)</p>
                <p className="font-bold text-3xl text-green-600">{formatCurrency(debtors.reduce((a, b) => a + b.currentAmount, 0))}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {debtors.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-10">Әзірге ешкімге қарыз бермегенсіз.</p>
            ) : (
              debtors.map(fund => (
                <div key={fund.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border dark:border-gray-700 flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg dark:text-white">{fund.name.replace('DEBTOR:', '')}</h3>
                      <button onClick={() => deleteFund(fund.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={18} /></button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Берілген қарыз: {formatCurrency(fund.targetAmount)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Қайтару керек (Қалды):</p>
                      <p className="font-bold text-xl text-green-600">{formatCurrency(fund.currentAmount)}</p>
                    </div>
                    <button onClick={() => openPayModal(fund.id)} className="mt-2 text-sm bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg flex items-center gap-1">Қайтарды <ChevronRight size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4 dark:text-white">{activeTab === 'debts' ? 'Жаңа Қарыз Қосу' : 'Кімге қарыз бердіңіз?'}</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              {activeTab === 'debts' ? (
                <>
                  <input required placeholder="Қарыз аты (Мысалы: Автокредит)" className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" value={dName} onChange={e => setDName(e.target.value)} />
                  <input required placeholder="Кімге? (Мысалы: Халық банк)" className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" value={dCreditor} onChange={e => setDCreditor(e.target.value)} />
                  <input required type="number" placeholder="Қалған сома (Қалдық)" className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" value={dAmount} onChange={e => setDAmount(e.target.value)} />
                  <input required type="number" placeholder="Пайыз (Мысалы: 24)" className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" value={dRate} onChange={e => setDRate(e.target.value)} />
                  <input required type="number" placeholder="Минимал төлем сомасы" className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" value={dMin} onChange={e => setDMin(e.target.value)} />
                </>
              ) : (
                <>
                  <input required placeholder="Адамның аты (Мысалы: Ислам)" className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" value={dName} onChange={e => setDName(e.target.value)} />
                  <input required type="number" placeholder="Қанша бердіңіз?" className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" value={dAmount} onChange={e => setDAmount(e.target.value)} />
                  <select required className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" value={dAccount} onChange={e => setDAccount(e.target.value)}>
                    <option value="">Ақша қай шоттан кетті?</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                  </select>
                </>
              )}
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-lg">Болдырмау</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Сақтау</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4 dark:text-white">{activeTab === 'debts' ? 'Төлем жасау' : 'Ақшаны қайтарып алу'}</h3>
            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <select required className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" value={payAccount} onChange={e => setPayAccount(e.target.value)}>
                <option value="">{activeTab === 'debts' ? 'Ақша қай шоттан кетеді?' : 'Ақша қай шотқа түсті?'}</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
              </select>
              <input required type="number" placeholder="Сомасы" className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              <input required type="date" className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" value={payDate} onChange={e => setPayDate(e.target.value)} />
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-lg">Болдырмау</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Сақтау</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
