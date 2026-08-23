import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, X, Send, AlertTriangle, Camera } from 'lucide-react';
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
    {
      id: '1',
      role: 'assistant',
      text: 'Sálem! Qarjılıq operaciyańızdı dawıs penen yamasa tekst arqalı kirgiziń.'
    }
  ]);
  const [input, setInput] = useState('');
  const [pendingTx, setPendingTx] = useState<ParsedTransaction | null>(null);
  const [isListening, setIsListening] = useState(false);

  const handleListen = () => {
    if (isListening) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Sizdiń brawzerińiz dawıs tanwdı qoldamaydı. Google Chrome qoldanıńız.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'kk-KZ';
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      let transcript = e.results[0][0].transcript;
      transcript = transcript.replace(/\bsoń\b/gi, 'swm')
                             .replace(/\bsom\b/gi, 'swm')
                             .replace(/\bsońında\b/gi, 'swm')
                             .replace(/\bsońǵı\b/gi, 'swm');
      setInput(prev => (prev + ' ' + transcript).trim());
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        text: '📷 Chek jiberildi...'
      }]);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '2',
          role: 'assistant',
          text: 'Chek oqıldı! 📄\n\nSwmma: 45 000 swm\nKategoriya: Azıq-túlik\n\nSaqtaymız ba?',
          parsedData: { type: 'expense', amount: 45000, categoryName: 'Azıq-túlik', categoryId: 'cat-1', description: 'Chekten' }
        }]);
      }, 2000);
    }
  };

  const { addTransaction, addIncome, accounts, budgets, transactions } = useFinanceStore();
  const currentMonth = getCurrentMonth();
  const currentBudget = budgets.find(b => b.month === currentMonth);

  const processInput = (text: string) => {
    // Add user message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    
    let parsed = pendingTx ? { ...pendingTx } : parseFinancialText(text);

    const isCorrection = text.includes('emes');
    if (isCorrection && !pendingTx) {
      const lastAsstMsg = messages.slice().reverse().find(m => m.role === 'assistant' && m.parsedData);
      if (lastAsstMsg && lastAsstMsg.parsedData) {
        parsed = { ...lastAsstMsg.parsedData };
        // extract whatever is after "emes"
        const afterEmes = text.substring(text.indexOf('emes') + 4);
        const newParsed = parseFinancialText(afterEmes);
        if (newParsed.amount) parsed.amount = newParsed.amount;
        else {
          const match = afterEmes.match(/\d+/);
          if (match) parsed.amount = parseInt(match[0], 10);
        }
        if (newParsed.categoryId) {
          parsed.categoryId = newParsed.categoryId;
          parsed.categoryName = newParsed.categoryName;
        }
        parsed.missingFields = [];
        parsed.isComplete = true;
      }
    }

    if (pendingTx && !isCorrection) {
      const newParsed = parseFinancialText(text);
      
      if (pendingTx.missingFields.includes('amount')) {
        if (newParsed.amount) {
          parsed.amount = newParsed.amount;
        } else {
          const match = text.match(/\d+/);
          if (match) parsed.amount = parseInt(match[0], 10);
        }
      }
      
      if (pendingTx.missingFields.includes('category') && newParsed.categoryId) {
        parsed.categoryId = newParsed.categoryId;
        parsed.categoryName = newParsed.categoryName;
      }

      parsed.missingFields = [];
      if (!parsed.amount && parsed.type !== 'query_balance' && parsed.type !== 'query_expense') parsed.missingFields.push('amount');
      if (!parsed.categoryId && parsed.type === 'expense') parsed.missingFields.push('category');
      parsed.isComplete = parsed.missingFields.length === 0;
    }

    const newMsgs = [...messages, userMsg];

    if (!parsed.isComplete) {
      // Ask for missing info
      let askText = 'Túsinbedim.';
      if (parsed.missingFields.includes('amount')) askText = 'Qansha swm jwmsadıńız? (Swmmanı aytıńız)';
      else if (parsed.missingFields.includes('category')) askText = 'Bwl shıǵındı qay kategoriyaǵa kirgizeyik?';
      
      newMsgs.push({ id: Date.now().toString() + '1', role: 'assistant', text: askText });
      setPendingTx(parsed);
    } else {
      // Complete! Show confirmation or answer
      setPendingTx(null);
      let desc = '';
      
      if (parsed.type === 'query_balance') {
        const totalBal = accounts.reduce((sum, a) => sum + a.balance, 0);
        desc = `Ҳázirgi wlıўma balansıńız: ${formatCurrency(totalBal)}`;
      } else if (parsed.type === 'query_expense') {
        const spent = calculateSpentByCategory(transactions, parsed.categoryId!, currentMonth);
        desc = `Bwl ayda ${parsed.categoryName} wshın jwmsaǵan pwlıńız: ${formatCurrency(spent)}`;
      } else if (parsed.type === 'expense') {
        desc = `Men mınanı túsindim:\n\nShıǵıs — ${formatCurrency(parsed.amount!)}\nKategoriya — ${parsed.categoryName}\nSana — Búgin\n\nSaqlaymız ba?`;
      } else if (parsed.type === 'income') {
        desc = `Men mınanı túsindim:\n\nKiris — ${formatCurrency(parsed.amount!)}\nSana — Búgin\n\nSaqlaymız ba?`;
      } else if (parsed.type === 'fund_contribution') {
        desc = `Men mınanı túsindim:\n\nQorǵa qosıў — ${formatCurrency(parsed.amount!)}\nSana — Búgin\n\nSaqlaymız ba?`;
      } else if (parsed.type === 'debt_payment') {
        desc = `Men mınanı túsindim:\n\nQarız tólemi — ${formatCurrency(parsed.amount!)}\nSana — Búgin\n\nSaqlaymız ba?`;
      } else {
        desc = `Men mınanı túsindim:\n\nTransfer — ${formatCurrency(parsed.amount!)}\n\nSaqlaymız ba?`;
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
            text: '⚠️ BYuDJET LIMITINEN ASIP KETEDI. Bárbir qosamız ba?',
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
      text: '✅ Saqlandı!'
    }]);
    
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-gray-50 dark:bg-gray-700 dark:text-white w-full sm:max-w-md h-[80vh] sm:h-[600px] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 px-4 py-4 flex justify-between items-center shadow-sm z-10">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white">Voice Assistant</h2>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Online
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-none border dark:border-gray-700 border-gray-100 dark:border-gray-700'}`}>
                <p className="whitespace-pre-line text-sm">{msg.text}</p>
                
                {msg.parsedData && msg.role === 'assistant' && !['query_balance', 'query_expense'].includes(msg.parsedData.type || '') && (
                  <div className="mt-3 flex gap-2">
                    {msg.isWarning ? (
                      <>
                        <button onClick={() => setMessages(prev => [...prev, {id: Date.now().toString(), role:'user', text:'Bekarlaў'}])} className="flex-1 bg-gray-100 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300">Bekarlaў</button>
                        <button onClick={() => handleSave(msg.parsedData!, true)} className="flex-1 bg-red-100 text-red-700 py-2 rounded-xl text-sm font-medium">Bárbir qosıў</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setMessages(prev => [...prev, {id: Date.now().toString(), role:'user', text:'Bekarlaў'}])} className="flex-1 bg-gray-100 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300">Bekarlaў</button>
                        <button onClick={() => handleSave(msg.parsedData!)} className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-medium">Saqlaў</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 p-4 border-t">
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            <button type="button" onClick={handleListen} className={`p-3 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
              <Mic size={24} />
            </button>
            <label className="p-3 bg-gray-50 dark:bg-gray-700 dark:text-white text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 transition-colors cursor-pointer">
              <Camera size={24} />
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
            </label>
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Jazıp nemese dawıspen..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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




