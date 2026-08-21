import { Debt, Fund } from '../types';

export interface DecisionOption {
  title: string;
  description: string;
  fundAllocation: number;
  debtAllocation: number;
  reason: string;
}

export const generateSmartRecommendations = (
  surplusCash: number,
  debts: Debt[],
  funds: Fund[]
): DecisionOption[] => {
  if (surplusCash <= 0) return [];

  const highInterestDebts = debts.filter(d => d.interestRate >= 15 && d.remainingAmount > 0);
  const totalDebtBalance = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
  
  // Find emergency fund (assuming one with word "Қауипсизлик" or priority 1)
  const emergencyFund = funds.find(f => f.priority === 1 || f.name.toLowerCase().includes('қауипсизлик'));
  const hasEmergency = emergencyFund ? emergencyFund.currentAmount >= emergencyFund.targetAmount * 0.5 : false;

  const options: DecisionOption[] = [];

  if (highInterestDebts.length > 0) {
    if (!hasEmergency && emergencyFund) {
      // Scenario: High debt but no emergency fund
      options.push({
        title: 'Option A: Теңгеримли (Balanced)',
        description: `${surplusCash * 0.5} қорға, ${surplusCash * 0.5} қарызға.`,
        fundAllocation: surplusCash * 0.5,
        debtAllocation: surplusCash * 0.5,
        reason: 'Сизде жоқары пайызлы қарыз бар, бирақ қаўипсизлик қорыңыз толмаған. Бул вариант кризистен қорғап, қарызды да азайтады.'
      });
      options.push({
        title: 'Option B: Қарызды агрессив жабыў',
        description: `${surplusCash * 0.2} қорға, ${surplusCash * 0.8} қарызға.`,
        fundAllocation: surplusCash * 0.2,
        debtAllocation: surplusCash * 0.8,
        reason: 'Минимал резерв сақлап, бос ақшаның көбин жоқары пайызлы қарызға бағытлаў ең көп пайыз үнемлейди.'
      });
    } else {
      // Scenario: High debt, HAS emergency fund
      options.push({
        title: 'Option A: Қарыздан тез қутылыў (Ұсынылады)',
        description: `${surplusCash * 0.1} қорға, ${surplusCash * 0.9} қарызға.`,
        fundAllocation: surplusCash * 0.1,
        debtAllocation: surplusCash * 0.9,
        reason: 'Қаўипсизлик қорыңыз жетерли дәрежеде. Бос ақшаны қарызға салыў банкке кететуғын миллионлаған сумды үнемлейди.'
      });
      options.push({
        title: 'Option B: Теңгеримли (Balanced)',
        description: `${surplusCash * 0.5} қорға, ${surplusCash * 0.5} қарызға.`,
        fundAllocation: surplusCash * 0.5,
        debtAllocation: surplusCash * 0.5,
        reason: 'Қарызды жабыў менен бирге басқа да мақсетлерге жетиўди қәлесеңиз.'
      });
    }
  } else if (totalDebtBalance > 0) {
    // Scenario: Low interest debt only
    options.push({
      title: 'Option A: Теңгеримли инвестиция',
      description: `${surplusCash * 0.7} қорға, ${surplusCash * 0.3} қарызға.`,
      fundAllocation: surplusCash * 0.7,
      debtAllocation: surplusCash * 0.3,
      reason: 'Қарызыңыздың пайызы төмен болғанлықтан, ақшаны көбирек мақсетли қорларға (инвестицияға) салыў тийимли.'
    });
    options.push({
      title: 'Option B: Debt Free (Психологиялық)',
      description: `${surplusCash * 0.2} қорға, ${surplusCash * 0.8} қарызға.`,
      fundAllocation: surplusCash * 0.2,
      debtAllocation: surplusCash * 0.8,
      reason: 'Пайыз төмен болса да, қарыздан тез қутылып, психологиялық еркинликке шығыў ушын.'
    });
  } else {
    // Scenario: No debt
    options.push({
      title: 'Option A: Толық инвестиция / Мақсетлер',
      description: `Толық ${surplusCash} қорларға.`,
      fundAllocation: surplusCash,
      debtAllocation: 0,
      reason: 'Сизде қарыз жоқ! Бос ақшаңыздың бәрин болашақ мақсетлерге ҳәм инвестицияға бағытлаң.'
    });
  }

  return options;
};
