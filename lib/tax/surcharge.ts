import { rules } from './rules';
import { slabTax } from './slabs';
import type { Regime } from './types';

export function surchargeWithRelief(taxBeforeSurcharge: number, totalIncome: number, regime: Regime, age: number): { surcharge: number; relief: number; rate: number } {
  const brackets = regime === 'new' ? rules.newRegime.surchargeRates : rules.oldRegime.surchargeRates;
  const bracket = [...brackets].reverse().find((entry) => totalIncome > entry.threshold);
  if (!bracket) return { surcharge: 0, relief: 0, rate: 0 };
  const withSurcharge = taxBeforeSurcharge * (1 + bracket.rate);
  // At the nearest threshold, compute tax with the prior rate, then cap the step-up to excess income.
  const lowerBrackets = brackets.filter((entry) => entry.threshold < bracket.threshold);
  const prior = [...lowerBrackets].reverse()[0];
  const taxAtThreshold = slabTax(bracket.threshold, regime, age) * (1 + (prior?.rate ?? 0));
  const relief = Math.max(0, (withSurcharge - taxAtThreshold) - (totalIncome - bracket.threshold));
  return { surcharge: taxBeforeSurcharge * bracket.rate, relief, rate: bracket.rate };
}
