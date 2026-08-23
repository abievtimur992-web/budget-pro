import { Debt, DebtStrategy } from '../types';

export interface MonthlyAmortization {
  month: number;
  beginningBalance: number;
  interest: number;
  principal: number;
  endingBalance: number;
  isNegativeAmortization: boolean;
}

export interface PayoffResult {
  debtId: string;
  schedule: MonthlyAmortization[];
  monthsToPayoff: number | null; // null if infinite
  totalInterest: number;
}

export interface StrategyResult {
  strategy: DebtStrategy;
  overallMonthsToPayoff: number | null;
  totalInterestPaid: number;
  debtResults: PayoffResult[];
}

/**
 * Calculates the exact amortization schedule for a single debt, given a fixed monthly payment.
 */
export const calculateAmortization = (debt: Debt, monthlyPayment: number): PayoffResult => {
  let balance = debt.remainingAmount;
  const monthlyRate = debt.interestRate / 100 / 12;
  const schedule: MonthlyAmortization[] = [];
  let totalInterest = 0;
  let month = 0;

  // Edge Case: 0 interest
  if (monthlyRate === 0) {
    if (monthlyPayment <= 0) return { debtId: debt.id, schedule: [], monthsToPayoff: null, totalInterest: 0 };
    
    while (balance > 0 && month < 1200) { // cap at 100 years
      month++;
      let principal = Math.min(monthlyPayment, balance);
      schedule.push({
        month,
        beginningBalance: balance,
        interest: 0,
        principal,
        endingBalance: balance - principal,
        isNegativeAmortization: false
      });
      balance -= principal;
    }
    return { debtId: debt.id, schedule, monthsToPayoff: month, totalInterest: 0 };
  }

  // Normal amortization loop
  while (balance > 0.01 && month < 1200) {
    month++;
    const interest = balance * monthlyRate;
    
    // Edge Case: Payment <= Interest (Negative Amortization)
    if (monthlyPayment <= interest) {
      schedule.push({
        month,
        beginningBalance: balance,
        interest,
        principal: 0,
        endingBalance: balance + interest - monthlyPayment,
        isNegativeAmortization: true
      });
      return { debtId: debt.id, schedule, monthsToPayoff: null, totalInterest: Infinity };
    }

    let principal = monthlyPayment - interest;
    if (principal > balance) {
      principal = balance;
    }

    schedule.push({
      month,
      beginningBalance: balance,
      interest,
      principal,
      endingBalance: balance - principal,
      isNegativeAmortization: false
    });

    totalInterest += interest;
    balance -= principal;
  }

  return { debtId: debt.id, schedule, monthsToPayoff: month, totalInterest };
};

/**
 * Simulates a payoff strategy across all debts given an extra monthly payment bucket.
 */
