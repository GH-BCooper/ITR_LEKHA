import { rules } from './rules';
import { slabTax } from './slabs';
import type { Regime } from './types';

/** Tax before surcharge split into its slab part and its 111A/112A special-rate part. */
export type TaxParts = { slab: number; special: number };

function surchargeOn(parts: TaxParts, rate: number): number {
  // Surcharge on special-rate capital-gains tax is capped at 15%.
  return parts.slab * rate + parts.special * Math.min(rate, rules.rates.specialIncomeSurchargeCap);
}

/**
 * `specialTax` is the part of `taxBeforeSurcharge` from 111A/112A gains.
 * `taxAtThreshold` returns the tax parts for a total income exactly at a threshold; when omitted,
 * only slab tax is assumed (correct when there are no capital gains).
 */
export function surchargeWithRelief(taxBeforeSurcharge: number, totalIncome: number, regime: Regime, age: number, specialTax = 0, taxAtThreshold?: (income: number) => TaxParts): { surcharge: number; relief: number; rate: number } {
  const brackets = regime === 'new' ? rules.newRegime.surchargeRates : rules.oldRegime.surchargeRates;
  const bracket = [...brackets].reverse().find((entry) => totalIncome > entry.threshold);
  if (!bracket) return { surcharge: 0, relief: 0, rate: 0 };
  const special = Math.min(Math.max(0, specialTax), taxBeforeSurcharge);
  const surcharge = surchargeOn({ slab: taxBeforeSurcharge - special, special }, bracket.rate);
  // Marginal relief: tax + surcharge may not rise above the tax at the threshold (with the prior rate)
  // by more than the income that exceeds the threshold.
  const prior = [...brackets].reverse().find((entry) => entry.threshold < bracket.threshold);
  const atThreshold = taxAtThreshold ? taxAtThreshold(bracket.threshold) : { slab: slabTax(bracket.threshold, regime, age), special: 0 };
  const totalAtThreshold = atThreshold.slab + atThreshold.special + surchargeOn(atThreshold, prior?.rate ?? 0);
  const relief = Math.min(surcharge, Math.max(0, (taxBeforeSurcharge + surcharge - totalAtThreshold) - (totalIncome - bracket.threshold)));
  return { surcharge, relief, rate: bracket.rate };
}
