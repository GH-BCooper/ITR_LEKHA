import { describe, expect, it } from 'vitest';
import { compareRegimes, computeTax, currentOldDeductions, emptyInput, oldTaxAtDeductions } from '@/lib/tax/compute';
import { housePropertyIncome } from '@/lib/tax/houseProperty';
import { normalizeInput } from '@/lib/tax/normalize';
import { personas } from '@/lib/personas';
import { surchargeWithRelief } from '@/lib/tax/surcharge';
import { explainInDetail } from '@/lib/explain/ruleBased';
import { onlyUsesKnownNumbers, narrate } from '@/lib/explain/llm';
import { findBreakEven } from '@/lib/tax/breakEven';
import type { TaxInput } from '@/lib/tax/types';

const withSalary = (gross: number, patch: Partial<TaxInput> = {}): TaxInput => ({ ...emptyInput, ...patch, salary: { ...emptyInput.salary, gross, ...(patch.salary ?? {}) } });

describe('tax engine regressions', () => {
  it('synthetic break-even tax at current deductions equals the ledger old-regime tax', () => {
    for (const persona of Object.values(personas)) expect(oldTaxAtDeductions(persona.input, currentOldDeductions(persona.input))).toBe(computeTax(persona.input, 'old').totalTax);
  });
  it('does not set off a let-out property loss against salary in the new regime', () => {
    const house = housePropertyIncome({ kind: 'letOut', rentReceived: 100000, municipalTaxes: 0, interestPaid: 300000 }, 'new');
    expect(house.income).toBe(0); expect(house.carryForwardLoss).toBe(230000);
    expect(housePropertyIncome({ kind: 'letOut', rentReceived: 100000, municipalTaxes: 0, interestPaid: 300000 }, 'old').income).toBe(-200000);
  });
  it('caps employer NPS at 10% of basic + DA in the old regime and 14% in the new', () => {
    const value = withSalary(1500000, { salary: { ...emptyInput.salary, gross: 1500000, basic: 600000, employerNpsContribution: 84000 } });
    expect(computeTax(value, 'old').deductions.find((line) => line.key === '80CCD2')?.allowed).toBe(60000);
    expect(computeTax(value, 'new').deductions.find((line) => line.key === '80CCD2')?.allowed).toBe(84000);
  });
  it('includes capital gains when testing 87A eligibility', () => {
    const value = withSalary(1175000, { capitalGains: { stcg111A: 200000, ltcg112A: 0 } });
    const result = computeTax(value, 'new');
    expect(result.taxableIncome).toBe(1100000); expect(result.rebate).toBe(0); expect(result.totalTax).toBeGreaterThan(0);
  });
  it('lets a resident use unused basic exemption against STCG', () => {
    const value = withSalary(0, { capitalGains: { stcg111A: 300000, ltcg112A: 0 } });
    expect(computeTax(value, 'new').specialTax).toBe(0);
    expect(computeTax({ ...value, residency: 'nonResident' }, 'new').specialTax).toBe(60000);
  });
  it('caps surcharge on capital-gains tax at 15%', () => {
    expect(surchargeWithRelief(1000000, 30000000, 'new', 30, 1000000).surcharge).toBe(150000);
  });
  it('keeps surcharge marginal relief continuous when capital gains push income over ₹50L', () => {
    const at = computeTax(withSalary(4000000, { capitalGains: { stcg111A: 1075000, ltcg112A: 0 } }), 'new').totalTax;
    const over = computeTax(withSalary(4001000, { capitalGains: { stcg111A: 1075000, ltcg112A: 0 } }), 'new').totalTax;
    expect(over - at).toBeLessThanOrEqual(1100);
  });
  it('limits qualifying 80G donations to 10% of gross total income and applies flat disability amounts', () => {
    const value = withSalary(1050000, { deductions: { ...emptyInput.deductions, donations: [{ amount: 200000, percent: 50, hasQualifyingLimit: true }, { amount: 10000, percent: 100, hasQualifyingLimit: false }], section80U: 125000 } });
    const lines = computeTax(value, 'old').deductions;
    expect(lines.find((line) => line.key === '80G')?.allowed).toBe(60000);
    expect(lines.find((line) => line.key === '80U')?.allowed).toBe(125000);
    expect(computeTax({ ...value, deductions: { ...value.deductions, section80CCH: 5000 } }, 'old').deductions.find((line) => line.key === '80CCH')?.allowed).toBe(5000);
  });
  it('turns a malformed shared link into a safe input', () => {
    const value = normalizeInput({ salary: { gross: '1200000', basic: -5 }, houseProperty: { kind: 'hack' }, age: 'x' });
    expect(value.salary.gross).toBe(1200000); expect(value.salary.basic).toBe(0); expect(value.houseProperty.kind).toBe('none'); expect(value.age).toBe(30);
    expect(() => compareRegimes(normalizeInput(null))).not.toThrow();
  });
});

describe('explanations', () => {
  it('rule-based explanation quotes the computed figures', () => {
    const input = personas.priya.input; const comparison = compareRegimes(input);
    const lines = explainInDetail(input, comparison, findBreakEven(input));
    expect(lines[0]).toContain(comparison.difference.toLocaleString('en-IN'));
    expect(lines.length).toBeGreaterThan(2);
  });
  it('rejects LLM narration that introduces a number', async () => {
    expect(onlyUsesKnownNumbers('You save ₹12,000.', 'saves ₹12,000')).toBe(true);
    expect(onlyUsesKnownNumbers('You save ₹13,000.', 'saves ₹12,000')).toBe(false);
    const fake = (async () => new Response(JSON.stringify({ choices: [{ message: { content: 'You save ₹99,999.' } }] }))) as typeof fetch;
    expect(await narrate('saves ₹12,000', 'key', fake)).toBeNull();
  });
});