export const simulateStrategy = (
  debts: Debt[],
  strategy: DebtStrategy,
  extraMonthlyPayment: number
): StrategyResult => {
  
  // Clone debts so we can mutate safely
  const activeDebts = debts.map(d => ({ ...d }));
  
  // Sort debts based on strategy priority
  let orderedDebts = [...activeDebts];
  if (strategy === 'avalanche') {
    orderedDebts.sort((a, b) => b.interestRate - a.interestRate);
  } else if (strategy === 'snowball') {
    orderedDebts.sort((a, b) => a.remainingAmount - b.remainingAmount);
  } else if (strategy === 'hybrid') {
    // Hybrid logic: high interest rate heavily weighted, but also penalize large remaining balances.
    // E.g., Score = (InterestRate * 100) / (RemainingAmount ^ 0.5)
    // The higher the score, the higher the priority.
    orderedDebts.sort((a, b) => {
      const scoreA = (a.interestRate * 100) / (Math.sqrt(a.remainingAmount) || 1);
      const scoreB = (b.interestRate * 100) / (Math.sqrt(b.remainingAmount) || 1);
      return scoreB - scoreA;
    });
  }

  let totalInterestPaid = 0;
  let overallMonths = 0;
  let hasInfinite = false;

  const debtResults: PayoffResult[] = activeDebts.map(d => ({
    debtId: d.id,
    schedule: [],
    monthsToPayoff: 0,
    totalInterest: 0
  }));

  // We simulate month by month globally across all debts
  let globalMonth = 0;
  let allPaid = false;

  while (!allPaid && globalMonth < 1200) {
    globalMonth++;
    let availableExtra = extraMonthlyPayment;
    let anyUnpaid = false;
    let anyNegative = false;

    // 1. Pay minimums to all unpaid debts first
    for (const debt of orderedDebts) {
      if (debt.remainingAmount > 0.01) {
        anyUnpaid = true;
        const interest = debt.remainingAmount * (debt.interestRate / 100 / 12);
        
        let payment = debt.minimumPayment;
        if (payment <= interest) {
          anyNegative = true;
          // Even with negative amort, we register it
        }
        
        // If minimum payment is more than enough to cover balance + interest
        if (payment > debt.remainingAmount + interest) {
          availableExtra += (payment - (debt.remainingAmount + interest));
          payment = debt.remainingAmount + interest;
        }

        const principal = payment - interest;
        
        // Log schedule
        const result = debtResults.find(r => r.debtId === debt.id)!;
        result.schedule.push({
          month: globalMonth,
          beginningBalance: debt.remainingAmount,
          interest,
          principal,
          endingBalance: debt.remainingAmount - principal,
          isNegativeAmortization: payment <= interest
        });
        
        debt.remainingAmount -= principal;
        result.totalInterest += interest;
        totalInterestPaid += interest;
      }
    }

    if (!anyUnpaid) {
      allPaid = true;
      overallMonths = globalMonth - 1;
      break;
    }

    if (anyNegative && availableExtra === 0) {
      hasInfinite = true;
      break; // Trapped in infinite debt
    }

    // 2. Apply available extra cash (rollover min payments + user extra payment) to highest priority debt
    if (availableExtra > 0.01) {
      for (const debt of orderedDebts) {
        if (debt.remainingAmount > 0.01) {
          const result = debtResults.find(r => r.debtId === debt.id)!;
          const lastEntry = result.schedule[result.schedule.length - 1];
          
          let extraApplied = availableExtra;
          if (extraApplied > debt.remainingAmount) {
            extraApplied = debt.remainingAmount;
          }
          
          // Apply extra to principal
          lastEntry.principal += extraApplied;
          lastEntry.endingBalance -= extraApplied;
          lastEntry.isNegativeAmortization = false; // With extra payment, it might not be negative anymore
          
          debt.remainingAmount -= extraApplied;
          availableExtra -= extraApplied;
          
          if (availableExtra < 0.01) break;
        }
      }
    }
  }

  // Finalize monthsToPayoff for each
  for (const result of debtResults) {
    if (hasInfinite && result.schedule[result.schedule.length - 1]?.isNegativeAmortization) {
      result.monthsToPayoff = null;
    } else {
      result.monthsToPayoff = result.schedule.length;
    }
  }

  return {
    strategy,
    overallMonthsToPayoff: hasInfinite ? null : overallMonths,
    totalInterestPaid,
    debtResults
  };
};

/**
 * Convenience method to get all 3 strategies compared side-by-side.
 */
export const compareStrategies = (debts: Debt[], extraMonthlyPayment: number) => {
  return {
    avalanche: simulateStrategy(debts, 'avalanche', extraMonthlyPayment),
    snowball: simulateStrategy(debts, 'snowball', extraMonthlyPayment),
    hybrid: simulateStrategy(debts, 'hybrid', extraMonthlyPayment)
  };
};

export const calculateDebtFreeDate = (months: number | null): string => {
  if (months === null) return 'Eshqashan (Tólem az)';
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  const monthsArr = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgwst', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
  return `${monthsArr[d.getMonth()]} ${d.getFullYear()}`;
};
