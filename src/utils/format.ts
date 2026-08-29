import i18n from '../i18n';
export const formatCurrency = (amount: number): string => {
  const currency = i18n.language === 'ru' ? 'сум' : 'swm';
  return new Intl.NumberFormat('uz-UZ').format(amount).replace(/,/g, ' ') + ' ' + currency;
};

export const getCurrentMonth = (): string => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const getPreviousMonth = (month: string): string => {
  const [year, m] = month.split('-');
  const date = new Date(parseInt(year), parseInt(m) - 1 - 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const getNextMonth = (month: string): string => {
  const [year, m] = month.split('-');
  const date = new Date(parseInt(year), parseInt(m) - 1 + 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const formatMonthName = (month: string): string => {
  const [year, m] = month.split('-');
  const date = new Date(parseInt(year), parseInt(m) - 1, 1);
  const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgwst', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
  return `${months[date.getMonth()]} ${year}`;
};
