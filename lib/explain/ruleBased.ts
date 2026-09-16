import type { BreakEvenResult } from '@/lib/tax/breakEven';
import type { Comparison, TaxInput } from '@/lib/tax/types';

const rupees = (value: number) => `₹${Math.round(Math.abs(value)).toLocaleString('en-IN')}`;

/** One-sentence verdict used in summaries. */
export function explainComparison(comparison: Comparison): string {
  if (comparison.winner === 'tie') return 'Both regimes compute the same tax. The new regime is the default and needs no deduction paperwork.';
  const winner = comparison.winner === 'new' ? 'new regime' : 'old regime';
  return `Based on these figures, the ${winner} saves you ${rupees(comparison.difference)}.`;
}

/**
 * Deterministic plain-English explanation. Every figure comes from the computed result,
 * and this text is also the fact sheet the optional LLM layer may rephrase.
 */
export function explainInDetail(input: TaxInput, comparison: Comparison, breakEven: BreakEvenResult): string[] {
  const { old, new: newer } = comparison;
  const lines: string[] = [explainComparison(comparison)];
  if (input.salary.gross === 0 && newer.grossTotalIncome === 0 && old.totalTax === 0 && newer.totalTax === 0) return ['Enter your salary and other income to see which regime costs less.'];
  lines.push(`Old regime: taxable income ${rupees(old.taxableIncome)}, total tax ${rupees(old.totalTax)}. New regime: taxable income ${rupees(newer.taxableIncome)}, total tax ${rupees(newer.totalTax)}.`);
  const oldReductions = old.grossTotalIncome - old.taxableIncome + old.hraExemption;
  if (oldReductions > 0) lines.push(`The old regime lets you subtract ${rupees(oldReductions)} in HRA exemption and deductions that the new regime ignores, but its slab rates are steeper.`);
  if (newer.rebate > 0 && newer.totalTax === 0) lines.push(`In the new regime, the section 87A rebate of ${rupees(newer.rebate)} wipes out the slab tax because total income is within ₹12,00,000.`);
  if (newer.marginalRelief > 0) lines.push(`You are just above the ₹12,00,000 rebate limit, so marginal relief of ${rupees(newer.marginalRelief)} keeps new-regime tax from exceeding the income above that limit.`);
  if (old.specialTax > 0 || newer.specialTax > 0) lines.push(`Listed-equity capital gains are taxed at special rates in both regimes: ${rupees(newer.specialTax)} in the new regime.`);
  if (breakEven.breakEvenExists) {
    lines.push(breakEven.gap > 0
      ? `The old regime would only win if your deductions and exemptions reached ${rupees(breakEven.breakEvenDeductions)}; you currently have ${rupees(breakEven.currentDeductions)}, which is ${rupees(breakEven.gap)} short.`
      : `Your deductions (${rupees(breakEven.currentDeductions)}) are past the break-even point of ${rupees(breakEven.breakEvenDeductions)}, which is why the old regime is competitive.`);
  } else if (comparison.winner !== 'old') {
    lines.push('Even with 80C and NPS maxed out, the old regime would not catch up at this income.');
  }
  const winnerResult = comparison.winner === 'old' ? old : newer;
  if (winnerResult.tdsPaid > 0) lines.push(winnerResult.balanceOrRefund >= 0 ? `After ${rupees(winnerResult.tdsPaid)} TDS already deducted, ${rupees(winnerResult.balanceOrRefund)} remains payable under the cheaper regime.` : `After ${rupees(winnerResult.tdsPaid)} TDS already deducted, you should get a refund of ${rupees(winnerResult.balanceOrRefund)} under the cheaper regime.`);
  if (old.housePropertyCarryForwardLoss > 0 || newer.housePropertyCarryForwardLoss > 0) lines.push('Part of your house-property loss cannot be set off this year and is carried forward.');
  return lines;
}
