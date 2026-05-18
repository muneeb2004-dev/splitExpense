export const formatCurrency = (amount) =>
  '₨ ' + new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount);
