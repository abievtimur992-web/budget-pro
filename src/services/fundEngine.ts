import { Fund } from '../types';

export const calculateFundProgress = (fund: Fund) => {
  if (fund.targetAmount <= 0) return 100;
  return Math.min(100, Math.round((fund.currentAmount / fund.targetAmount) * 100));
};

export const calculateMonthsToFundTarget = (fund: Fund): number | null => {
  if (fund.currentAmount >= fund.targetAmount) return 0;
  if (fund.monthlyContribution <= 0) return null;
  
  const remaining = fund.targetAmount - fund.currentAmount;
  return Math.ceil(remaining / fund.monthlyContribution);
};

export const getFundTargetDate = (fund: Fund): string => {
  const months = calculateMonthsToFundTarget(fund);
  if (months === null) return 'Төлем белгиленбеген';
  if (months === 0) return 'Аяқланған';
  
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
};
