import { rules } from './rules';
import type { TaxInput } from './types';

/**
 * Special-rate gains on listed equity. A resident whose slab income is below the
 * zero-rate band may use the unused part of that band against STCG first, then LTCG
 * (proviso to sections 111A and 112A). Non-residents pass zero.
 */
export function capitalGainsTax(input: TaxInput, unusedBasicExemption = 0): { tax: number; totalIncome: number; ltcgTaxable: number; working: string } {
  const stcgEntered = Math.max(0, input.capitalGains.stcg111A);
  const ltcgEntered = Math.max(0, input.capitalGains.ltcg112A);
  const stcgShield = Math.min(stcgEntered, Math.max(0, unusedBasicExemption));
  const stcg = stcgEntered - stcgShield;
  const ltcgAfterExemption = Math.max(0, ltcgEntered - rules.rates.ltcg112AExemption);
  const ltcgShield = Math.min(ltcgAfterExemption, Math.max(0, unusedBasicExemption) - stcgShield);
  const ltcgTaxable = ltcgAfterExemption - ltcgShield;
  const shieldNote = stcgShield + ltcgShield > 0 ? ` Unused basic exemption of ₹${stcgShield + ltcgShield} absorbed.` : '';
  return { tax: stcg * rules.rates.stcg111A + ltcgTaxable * rules.rates.ltcg112A, totalIncome: stcgEntered + ltcgEntered, ltcgTaxable, working: `STCG taxable ₹${stcg} at ${rules.rates.stcg111A * 100}%; LTCG taxable after ₹${rules.rates.ltcg112AExemption} exemption: ₹${ltcgTaxable} at ${rules.rates.ltcg112A * 100}%.${shieldNote}` };
}
