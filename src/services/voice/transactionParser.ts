import { parseRelativeDate } from './dateUtils';

export interface ParsedTransaction {
  type?: 'expense' | 'income' | 'transfer' | 'fund_contribution' | 'fund_withdrawal' | 'debt_payment' | 'query_balance' | 'query_expense';
  amount?: number;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  date?: string;
  isComplete: boolean;
  missingFields: string[];
}

const CATEGORY_MAP: Record<string, string[]> = {
  'cat-1': ['азық', 'түлик', 'нан', 'сүт', 'магазин', 'базар', 'тамақ', 'аўқат'],
  'cat-2': ['бензин', 'машина', 'авто', 'такси', 'жолкире', 'метро', 'автобус'],
  'cat-3': ['мектеп', 'садик', 'бала', 'китап', 'оқыў', 'репетитор'],
  'cat-4': ['жинақ', 'депозит', 'копилка'],
};

const parseAmount = (text: string): number | undefined => {
  let lower = text.toLowerCase()
    .replace(/\bсоң\b/g, 'сум')
    .replace(/\bсом\b/g, 'сум');

  const wordToNum: Record<string, number> = {
    'бір': 1, 'екі': 2, 'үш': 3, 'төрт': 4, 'бес': 5, 
    'алты': 6, 'жеті': 7, 'сегіз': 8, 'тоғыз': 9,
    'он': 10, 'жиырма': 20, 'отыз': 30, 'қырық': 40, 'елу': 50,
    'алпыс': 60, 'жетпіс': 70, 'сексен': 80, 'тоқсан': 90,
    'жүз': 100, 'мың': 1000, 'миллион': 1000000,
    'бир': 1, 'еки': 2, 'уш': 3, 'торт': 4, 'жети': 7, 'сегиз': 8, 'тогыз': 9,
    'жуз': 100, 'мын': 1000
  };

  const words = lower.split(/[\s,.-]+/);
  let totalAmount = 0;
  let currentGroup = 0;
  let foundAny = false;

  for (const w of words) {
    if (wordToNum[w] !== undefined) {
      foundAny = true;
      const val = wordToNum[w];
      if (val === 100) {
        currentGroup = currentGroup === 0 ? 100 : currentGroup * 100;
      } else if (val === 1000 || val === 1000000) {
        currentGroup = currentGroup === 0 ? val : currentGroup * val;
        totalAmount += currentGroup;
        currentGroup = 0;
      } else {
        currentGroup += val;
      }
    } else {
      const parsed = parseInt(w, 10);
      if (!isNaN(parsed) && w === parsed.toString()) {
        foundAny = true;
        currentGroup += parsed;
      }
    }
  }
  
  totalAmount += currentGroup;
  
  if (foundAny && totalAmount > 0) return totalAmount;
  
  let processed = lower
    .replace(/мың/g, '000')
    .replace(/миллион/g, '000000')
    .replace(/ /g, '')
    .replace(/,/g, '.');

  const matches = processed.match(/\d+/);
  if (matches) {
    return parseInt(matches[0], 10);
  }
  return undefined;
};

const guessCategory = (text: string): { id: string; name: string } | undefined => {
  const lowerText = text.toLowerCase();
  for (const [id, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      // Find the name based on id
      const name = id === 'cat-1' ? 'Азық-түлик' : 
                   id === 'cat-2' ? 'Транспорт' : 
                   id === 'cat-3' ? 'Балалар' : 'Жинақ';
      return { id, name };
    }
  }
  return undefined;
};

export const parseFinancialText = (text: string): ParsedTransaction => {
  text = text.toLowerCase();

  // Defaults
  let type: ParsedTransaction['type'] = 'expense';
  
  // Multi-language keyword dictionaries
  const incomeKeywords = ['кирис', 'айлық', 'түсти', 'таптым', 'келди', 'daromad', 'oylik', 'tushdi', 'доход', 'зарплата', 'поступило', 'получил', 'income', 'salary', 'earned'];
  const transferKeywords = ['аўыстырдым', 'өткердим', 'перевод', 'o\'tkazdim', 'perevod', 'перевел', 'перевод', 'transfer', 'sent'];
  const fundContributeKeywords = ['қорға', 'жыйнадым', 'копилка', 'jamg\'arma', 'yig\'dim', 'копилку', 'накопил', 'fund', 'saved', 'savings'];
  const fundWithdrawKeywords = ['қордан', 'алдым', 'jamg\'armadan', 'oldim', 'снял с', 'withdrew from'];
  const debtPaymentKeywords = ['қарыз', 'төледим', 'qarz', 'to\'ladim', 'долг', 'оплатил', 'погасил', 'кредит', 'debt', 'paid loan', 'loan'];

  const queryBalanceKeywords = ['баланс', 'қанша қалды', 'қанша ақша бар', 'қанша бар', 'qancha qoldi', 'balans', 'сколько осталось', 'баланс', 'balance'];
  const queryExpenseKeywords = ['қанша кетти', 'қанша жумсадым', 'қанша жумсалды', 'qancha ketdi', 'qancha sarfladim', 'сколько потратил', 'сколько ушло'];

  if (queryBalanceKeywords.some(k => text.includes(k))) {
    type = 'query_balance';
  } else if (queryExpenseKeywords.some(k => text.includes(k))) {
    type = 'query_expense';
  } else if (incomeKeywords.some(k => text.includes(k))) {
    type = 'income';
  } else if (transferKeywords.some(k => text.includes(k))) {
    type = 'transfer';
  } else if (fundContributeKeywords.some(k => text.includes(k))) {
    type = 'fund_contribution';
  } else if (fundWithdrawKeywords.some(k => text.includes(k))) {
    type = 'fund_withdrawal';
  } else if (debtPaymentKeywords.filter(k => text.includes(k)).length >= 2 || text.includes('погасил') || text.includes('loan')) {
    // Require 2 keywords for debt (e.g. "қарыз" + "төледим") to prevent false positives, or strong single words
    type = 'debt_payment';
  }

  // 2. Extract Amount (Don't extract for queries)
  const amount = (type === 'query_balance' || type === 'query_expense') ? undefined : parseAmount(text);

  // 3. Extract Category (for expense)
  let categoryId: string | undefined;
  let categoryName: string | undefined;
  if (type === 'expense') {
    const cat = guessCategory(text);
    if (cat) {
      categoryId = cat.id;
      categoryName = cat.name;
    }
  }

  // 4. Determine Date
  const date = parseRelativeDate(text);

  // 5. Validation
  const missingFields: string[] = [];
  
  if (type === 'query_balance') {
    // nothing missing
  } else if (type === 'query_expense') {
    if (!categoryId) missingFields.push('category');
  } else {
    if (!amount) missingFields.push('amount');
    if (type === 'expense' && !categoryId) missingFields.push('category');
  }

  return {
    type,
    amount,
    categoryId,
    categoryName,
    description: text,
    date,
    isComplete: missingFields.length === 0,
    missingFields
  };
};
