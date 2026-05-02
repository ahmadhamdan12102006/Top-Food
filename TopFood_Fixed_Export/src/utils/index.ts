export const formatCurrency = (value: number | string): string => {
  const amount = Number(value || 0);

  return `₪ ${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount))}`;
};

export const formatNumber = (value: number | string): string => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount));
};