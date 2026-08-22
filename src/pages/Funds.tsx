import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../utils/format';
import { calculateFundProgress, getFundTargetDate } from '../services/fundEngine';
import { generateSmartRecommendations } from '../services/decisionEngine';
import { Plus, Shield, TrendingUp, ChevronRight, ArrowUpCircle, ArrowDownCircle, Target, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { FundMilestones } from '../components/funds/FundMilestones';

export const Funds = () => {
  const { funds, debts, addFund, updateFund, deleteFund, addFundContribution, addFundWithdrawal, addDebtPayment, accounts } = useFinanceStore();
  const [surplus, setSurplus] = useState(1500000);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingFundId, setEditingFundId] = useState<string | null>(null);
  
  // Add/Edit Fund Form
  const [fName, setFName] = useState('');
  const [fTarget, setFTarget] = useState('');
  const [fMonthly, setFMonthly] = useState('');
  const [fPriority, setFPriority] = useState('3');

  // Tx Form
  const [selectedFundId, setSelectedFundId] = useState('');
  const [txType, setTxType] = useState<'contribute' | 'withdraw'>('contribute');
  const [txAmount, setTxAmount] = useState('');
  const [txAccount, setTxAccount] = useState('');

  const recommendations = generateSmartRecommendations(surplus, debts, funds);

  const applyRecommendation = (rec: any) => {
    let remainingFund = rec.fundAllocation;
    let remainingDebt = rec.debtAllocation;
    
    // Distribute to funds (priority 1 first, then 2, etc.)
    const sortedFunds = [...funds].sort((a, b) => a.priority - b.priority);
    for (const f of sortedFunds) {
      if (remainingFund <= 0) break;
      const shortfall = f.targetAmount - f.currentAmount;
      if (shortfall > 0) {
        const toAdd = Math.min(shortfall, remainingFund);
        if (toAdd > 0) {
          addFundContribution(f.id, toAdd, accounts[0]?.id || '', new Date().toISOString());
          remainingFund -= toAdd;
        }
      }
    }
    // If there's still fund money left, put it in the highest priority fund
    if (remainingFund > 0 && sortedFunds.length > 0) {
      addFundContribution(sortedFunds[0].id, remainingFund, accounts[0]?.id || '', new Date().toISOString());
    }

    // Distribute to debts (highest interest first)
    const sortedDebts = [...debts].sort((a, b) => b.interestRate - a.interestRate);
    for (const d of sortedDebts) {
      if (remainingDebt <= 0) break;
      if (d.remainingAmount > 0) {
        const toPay = Math.min(d.remainingAmount, remainingDebt);
        if (toPay > 0) {
          addDebtPayment(d.id, toPay, accounts[0]?.id || '', new Date().toISOString());
          remainingDebt -= toPay;
        }
      }
    }
    
    setSurplus(prev => Math.max(0, prev - rec.fundAllocation - rec.debtAllocation));
    alert('Реже сәтті қолданылды! Ақша қорлар мен қарыздарға бөлінді.');
  };

  const handleAddFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (fName && fTarget && fMonthly) {
      if (editingFundId) {
        const existing = funds.find(f => f.id === editingFundId);
        if (existing) {
          updateFund({
            ...existing,
            name: fName,
            targetAmount: Number(fTarget),
            monthlyContribution: Number(fMonthly),
            priority: Number(fPriority) as any,
          });
        }
      } else {
        addFund({
          name: fName,
          targetAmount: Number(fTarget),
          monthlyContribution: Number(fMonthly),
          priority: Number(fPriority) as any,
          icon: 'shield', color: 'bg-blue-500'
        });
      }
      setShowAddModal(false);
      setEditingFundId(null);
      setFName(''); setFTarget(''); setFMonthly('');
    }
  };

  const handleEditFund = (fund: any) => {
    setEditingFundId(fund.id);
    setFName(fund.name);
    setFTarget(fund.targetAmount.toString());
    setFMonthly(fund.monthlyContribution.toString());
    setFPriority(fund.priority.toString());
    setShowAddModal(true);
  };

  const handleTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFundId && txAmount && txAccount) {
      if (txType === 'contribute') {
        addFundContribution(selectedFundId, Number(txAmount), txAccount, new Date().toISOString());
      } else {
        addFundWithdrawal(selectedFundId, Number(txAmount), txAccount, new Date().toISOString());
      }
      setShowTxModal(false);
      setTxAmount('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield /> Қорлар (Сбережения)</h1>
        <button onClick={() => setShowAddModal(true)} className="bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700">
          <Plus size={24} />
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-primary-600 rounded-3xl p-6 shadow-sm text-white mb-6">
        <h2 className="text-lg opacity-90 mb-1">Жалпы қор</h2>
        <p className="font-bold text-3xl mb-4">{formatCurrency(funds.reduce((a, b) => a + b.currentAmount, 0))}</p>
        <div className="w-full bg-white/20 rounded-full h-2 mb-2">
          <div 
            className="bg-white h-2 rounded-full" 
            style={{ width: `${Math.min(100, Math.round((funds.reduce((a,b)=>a+b.currentAmount,0) / Math.max(1, funds.reduce((a,b)=>a+b.targetAmount,0))) * 100))}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm opacity-90">
          <span>Мақсет: {formatCurrency(funds.reduce((a, b) => a + b.targetAmount, 0))}</span>
          <span>{Math.round((funds.reduce((a,b)=>a+b.currentAmount,0) / Math.max(1, funds.reduce((a,b)=>a+b.targetAmount,0))) * 100)}%</span>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="text-yellow-600 mt-1" />
            <div className="w-full">
              <h3 className="font-bold text-yellow-800 text-lg mb-2">Smart Decision Engine</h3>
              <p className="text-sm text-yellow-700 mb-4">
                Сизде жобаланған бос ақша бар. Система сиздиң қарыз ҳәм қор жағдайыңызды анализлеп, төмендеги инвестиция/төлем вариантларын усынады:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-yellow-100">
                    <h4 className="font-bold text-gray-800 mb-1">{rec.title}</h4>
                    <p className="text-xs text-gray-600 font-medium mb-2">{rec.description}</p>
                    <p className="text-sm text-gray-500">{rec.reason}</p>
                    <button 
                      onClick={() => applyRecommendation(rec)}
                      className="mt-3 w-full bg-yellow-100 text-yellow-800 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-200"
                    >
                      Усы режени қолланыў
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">Мақсетли қорлар</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {funds.map(fund => {
          const progress = calculateFundProgress(fund);
          return (
            <div key={fund.id} className="bg-white rounded-2xl p-5 shadow-sm border relative">
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => handleEditFund(fund)} className="text-gray-400 hover:text-blue-500"><Edit2 size={16} /></button>
                <button onClick={() => deleteFund(fund.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
              <div className="flex justify-between items-start mb-4 pr-16">
                <div>
                  <h3 className="font-bold text-lg">{fund.name}</h3>
                  <p className="text-xs text-gray-500">Мақсат: {getFundTargetDate(fund)}</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-lg text-gray-600">
                  Priority {fund.priority}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(fund.currentAmount)}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(fund.targetAmount)}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${fund.color}`} style={{ width: `${progress}%` }}></div>
                </div>
                
                <FundMilestones current={fund.currentAmount} target={fund.targetAmount} />
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => { setSelectedFundId(fund.id); setTxType('contribute'); setShowTxModal(true); }}
                  className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-100"
                >
                  Қосыў
                </button>
                <button 
                  onClick={() => { setSelectedFundId(fund.id); setTxType('withdraw'); setShowTxModal(true); }}
                  className="flex-1 bg-gray-50 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
                >
                  Алыў
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">{editingFundId ? 'Қорды өзгерту' : 'Жаңа қор қосу'}</h3>
            <form onSubmit={handleAddFund} className="space-y-3">
              <input required placeholder="Қор аты (мысалы: Саяхат)" className="w-full border rounded-lg p-2" value={fName} onChange={e => setFName(e.target.value)} />
              <input required type="number" placeholder="Мақсет сумма (Сум)" className="w-full border rounded-lg p-2" value={fTarget} onChange={e => setFTarget(e.target.value)} />
              <input required type="number" placeholder="Ай сайын қосып барыў" className="w-full border rounded-lg p-2" value={fMonthly} onChange={e => setFMonthly(e.target.value)} />
              <select className="w-full border rounded-lg p-2" value={fPriority} onChange={e => setFPriority(e.target.value)}>
                <option value="1">1 - Өте маңызлы (Emergency)</option>
                <option value="2">2 - Маңызлы (Үй/Машина)</option>
                <option value="3">3 - Орташа (Саяхат)</option>
                <option value="4">4 - Төмен</option>
              </select>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => { setShowAddModal(false); setEditingFundId(null); setFName(''); setFTarget(''); setFMonthly(''); }} className="flex-1 py-2 bg-gray-100 rounded-lg">Бекарлау</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Сақлау</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTxModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">
              {txType === 'contribute' ? 'Қорға ақша қосыў' : 'Қордан ақша алыў'}
            </h3>
            <form onSubmit={handleTx} className="space-y-3">
              <select required className="w-full border rounded-lg p-2" value={txAccount} onChange={e => setTxAccount(e.target.value)}>
                <option value="">Қайсы есаптан?</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
              </select>
              <input required type="number" placeholder="Сумма" className="w-full border rounded-lg p-2" value={txAmount} onChange={e => setTxAmount(e.target.value)} />
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowTxModal(false)} className="flex-1 py-2 bg-gray-100 rounded-lg">Бекарлаў</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Сақлаў</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
