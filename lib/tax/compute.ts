import { capitalGainsTax } from './capitalGains';
import { chapterVIA } from './deductions';
import { housePropertyIncome } from './houseProperty';
import { hraExemption } from './hra';
import { rebate, rebateMarginalRelief } from './rebate';
import { rules } from './rules';
import { round10 } from './round';
import { ageOnFinancialYear, slabTax } from './slabs';
import { surchargeWithRelief } from './surcharge';
import type { Comparison, Regime, Step, TaxInput, TaxResult } from './types';

export const emptyInput: TaxInput = {
  age: 30, residency: 'resident',
  salary: { gross: 0, basic: 0, da: 0, hraReceived: 0, rentPaid: 0, city: 'Other', otherExemptAllowances: 0, employerNpsContribution: 0 },
  houseProperty: { kind: 'none' }, otherIncome: { savingsInterest: 0, depositInterest: 0, dividends: 0, familyPension: 0 },
  capitalGains: { stcg111A: 0, ltcg112A: 0 },
  deductions: { section80C: 0, section80CCD1B: 0, section80Dself: 0, selfOrSpouseSenior: false, section80Dparents: 0, parentSenior: false, section80E: 0, donations: [], section80DD: 0, section80DDB: 0, section80U: 0, section80GG: 0, professionalTax: 0, section80CCH: 0 },
  tdsPaid: 0
};

function step(number: number, label: string, value: number, working: string, section?: string, disallowed?: boolean): Step {
  return { number, label, value, working, section, disallowed };
}

