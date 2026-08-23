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
  'cat-1': ['azıq', 'túlik', 'nan', 'sút', 'magazin', 'bazar', 'tamaq', 'aўqat', 'prodwkt'],
  'cat-2': ['transport', 'benzin', 'mashina', 'avto', 'taksi', 'jolkire', 'metro', 'avtobws'],
  'cat-3': ['bala', 'balalar', 'mektep', 'baqsha', 'oyınshıq', 'pampers', 'sadik', 'kitap', 'oqıў', 'repetitor'],
  'cat-4': ['jinaq', 'qor', 'sberejeniya', 'depozit', 'kopilka'],
};

const parseAmount = (text: string): number | undefined => {
  let lower = text.toLowerCase()
    .replace(/\bsoń\b/g, 'swm')
    .replace(/\bsom\b/g, 'swm');

  const wordToNum: Record<string, number> = {
    'bir': 1, 'eki': 2, 'úsh': 3, 'tórt': 4, 'bes': 5, 
    'altı': 6, 'jeti': 7, 'segiz': 8, 'toǵız': 9,
    'on': 10, 'jiırma': 20, 'otız': 30, 'qırıq': 40, 'elw': 50,
    'alpıs': 60, 'jetpis': 70, 'seksen': 80, 'toqsan': 90,
    'júz': 100, 'mıń': 1000, 'million': 1000000,
    'bir': 1, 'eki': 2, 'wsh': 3, 'tort': 4, 'jeti': 7, 'segiz': 8, 'togız': 9,
    'jwz': 100, 'mın': 1000,
    'is': 3, 'is': 3, 'júziniń': 100, 'júzin': 100, 'mısalı': 1000
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
    .replace(/mıń/g, '000')
    .replace(/million/g, '000000')
    .replace(/ /g, '')
    .replace(/,/g, '.');

  const matches = processed.match(/\d+/);
  if (matches) {
    return parseInt(matches[0], 10);
  }
  return undefined;
};

const guessCategory = (text: string): { id: string; name: string; keyword: string } | undefined => {
  const lowerText = text.toLowerCase();
  for (const [id, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        const name = id === 'cat-1' ? 'Azıq-túlik' : 
                     id === 'cat-2' ? 'Transport' : 
                     id === 'cat-3' ? 'Balalar' : 'Jinaq';
        return { id, name, keyword: kw };
      }
    }
  }
  return undefined;
};

export const parseFinancialText = (text: string): ParsedTransaction => {
  text = text.toLowerCase();

  // Defaults
  let type: ParsedTransaction['type'] = 'expense';
  
  // Multi-language keyword dictionaries
  const incomeKeywords = ['kiris', 'aylıq', 'tústi', 'taptım', 'keldi', 'daromad', 'oylik', 'tushdi', 'doxod', 'zarplata', 'postwpilo', 'polwchil', 'income', 'salary', 'earned'];
  const transferKeywords = ['aўıstırdım', 'ótkerdim', 'perevod', 'o\'tkazdim', 'perevod', 'perevel', 'perevod', 'transfer', 'sent'];
  const fundContributeKeywords = ['qorǵa', 'jıynadım', 'kopilka', 'jamg\'arma', 'yig\'dim', 'kopilkw', 'nakopil', 'fund', 'saved', 'savings'];
  const fundWithdrawKeywords = ['qordan', 'aldım', 'jamg\'armadan', 'oldim', 'snyal s', 'withdrew from'];
  const debtPaymentKeywords = ['qarız', 'tóledim', 'qarz', 'to\'ladim', 'dolg', 'oplatil', 'pogasil', 'kredit', 'debt', 'paid loan', 'loan'];

  const queryBalanceKeywords = ['balans', 'qansha qaldı', 'qansha aqsha bar', 'qansha bar', 'qancha qoldi', 'balans', 'skolko ostalos', 'balans', 'balance'];
  const queryExpenseKeywords = ['qansha ketti', 'qansha jwmsadım', 'qansha jwmsaldı', 'qancha ketdi', 'qancha sarfladim', 'skolko potratil', 'skolko wshlo'];

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
  } else if (debtPaymentKeywords.filter(k => text.includes(k)).length >= 2 || text.includes('pogasil') || text.includes('loan')) {
    // Require 2 keywords for debt (e.g. "qarız" + "tóledim") to prevent false positives, or strong single words
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

  let finalDescription = text.length <= 15 ? text : '';
  if (catMatch?.keyword) {
    finalDescription = catMatch.keyword.charAt(0).toUpperCase() + catMatch.keyword.slice(1);
  }

  return {
    type,
    amount,
    categoryId,
    categoryName,
    description: finalDescription,
    date,
    isComplete: missingFields.length === 0,
    missingFields
  };
};
