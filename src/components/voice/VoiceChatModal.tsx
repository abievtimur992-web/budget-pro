import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, X, Send, AlertTriangle } from 'lucide-react';
import { parseFinancialText, ParsedTransaction } from '../../services/voice/transactionParser';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, getCurrentMonth } from '../../utils/format';
import { calculateSpentByCategory, checkOverspending } from '../../services/budgetEngine';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  parsedData?: ParsedTransaction;
  isWarning?: boolean;
}

export const VoiceChatModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', text: 'Сәлем! Қаржылық операцияңызды даўыс пенен ямаса текст арқалы киргизиң.' }
  ]);
  const [input, setInput] = useState('');
  const [pendingTx, setPendingTx] = useState<ParsedTransaction | null>(null);

  const { addTransaction, addIncome, accounts, budgets, transactions } = useFinanceStore();
  const currentMonth = getCurrentMonth();
  const currentBudget = budgets.find(b => b.month === currentMonth);

  const processInput = (text: string) => {
    // Add user message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    
    // Parse
    let parsed = pendingTx ? { ...pendingTx } : parseFinancialText(text);

    // If we were waiting for an amount
    if (pendingTx && pendingTx.missingFields.includes('amount')) {
      const match = text.match(/\d+/);
      if (match) {
        parsed.amount = parseInt(match[0], 10);
        // remove amount from missing
        parsed.missingFields = parsed.missingFields.filter(f => f !== 'amount');
        parsed.isComplete = parsed.missingFields.length === 0;
      }
    }

    const newMsgs = [...messages, userMsg];

    if (!parsed.isComplete) {
      // Ask for missing info
      let askText = 'Түсинбедим.';
      if (parsed.missingFields.includes('amount')) askText = 'Қанша сум жумсадыңыз? (Сумманы айтыңыз)';
      else if (parsed.missingFields.includes('category')) askText = 'Бул шығынды қай категорияға киргизейик?';
      
      newMsgs.push({ id: Date.now().toString() + '1', role: 'assistant', text: askText });
      setPendingTx(parsed);
    } else {
      // Complete! Show confirmation or answer
      setPendingTx(null);
      let desc = '';
      
      if (parsed.type === 'query_balance') {
        const totalBal = accounts.reduce((sum, a) => sum + a.balance, 0);
        desc = `Ҳәзирги улыўма балансыңыз: ${formatCurrency(totalBal)}`;
      } else if (parsed.type === 'query_expense') {
        const spent = calculateSpentByCategory(transactions, parsed.categoryId!, currentMonth);
        desc = `Бул айда ${parsed.categoryName} ушын жумсаған пулыңыз: ${formatCurrency(spent)}`;
      } else if (parsed.type === 'expense') {
        desc = `Мен мынаны түсиндим:\n\nШығыс — ${formatCurrency(parsed.amount!)}\nКатегория — ${parsed.categoryName}\nСана — Бүгин\n\nСақлаймыз ба?`;
      } else if (parsed.type === 'income') {
        desc = `Мен мынаны түсиндим:\n\nКирис — ${formatCurrency(parsed.amount!)}\nСана — Бүгин\n\nСақлаймыз ба?`;
      } else if (parsed.type === 'fund_contribution') {
        desc = `Мен мынаны түсиндим:\n\nҚорға қосыў — ${formatCurrency(parsed.amount!)}\nСана — Бүгин\n\nСақлаймыз ба?`;
      } else if (parsed.type === 'debt_payment') {
        desc = `Мен мынаны түсиндим:\n\nҚарыз төлеми — ${formatCurrency(parsed.amount!)}\nСана — Бүгин\n\nСақлаймыз ба?`;
      } else {
        desc = `Мен мынаны түсиндим:\n\nТрансфер — ${formatCurrency(parsed.amount!)}\n\nСақлаймыз ба?`;
      }

      newMsgs.push({ id: Date.now().toString() + '1', role: 'assistant', text: desc, parsedData: parsed });
    }

    setMessages(newMsgs);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    processInput(input);
    setInput('');
  };

  const handleSave = (parsed: ParsedTransaction, force = false) => {
    if (parsed.type === 'expense' && parsed.amount && parsed.categoryId) {
      // Check overspending
      if (!force && currentBudget) {
        const spentSoFar = calculateSpentByCategory(transactions, parsed.categoryId, currentMonth);
        if (checkOverspending(currentBudget, parsed.categoryId, spentSoFar, parsed.amount)) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            text: '⚠️ БЮДЖЕТ ЛИМИТИНЕН АСЫП КЕТЕДИ. Бәрбир қосамыз ба?',
            parsedData: parsed,
            isWarning: true
          }]);
          return;
        }
      }

      addTransaction({
        familyId: accounts[0].familyId,
        userId: 'current-user',
        date: parsed.date || new Date().toISOString(),
        type: 'expense',
        amount: parsed.amount,
        accountId: accounts[0].id,
        categoryId: parsed.categoryId,
        comment: parsed.description,
        isOverBudget: force
      });
    } else if (parsed.type === 'income' && parsed.amount) {
      addIncome(parsed.amount, accounts[0].id);
    } else if (parsed.type === 'fund_contribution' && parsed.amount) {
      // Find first fund for simplicity in NLP demo
      const { funds, addFundContribution } = useFinanceStore.getState();
      if (funds.length > 0) addFundContribution(funds[0].id, parsed.amount, accounts[0].id, new Date().toISOString());
    } else if (parsed.type === 'debt_payment' && parsed.amount) {
      // Find first debt for simplicity in NLP demo
      const { debts, addDebtPayment } = useFinanceStore.getState();
      if (debts.length > 0) addDebtPayment(debts[0].id, parsed.amount, accounts[0].id, new Date().toISOString());
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      text: '✅ Сақланды!'
    }]);
    
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-gray-50 w-full sm:max-w-md h-[80vh] sm:h-[600px] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex justify-between items-center shadow-sm z-10">
          <div>
            <h2 className="font-bold text-gray-800">Voice Assistant</h2>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Online
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                <p className="whitespace-pre-line text-sm">{msg.text}</p>
                
                {msg.parsedData && msg.role === 'assistant' && !['query_balance', 'query_expense'].includes(msg.parsedData.type || '') && (
                  <div className="mt-3 flex gap-2">
                    {msg.isWarning ? (
                      <>
                        <button onClick={() => setMessages(prev => [...prev, {id: Date.now().toString(), role:'user', text:'Бекарлаў'}])} className="flex-1 bg-gray-100 py-2 rounded-xl text-sm font-medium text-gray-700">Бекарлаў</button>
                        <button onClick={() => handleSave(msg.parsedData!, true)} className="flex-1 bg-red-100 text-red-700 py-2 rounded-xl text-sm font-medium">Бәрбир қосыў</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setMessages(prev => [...prev, {id: Date.now().toString(), role:'user', text:'Бекарлаў'}])} className="flex-1 bg-gray-100 py-2 rounded-xl text-sm font-medium text-gray-700">Бекарлаў</button>
                        <button onClick={() => handleSave(msg.parsedData!)} className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-medium">Сақлаў</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="bg-white p-4 border-t">
          <form onSubmit={handleSend} className="flex gap-2">
            <button type="button" className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
              <Mic size={24} />
            </button>
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Даўыс пенен ямаса жазып киргизиң..."
              className="flex-1 bg-gray-100 rounded-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button type="submit" className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors">
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
