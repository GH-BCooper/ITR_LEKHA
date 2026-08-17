import { computeTax, oldTaxAtDeductions } from './compute';
import { rules } from './rules';
import type { TaxInput } from './types';

export type BreakEvenResult =
  | { breakEvenExists: false; reason: 'new-regime-always-wins'; maxOldRegimeSaving: number }
  | { breakEvenExists: true; breakEvenDeductions: number; currentDeductions: number; gap: number; exceedsRealisticCeiling: boolean; realisticCeiling: number };

export function findBreakEven(input: TaxInput): BreakEvenResult {
  const old = computeTax(input, 'old'); const newer = computeTax(input, 'new');
  const currentDeductions = old.hraExemption + old.deductions.filter((line) => line.key !== 'hra').reduce((sum, line) => sum + line.allowed, 0);
  const realisticCeiling = rules.caps['80C'] + rules.caps['80CCD1B'] + old.deductions.filter((line) => ['80Dself', '80Dparents'].includes(line.key)).reduce((sum, line) => sum + line.entered, 0) + (input.houseProperty.kind === 'selfOccupied' ? Math.min(input.houseProperty.interestPaid, rules.caps.selfOccupiedInterest) : 0) + old.hraExemption;
  const maxDeductions = old.grossTotalIncome;
  const maxTax = oldTaxAtDeductions(input, maxDeductions);
  // SPEC-DISCREPANCY: Case C defines no solution when a zero-tax new regime still
  // wins within plausible deductions, although the literal gross-income range can
  // always force old taxable income to zero. Preserve the useful, required result.
  if (newer.totalTax === 0 && oldTaxAtDeductions(input, realisticCeiling) > newer.totalTax) {
    return { breakEvenExists: false, reason: 'new-regime-always-wins', maxOldRegimeSaving: Math.max(0, old.totalTax - oldTaxAtDeductions(input, realisticCeiling)) };
  }
  if (maxTax > newer.totalTax) return { breakEvenExists: false, reason: 'new-regime-always-wins', maxOldRegimeSaving: Math.max(0, old.totalTax - maxTax) };
  // Tax never rises as deductions rise, so binary search finds the first winning ₹100 band.
  let low = 0; let high = Math.ceil(maxDeductions / 100) * 100;
  while (low < high) {
    const middle = Math.floor((low + high) / 200) * 100;
    if (oldTaxAtDeductions(input, middle) <= newer.totalTax) high = middle; else low = middle + 100;
  }
  return { breakEvenExists: true, breakEvenDeductions: low, currentDeductions, gap: low - currentDeductions, exceedsRealisticCeiling: low > realisticCeiling, realisticCeiling };
}
