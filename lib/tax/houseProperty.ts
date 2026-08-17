import { rules } from './rules';
import type { HouseProperty, Regime } from './types';

export function housePropertyIncome(property: HouseProperty, regime: Regime): { income: number; carryForwardLoss: number; working: string } {
  if (property.kind === 'none') return { income: 0, carryForwardLoss: 0, working: 'No house property income.' };
  if (property.kind === 'selfOccupied') {
    const interest = regime === 'old' ? Math.min(property.interestPaid, rules.caps.selfOccupiedInterest) : 0;
    return { income: -interest, carryForwardLoss: 0, working: `Self-occupied interest allowed: ₹${interest}.` };
  }
  const netAnnualValue = Math.max(0, property.rentReceived - property.municipalTaxes);
  const standardDeduction = netAnnualValue * rules.rates.housePropertyStandardDeduction;
  const raw = netAnnualValue - standardDeduction - property.interestPaid;
  const setOffIncome = raw < 0 ? Math.max(raw, -rules.caps.housePropertyLossSetOff) : raw;
  return { income: setOffIncome, carryForwardLoss: Math.max(0, -raw - rules.caps.housePropertyLossSetOff), working: `NAV ₹${netAnnualValue} − 30% standard deduction ₹${standardDeduction} − interest ₹${property.interestPaid}.` };
}
