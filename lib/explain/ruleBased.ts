import type { Comparison } from '@/lib/tax/types';

export function explainComparison(comparison: Comparison): string {
  if (comparison.winner === 'tie') return 'Both regimes compute the same. The new regime is the default and needs no paperwork.';
  const winner = comparison.winner === 'new' ? 'new regime' : 'old regime';
  return `Based on these figures, the ${winner} computes lower by ₹${comparison.difference.toLocaleString('en-IN')}. The ledger below shows each amount used in that calculation.`;
}
