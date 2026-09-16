import { rules } from './rules';
import { slabTax } from './slabs';
import type { Regime } from './types';

/** `specialTax` is the part of `taxBeforeSurcharge` from 111A/112A gains, whose surcharge rate is capped at 15%. */
export function surchargeWithRelief(taxBeforeSurcharge: number, totalIncome: number, regime: Regime, age: number, specialTax = 0): { surcharge: number; relief: number; rate: number } {
  const brackets = regime === 'new' ? rules.newRegime.surchargeRates : rules.oldRegime.surchargeRates;
  const bracket = [...brackets].reverse().find((entry) => totalIncome > entry.threshold);
  if (!bracket) return { surcharge: 0, relief: 0, rate: 0 };
  const special = Math.min(Math.max(0, specialTax), taxBeforeSurcharge);
  const surcharge = (taxBeforeSurcharge - special) * bracket.rate + special * Math.min(bracket.rate, rules.rates.specialIncomeSurchargeCap);
  const withSurcharge = taxBeforeSurcharge + surcharge;
  // At the nearest threshold, compute tax with the prior rate, then cap the step-up to excess income.
  const lowerBrackets = brackets.filter((entry) => entry.threshold < bracket.threshold);
  const prior = [...lowerBrackets].reverse()[0];
  const taxAtThreshold = slabTax(bracket.threshold, regime, age) * (1 + (prior?.rate ?? 0));
  const relief = Math.min(surcharge, Math.max(0, (withSurcharge - taxAtThreshold) - (totalIncome - bracket.threshold)));
  return { surcharge, relief, rate: bracket.rate };
}
