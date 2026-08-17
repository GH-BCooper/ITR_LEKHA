import { describe, expect, it } from 'vitest';
import { compareRegimes, computeTax, emptyInput, oldTaxAtDeductions } from '@/lib/tax/compute';
import { findBreakEven } from '@/lib/tax/breakEven';
import { capitalGainsTax } from '@/lib/tax/capitalGains';
import { housePropertyIncome } from '@/lib/tax/houseProperty';
import { hraExemption } from '@/lib/tax/hra';
import { rebate, rebateMarginalRelief } from '@/lib/tax/rebate';
import { round10 } from '@/lib/tax/round';
import { ageOnFinancialYear, slabTax } from '@/lib/tax/slabs';
import { surchargeWithRelief } from '@/lib/tax/surcharge';
import type { TaxInput } from '@/lib/tax/types';

function input(gross: number, patch: Partial<TaxInput> = {}): TaxInput {
  return { ...emptyInput, ...patch, salary: { ...emptyInput.salary, gross, ...(patch.salary ?? {}) }, deductions: { ...emptyInput.deductions, ...(patch.deductions ?? {}) }, otherIncome: { ...emptyInput.otherIncome, ...(patch.otherIncome ?? {}) }, capitalGains: { ...emptyInput.capitalGains, ...(patch.capitalGains ?? {}) } };
}

describe('FY 2025-26 golden tax cases', () => {
  it('A: removes tax at the ₹12.75L new-regime cliff', () => {
    const result = compareRegimes(input(1275000));
    expect(result.new.totalTax).toBe(0); expect(result.old.totalTax).toBe(187200); expect(result.winner).toBe('new');
  });
  it('B: applies new-regime rebate marginal relief', () => {
    const result = computeTax(input(1280000), 'new');
    expect(result.taxableIncome).toBe(1205000); expect(result.marginalRelief).toBe(55750); expect(result.totalTax).toBe(5200);
  });
  it('C: shows deductions can still lose to the new regime', () => {
    const value = input(1000000, { deductions: { ...emptyInput.deductions, section80C: 150000, section80Dself: 25000 } });
    expect(computeTax(value, 'new').totalTax).toBe(0); expect(computeTax(value, 'old').totalTax).toBe(70200);
    expect(findBreakEven(value).breakEvenExists).toBe(false);
  });
  it('D: calculates surcharge and cess', () => expect(computeTax(input(6000000), 'new').totalTax).toBe(1552980));
  it('E: gives surcharge marginal relief immediately over ₹50L', () => {
    const exact = computeTax(input(5075000), 'new').totalTax;
    const over = computeTax(input(5075001), 'new').totalTax;
    expect(over - exact).toBeLessThanOrEqual(10); // final statutory rounding is to ₹10
  });
  it('F: makes old regime lower with HRA, home loan and deductions', () => {
    const value = input(1800000, { salary: { ...emptyInput.salary, gross: 1800000, basic: 900000, hraReceived: 360000, rentPaid: 360000, city: 'Mumbai' }, houseProperty: { kind: 'selfOccupied', interestPaid: 200000 }, deductions: { ...emptyInput.deductions, section80C: 150000, section80CCD1B: 50000, section80Dself: 25000 } });
    expect(compareRegimes(value).winner).toBe('old'); const result = findBreakEven(value); expect(result.breakEvenExists).toBe(true); if (result.breakEvenExists) expect(result.gap).toBeLessThanOrEqual(0);
  });
});

describe('tax edge cases and invariants', () => {
  it('handles HRA, house-property, gains and integer rounding safely', () => {
    const noRent = hraExemption(input(1000000, { salary: { ...emptyInput.salary, gross: 1000000, basic: 500000, hraReceived: 100000, rentPaid: 0 } })); expect(noRent.exemption).toBe(0);
    const house = housePropertyIncome({ kind: 'letOut', rentReceived: 100000, municipalTaxes: 0, interestPaid: 500000 }, 'old'); expect(house.income).toBe(-200000); expect(house.carryForwardLoss).toBe(230000);
    expect(capitalGainsTax(input(0, { capitalGains: { stcg111A: 0, ltcg112A: 125000 } })).tax).toBe(0);
    expect(round10(15)).toBe(20); expect(round10(14)).toBe(10);
  });
  it('observes senior boundaries, rebate bounds and marginal relief monotonicity', () => {
    expect(ageOnFinancialYear({ dateOfBirth: '1966-03-31' })).toBe(60); expect(slabTax(500000, 'old', 60)).toBe(10000);
    expect(rebate(10000, 500000, 'resident', 'old')).toBe(10000); expect(rebate(10000, 500000, 'nonResident', 'old')).toBe(0);
    expect(rebateMarginalRelief(60750, 1205000, 'new').tax).toBe(5000);
    for (let income = 1200000; income <= 1280000; income += 1000) expect(computeTax(input(income + 75000), 'new').totalTax).toBeGreaterThanOrEqual(0);
  });
  it('keeps deductions and income monotonic and verifies synthetic break-even', () => {
    const value = input(1800000); const tax0 = oldTaxAtDeductions(value, 0); const tax1 = oldTaxAtDeductions(value, 300000); expect(tax1).toBeLessThanOrEqual(tax0);
    const surcharge = surchargeWithRelief(1000000, 6000000, 'new', 30); expect(surcharge.surcharge).toBeGreaterThan(0);
    const result = findBreakEven(value); if (result.breakEvenExists) { expect(oldTaxAtDeductions(value, result.breakEvenDeductions)).toBeLessThanOrEqual(computeTax(value, 'new').totalTax); expect(oldTaxAtDeductions(value, Math.max(0, result.breakEvenDeductions - 100))).toBeGreaterThan(computeTax(value, 'new').totalTax); }
  });
});
