import { rules } from './rules'; // import tax rule constants (caps, rates) used in the calculations below
import type { HouseProperty, Regime } from './types'; // import the HouseProperty and Regime type definitions

export function housePropertyIncome(property: HouseProperty, regime: Regime): { income: number; carryForwardLoss: number; working: string } { // compute house property income, any carry-forward loss, and a human-readable working
  if (property.kind === 'none') return { income: 0, carryForwardLoss: 0, working: 'No house property income.' }; // no property held: zero income, zero loss
  if (property.kind === 'selfOccupied') { // handle the self-occupied property case
    const interest = regime === 'old' ? Math.min(property.interestPaid, rules.caps.selfOccupiedInterest) : 0; // old regime allows interest deduction up to the cap; new regime allows none
    return { income: -interest, carryForwardLoss: 0, working: `Self-occupied interest allowed: ₹${interest}.` }; // self-occupied income is the negative of allowed interest (a loss), no carry-forward
  } // end self-occupied branch
  const netAnnualValue = Math.max(0, property.rentReceived - property.municipalTaxes); // NAV = rent received minus municipal taxes, floored at zero
  const standardDeduction = netAnnualValue * rules.rates.housePropertyStandardDeduction; // standard deduction (typically 30%) applied to NAV
  const raw = netAnnualValue - standardDeduction - property.interestPaid; // raw income before applying the loss set-off cap
  const working = `NAV ₹${netAnnualValue} − 30% standard deduction ₹${standardDeduction} − interest ₹${property.interestPaid}.`; // shared human-readable working
  if (regime === 'new' && raw < 0) return { income: 0, carryForwardLoss: -raw, working: `${working} Section 115BAC bars setting this loss off against other income; it is carried forward.` }; // new regime: no inter-head set-off of a house-property loss
  const setOffIncome = raw < 0 ? Math.max(raw, -rules.caps.housePropertyLossSetOff) : raw; // if raw is a loss, cap how much can be set off this year; otherwise keep as-is
  return { income: setOffIncome, carryForwardLoss: Math.max(0, -raw - rules.caps.housePropertyLossSetOff), working }; // return final income, any loss beyond the cap carried forward, and the working explanation
} // end housePropertyIncome
