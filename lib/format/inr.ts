export function inr(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '₹0';
  const safe = Object.is(value, -0) ? 0 : Math.round(value);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(safe);
}
