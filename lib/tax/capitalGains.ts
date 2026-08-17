import { rules } from './rules';
import type { TaxInput } from './types';

export function capitalGainsTax(input: TaxInput): { tax: number; totalIncome: number; ltcgTaxable: number; working: string } {
  const stcg = Math.max(0, input.capitalGains.stcg111A);
  const ltcgTaxable = Math.max(0, input.capitalGains.ltcg112A - rules.rates.ltcg112AExemption);
  return { tax: stcg * rules.rates.stcg111A + ltcgTaxable * rules.rates.ltcg112A, totalIncome: stcg + input.capitalGains.ltcg112A, ltcgTaxable, working: `STCG ₹${stcg}; LTCG taxable after ₹${rules.rates.ltcg112AExemption} exemption: ₹${ltcgTaxable}.` };
}
