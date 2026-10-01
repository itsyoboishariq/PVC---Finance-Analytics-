export function formatCurrency(val, decimals = 0) {
  if (val === null || val === undefined || isNaN(val)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatNumber(val, decimals = 0) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatPercent(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  // If val is already in 0..100 range vs 0..1
  const pct = val <= 1 && val >= 0 ? val * 100 : val;
  return `${pct.toFixed(decimals)}%`;
}
