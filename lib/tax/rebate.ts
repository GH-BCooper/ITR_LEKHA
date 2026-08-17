import { rules } from './rules';
import type { Regime, Residency } from './types';

export function rebate(slabTax: number, taxableIncome: number, residency: Residency, regime: Regime): number {
  const threshold = regime === 'new' ? rules.newRegime.rebateThreshold : rules.oldRegime.rebateThreshold;
  const cap = regime === 'new' ? rules.newRegime.rebateCap : rules.oldRegime.rebateCap;
  return residency === 'resident' && taxableIncome <= threshold ? Math.min(cap, slabTax) : 0;
}

export function rebateMarginalRelief(slabTaxAfterRebate: number, taxableIncome: number, regime: Regime): { tax: number; relief: number; crossover: number } {
  if (regime !== 'new' || taxableIncome <= rules.newRegime.rebateThreshold) return { tax: slabTaxAfterRebate, relief: 0, crossover: rules.newRegime.rebateThreshold };
  const excess = taxableIncome - rules.newRegime.rebateThreshold;
  const cappedTax = Math.min(slabTaxAfterRebate, excess);
  // Derived at runtime from the same tax function by callers; this analytic crossover is only informational.
  const relief = slabTaxAfterRebate - cappedTax;
  return { tax: cappedTax, relief, crossover: rules.newRegime.rebateThreshold + rules.newRegime.rebateCap / rules.newRegime.slabs[3].rate };
}