export function computeTax(input: TaxInput, regime: Regime): TaxResult {
  const age = ageOnFinancialYear(input);
  const salaryExists = input.salary.gross > 0;
  const hra = hraExemption(input);
  const exemptAllowances = regime === 'old' ? hra.exemption + Math.max(0, input.salary.otherExemptAllowances) : 0;
  const netSalary = Math.max(0, input.salary.gross - exemptAllowances);
  const standardDeduction = salaryExists ? (regime === 'old' ? rules.oldRegime.standardDeduction : rules.newRegime.standardDeduction) : 0;
  const house = housePropertyIncome(input.houseProperty, regime);
  const otherSources = Math.max(0, input.otherIncome.savingsInterest) + Math.max(0, input.otherIncome.depositInterest) + Math.max(0, input.otherIncome.dividends) + Math.max(0, input.otherIncome.familyPension);
  const grossTotalIncome = Math.max(0, netSalary - standardDeduction + house.income + otherSources);
  const deductions = chapterVIA(input, regime, grossTotalIncome);
  const taxableIncome = round10(Math.max(0, grossTotalIncome - deductions.total));
  const beforeSlabTax = slabTax(taxableIncome, regime, age);
  const gains = capitalGainsTax(input);
  const rebateValue = rebate(beforeSlabTax, taxableIncome, input.residency, regime);
  const postRebate = beforeSlabTax - rebateValue;
  const marginal = rebateMarginalRelief(postRebate, taxableIncome, regime);
  const taxBeforeSurcharge = marginal.tax + gains.tax;
  const totalIncomeForSurcharge = taxableIncome + gains.totalIncome;
  const surchargeInfo = surchargeWithRelief(taxBeforeSurcharge, totalIncomeForSurcharge, regime, age);
  const postSurcharge = taxBeforeSurcharge + surchargeInfo.surcharge - surchargeInfo.relief;
  const cess = postSurcharge * rules.rates.cess;
  const totalTax = round10(Math.max(0, postSurcharge + cess));
  const balanceOrRefund = totalTax - Math.max(0, input.tdsPaid);
  const deductionSteps = deductions.lines.filter((line) => line.key !== 'hra' && (line.entered > 0 || line.allowed > 0)).map((line) => ({ ...line }));
  const steps: Step[] = [
    step(1, 'Gross salary', input.salary.gross, 'Salary entered.'),
    step(2, 'Less: exempt allowances', -exemptAllowances, regime === 'old' ? hra.working : 'Exempt salary allowances are not allowed in the new regime.', '10(13A)', regime === 'new' && (input.salary.hraReceived > 0 || input.salary.otherExemptAllowances > 0)),
    step(3, 'Net salary', netSalary, 'Gross salary less allowed exemptions.'),
    step(4, 'Less: standard deduction', -standardDeduction, salaryExists ? 'Available because salary income is present.' : 'No salary or pension income; no standard deduction.'),
    step(5, 'Income from house property', house.income, house.working),
    step(6, 'Income from other sources', otherSources, 'Savings interest, deposit interest, dividends and family pension.'),
    step(7, 'Gross total income', grossTotalIncome, 'Net salary less standard deduction plus other income.'),
    step(8, 'Less: Chapter VI-A deductions', -deductions.total, deductionSteps.length ? deductionSteps.map((line) => `${line.label}: ₹${line.allowed}`).join('; ') : 'No allowed Chapter VI-A deductions.'),
    step(9, 'Taxable income', taxableIncome, 'Rounded to nearest ₹10.', '288A'),
    step(10, 'Tax at slab rates', beforeSlabTax, 'Taxed according to the applicable slab rates.'),
    step(11, 'Special-rate capital gains tax', gains.tax, gains.working),
    step(12, 'Less: rebate', -rebateValue, input.residency === 'resident' ? '87A applies only to slab-rate tax within the income threshold.' : 'Non-residents are not eligible for 87A rebate.', '87A'),
    step(13, 'Less: rebate marginal relief', -marginal.relief, marginal.relief > 0 ? `Tax is capped at income above ₹${rules.newRegime.rebateThreshold}.` : 'Not in the new-regime marginal-relief zone.'),
    step(14, 'Add: surcharge', surchargeInfo.surcharge, surchargeInfo.rate > 0 ? `Surcharge at ${surchargeInfo.rate * 100}%.` : 'Income does not exceed a surcharge threshold.'),
    step(15, 'Less: surcharge marginal relief', -surchargeInfo.relief, surchargeInfo.relief > 0 ? 'Increase above threshold capped at extra income.' : 'No surcharge marginal relief needed.'),
    step(16, 'Add: health and education cess', cess, '4% on tax after rebate and surcharge.', '4%'),
    step(17, 'Total tax payable', totalTax, 'Rounded to nearest ₹10.', '288B'),
    step(18, balanceOrRefund >= 0 ? 'Less: TDS already paid (balance payable)' : 'Less: TDS already paid (refund due)', balanceOrRefund, 'Final tax less TDS already paid.')
  ];
  return { regime, steps, grossTotalIncome, taxableIncome, totalIncomeForSurcharge, slabTax: beforeSlabTax, specialTax: gains.tax, rebate: rebateValue, marginalRelief: marginal.relief, surcharge: surchargeInfo.surcharge, surchargeRelief: surchargeInfo.relief, cess, totalTax, tdsPaid: input.tdsPaid, balanceOrRefund, deductions: deductions.lines, hraExemption: hra.exemption, housePropertyCarryForwardLoss: house.carryForwardLoss };
}

export function compareRegimes(input: TaxInput): Comparison {
  const old = computeTax(input, 'old'); const newer = computeTax(input, 'new');
  const winner = old.totalTax === newer.totalTax ? 'tie' : old.totalTax < newer.totalTax ? 'old' : 'new';
  return { old, new: newer, winner, difference: Math.abs(old.totalTax - newer.totalTax) };
}

/** Computes an old-regime tax with a single synthetic deduction amount for break-even search. */
export function oldTaxAtDeductions(input: TaxInput, deductionsAmount: number): number {
  const old = computeTax(input, 'old');
  const age = ageOnFinancialYear(input);
  const taxableIncome = round10(Math.max(0, old.grossTotalIncome - deductionsAmount));
  const slab = slabTax(taxableIncome, 'old', age);
  const rebateValue = rebate(slab, taxableIncome, input.residency, 'old');
  const gains = capitalGainsTax(input);
  const preSurcharge = slab - rebateValue + gains.tax;
  const surcharge = surchargeWithRelief(preSurcharge, taxableIncome + gains.totalIncome, 'old', age);
  return round10(preSurcharge + surcharge.surcharge - surcharge.relief + (preSurcharge + surcharge.surcharge - surcharge.relief) * rules.rates.cess);
}
