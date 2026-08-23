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
  
  // Find emergency fund (assuming one with word "Qawipsizlik" or priority 1)
  const emergencyFund = funds.find(f => f.priority === 1 || f.name.toLowerCase().includes('qawipsizlik'));
  const hasEmergency = emergencyFund ? emergencyFund.currentAmount >= emergencyFund.targetAmount * 0.5 : false;

  const options: DecisionOption[] = [];

  if (highInterestDebts.length > 0) {
    if (!hasEmergency && emergencyFund) {
      // Scenario: High debt but no emergency fund
      options.push({
        title: 'Option A: Teńgerimli (Balanced)',
        description: `${surplusCash * 0.5} qorǵa, ${surplusCash * 0.5} qarızǵa.`,
        fundAllocation: surplusCash * 0.5,
        debtAllocation: surplusCash * 0.5,
        reason: 'Sizde joqarı payızlı qarız bar, biraq qaўipsizlik qorıńız tolmaǵan. Bwl variant krizisten qorǵap, qarızdı da azaytadı.'
      });
      options.push({
        title: 'Option B: Qarızdı agressiv jabıў',
        description: `${surplusCash * 0.2} qorǵa, ${surplusCash * 0.8} qarızǵa.`,
        fundAllocation: surplusCash * 0.2,
        debtAllocation: surplusCash * 0.8,
        reason: 'Minimal rezerv saqlap, bos aqshanıń kóbin joqarı payızlı qarızǵa baǵıtlaў eń kóp payız únemleydi.'
      });
    } else {
      // Scenario: High debt, HAS emergency fund
      options.push({
        title: 'Option A: Qarızdan tez qwtılıў (Usınıladı)',
        description: `${surplusCash * 0.1} qorǵa, ${surplusCash * 0.9} qarızǵa.`,
        fundAllocation: surplusCash * 0.1,
        debtAllocation: surplusCash * 0.9,
        reason: 'Qaўipsizlik qorıńız jeterli dárejede. Bos aqshanı qarızǵa salıў bankke ketetwǵın millionlaǵan swmdı únemleydi.'
      });
      options.push({
        title: 'Option B: Teńgerimli (Balanced)',
        description: `${surplusCash * 0.5} qorǵa, ${surplusCash * 0.5} qarızǵa.`,
        fundAllocation: surplusCash * 0.5,
        debtAllocation: surplusCash * 0.5,
        reason: 'Qarızdı jabıў menen birge basqa da maqsetlerge jetiўdi qáleseńiz.'
      });
    }
  } else if (totalDebtBalance > 0) {
    // Scenario: Low interest debt only
    options.push({
      title: 'Option A: Teńgerimli investiciya',
      description: `${surplusCash * 0.7} qorǵa, ${surplusCash * 0.3} qarızǵa.`,
      fundAllocation: surplusCash * 0.7,
      debtAllocation: surplusCash * 0.3,
      reason: 'Qarızıńızdıń payızı tómen bolǵanlıqtan, aqshanı kóbirek maqsetli qorlarǵa (investiciyaǵa) salıў tiyimli.'
    });
    options.push({
      title: 'Option B: Debt Free (Psixologiyalıq)',
      description: `${surplusCash * 0.2} qorǵa, ${surplusCash * 0.8} qarızǵa.`,
      fundAllocation: surplusCash * 0.2,
      debtAllocation: surplusCash * 0.8,
      reason: 'Payız tómen bolsa da, qarızdan tez qwtılıp, psixologiyalıq erkinlikke shıǵıў wshın.'
    });
  } else {
    // Scenario: No debt
    options.push({
      title: 'Option A: Tolıq investiciya / Maqsetler',
      description: `Tolıq ${surplusCash} qorlarǵa.`,
      fundAllocation: surplusCash,
      debtAllocation: 0,
      reason: 'Sizde qarız joq! Bos aqshańızdıń bárin bolashaq maqsetlerge ҳám investiciyaǵa baǵıtlań.'
    });
  }

  return options;
};
