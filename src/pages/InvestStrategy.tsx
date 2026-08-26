import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';
import { useInvestStore } from '../store/useInvestStore';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(val));
};

export const InvestStrategy = () => {
  const { 
    initialIncome, initialExpense, incomeGrowth, expenseGrowth,
    newSavingsReturn, existingCapitalReturn, years, goals,
    setParameters, addGoal, removeGoal 
  } = useInvestStore();

  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');

  const currentYear = new Date().getFullYear() - 1; // Start from e.g. 2025 to align with standard usage

  // Calculate Projection
  const projection = useMemo(() => {
    const data = [];
    let prevTotalCapital = 0;
    
    for (let i = 0; i < years; i++) {
      const year = currentYear + i;
      
      const income = i === 0 ? initialIncome : data[i-1].income * (1 + incomeGrowth / 100);
      const expense = i === 0 ? initialExpense : data[i-1].expense * (1 + expenseGrowth / 100);
      
      const delta = income - expense;
      
      const returnOnDelta = i === 0 ? 0 : delta * (newSavingsReturn / 100);
      const returnOnPrevCapital = i === 0 ? 0 : prevTotalCapital * (existingCapitalReturn / 100);
      
      const totalCapital = i === 0 ? delta : prevTotalCapital + delta + returnOnDelta + returnOnPrevCapital;
      
      data.push({
        year,
        income,
        expense,
        delta,
        returnOnDelta,
        returnOnPrevCapital,
        totalCapital
      });
      
      prevTotalCapital = totalCapital;
    }
    return data;
  }, [initialIncome, initialExpense, incomeGrowth, expenseGrowth, newSavingsReturn, existingCapitalReturn, years, currentYear]);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoalName && newGoalAmount) {
      addGoal({ name: newGoalName, targetAmount: Number(newGoalAmount) });
      setNewGoalName('');
      setNewGoalAmount('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
        <TrendingUp className="text-primary-600" size={32} />
        <h1 className="text-2xl font-bold dark:text-white">Invest strategiya</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 h-fit space-y-6">
          <h3 className="font-bold text-lg dark:text-white">Kórsetkishlerdi sazlaw</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Baslanǵısh dáramat (jıllıq)</label>
              <input type="number" value={initialIncome || ''} onChange={e => setParameters({ initialIncome: Number(e.target.value) })} className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Baslanǵısh qárejet (jıllıq)</label>
              <input type="number" value={initialExpense || ''} onChange={e => setParameters({ initialExpense: Number(e.target.value) })} className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1 dark:text-gray-300">Dáramat ósiwi %</label>
                <input type="number" value={incomeGrowth || ''} onChange={e => setParameters({ incomeGrowth: Number(e.target.value) })} className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 dark:text-gray-300">Qárejet ósiwi %</label>
                <input type="number" value={expenseGrowth || ''} onChange={e => setParameters({ expenseGrowth: Number(e.target.value) })} className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white text-sm" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1 dark:text-gray-300">Taza paydaǵa @%</label>
                <input type="number" value={newSavingsReturn || ''} onChange={e => setParameters({ newSavingsReturn: Number(e.target.value) })} className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 dark:text-gray-300">Eski kapitalǵa S%</label>
                <input type="number" value={existingCapitalReturn || ''} onChange={e => setParameters({ existingCapitalReturn: Number(e.target.value) })} className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Epsaplaw múddeti (jıl)</label>
              <input type="number" value={years || ''} onChange={e => setParameters({ years: Number(e.target.value) })} className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white" />
            </div>
          </div>

          <div className="pt-6 border-t dark:border-gray-700">
            <h3 className="font-bold text-lg dark:text-white mb-4">Maqsetler</h3>
            <div className="space-y-3 mb-4">
              {goals.map(goal => (
                <div key={goal.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-sm dark:text-white">{goal.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(goal.targetAmount)}</p>
                  </div>
                  <button onClick={() => removeGoal(goal.id)} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleAddGoal} className="space-y-3">
              <input type="text" placeholder="Maqset atı (mısalı, Úy)" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} required className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white text-sm" />
              <input type="number" placeholder="Summa (mısalı, 50000)" value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} required className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-700 dark:text-white text-sm" />
              <button type="submit" className="w-full bg-primary-600 text-white rounded-lg p-2 text-sm font-medium flex justify-center items-center gap-1"><Plus size={16} /> Maqset qosıw</button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {/* Chart */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
            <h3 className="font-bold text-lg mb-6 dark:text-white text-center">Millioner diagramması</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projection} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="year" stroke="#888" />
                  <YAxis stroke="#888" tickFormatter={(value) => formatCurrency(value)} width={80} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Kapital']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #374151', backgroundColor: '#1f2937', color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="totalCapital" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left dark:text-gray-300 whitespace-nowrap">
                <thead className="text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="px-3 py-3">Jıl</th>
                    <th className="px-3 py-3">D (Dáramat)</th>
                    <th className="px-3 py-3">R (Qárejet)</th>
                    <th className="px-3 py-3 text-green-600">Δ (Payda)</th>
                    <th className="px-3 py-3 text-blue-600">@ ({newSavingsReturn}%)</th>
                    <th className="px-3 py-3 text-purple-600">%S ({existingCapitalReturn}%)</th>
                    <th className="px-3 py-3 font-bold">$$ Kapital</th>
                    <th className="px-3 py-3">Maqsetler</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.map((row) => {
                    const affordableGoals = goals.filter(g => row.totalCapital >= g.targetAmount).map(g => g.name);
                    
                    return (
                      <tr key={row.year} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-3 font-medium dark:text-white">{row.year}</td>
                        <td className="px-3 py-3">{formatCurrency(row.income)}</td>
                        <td className="px-3 py-3">{formatCurrency(row.expense)}</td>
                        <td className="px-3 py-3 text-green-600 font-medium">{formatCurrency(row.delta)}</td>
                        <td className="px-3 py-3 text-blue-600">{formatCurrency(row.returnOnDelta)}</td>
                        <td className="px-3 py-3 text-purple-600">{formatCurrency(row.returnOnPrevCapital)}</td>
                        <td className="px-3 py-3 font-bold dark:text-white">{formatCurrency(row.totalCapital)}</td>
                        <td className="px-3 py-3">
                          {affordableGoals.length > 0 ? (
                            <span className="text-green-500 font-medium">{affordableGoals.join(', ')} ✓</span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
