import { emptyInput } from './compute';
import { rules } from './rules';
import type { HouseProperty, TaxInput } from './types';

/** Clamp anything from a URL or file to a safe whole-rupee amount. */
function money(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(rules.caps.maxInput, Math.max(0, Math.round(parsed))) : 0;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

/** Builds a complete, valid TaxInput from untrusted data (for example a shared link). Missing fields fall back to empty values. */
export function normalizeInput(raw: unknown): TaxInput {
  const source = record(raw); const salary = record(source.salary); const other = record(source.otherIncome); const gains = record(source.capitalGains); const deductions = record(source.deductions); const house = record(source.houseProperty);
  const houseProperty: HouseProperty = house.kind === 'selfOccupied' ? { kind: 'selfOccupied', interestPaid: money(house.interestPaid) }
    : house.kind === 'letOut' ? { kind: 'letOut', rentReceived: money(house.rentReceived), municipalTaxes: money(house.municipalTaxes), interestPaid: money(house.interestPaid) }
    : { kind: 'none' };
  const age = Number(source.age);
  return {
    age: Number.isFinite(age) ? Math.min(120, Math.max(0, Math.round(age))) : emptyInput.age,
    residency: source.residency === 'nonResident' ? 'nonResident' : 'resident',
    salary: { gross: money(salary.gross), basic: money(salary.basic), da: money(salary.da), hraReceived: money(salary.hraReceived), rentPaid: money(salary.rentPaid), city: typeof salary.city === 'string' ? salary.city : 'Other', otherExemptAllowances: money(salary.otherExemptAllowances), employerNpsContribution: money(salary.employerNpsContribution) },
    houseProperty,
    otherIncome: { savingsInterest: money(other.savingsInterest), depositInterest: money(other.depositInterest), dividends: money(other.dividends), familyPension: money(other.familyPension) },
    capitalGains: { stcg111A: money(gains.stcg111A), ltcg112A: money(gains.ltcg112A) },
    deductions: {
      ...emptyInput.deductions,
      section80C: money(deductions.section80C), section80CCD1B: money(deductions.section80CCD1B), section80Dself: money(deductions.section80Dself), selfOrSpouseSenior: deductions.selfOrSpouseSenior === true,
      section80Dparents: money(deductions.section80Dparents), parentSenior: deductions.parentSenior === true, section80E: money(deductions.section80E), section80DD: money(deductions.section80DD), section80DDB: money(deductions.section80DDB), section80U: money(deductions.section80U), section80GG: money(deductions.section80GG), professionalTax: money(deductions.professionalTax), section80CCH: money(deductions.section80CCH),
      donations: Array.isArray(deductions.donations) ? deductions.donations.map(record).map((item) => ({ amount: money(item.amount), percent: item.percent === 50 ? 50 : 100, hasQualifyingLimit: item.hasQualifyingLimit === true })) : []
    },
    tdsPaid: money(source.tdsPaid)
  };
}
