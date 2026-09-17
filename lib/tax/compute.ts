import { capitalGainsTax } from './capitalGains';
import { chapterVIA } from './deductions';
import { housePropertyIncome } from './houseProperty';
import { hraExemption } from './hra';
import { rebate, rebateMarginalRelief } from './rebate';
import { rules } from './rules';
import { round10 } from './round';
import { ageOnFinancialYear, oldSlabs, slabTax } from './slabs';
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

function otherSourcesIncome(input: TaxInput): number {
  return Math.max(0, input.otherIncome.savingsInterest) + Math.max(0, input.otherIncome.depositInterest) + Math.max(0, input.otherIncome.dividends) + Math.max(0, input.otherIncome.familyPension);
}

/**
 * Everything after taxable income: slab tax, special-rate gains, rebate, surcharge and cess.
 * Shared by the full computation and the break-even search so both always agree.
 */
function taxOnIncome(input: TaxInput, regime: Regime, taxableIncome: number) {
  const age = ageOnFinancialYear(input);
  const slab = slabTax(taxableIncome, regime, age);
  const zeroBand = (regime === 'new' ? rules.newRegime.slabs[0].upTo : oldSlabs(age)[0].upTo) ?? 0;
  const unusedExemption = input.residency === 'resident' ? Math.max(0, zeroBand - taxableIncome) : 0;
  const gains = capitalGainsTax(input, unusedExemption);
  // 87A eligibility and its marginal relief look at total income, which includes special-rate gains.
  const totalIncome = taxableIncome + gains.totalIncome;
  const rebateValue = rebate(slab, totalIncome, input.residency, regime);
  const marginal = rebateMarginalRelief(slab - rebateValue, totalIncome, regime);
  const taxBeforeSurcharge = marginal.tax + gains.tax;
  // For surcharge marginal relief, income at the threshold keeps the same gains and trims slab income first.
  const taxAtThreshold = (threshold: number) => {
    const trimSlab = Math.min(taxableIncome, totalIncome - threshold);
    const trimGains = totalIncome - threshold - trimSlab;
    const gainsAtThreshold = trimGains > 0 ? capitalGainsTax({ ...input, capitalGains: { stcg111A: Math.max(0, input.capitalGains.stcg111A - trimGains), ltcg112A: Math.max(0, input.capitalGains.ltcg112A - Math.max(0, trimGains - input.capitalGains.stcg111A)) } }, 0).tax : gains.tax;
    return { slab: slabTax(taxableIncome - trimSlab, regime, age), special: gainsAtThreshold };
  };
  const surcharge = surchargeWithRelief(taxBeforeSurcharge, totalIncome, regime, age, gains.tax, taxAtThreshold);
  const postSurcharge = taxBeforeSurcharge + surcharge.surcharge - surcharge.relief;
  const cess = postSurcharge * rules.rates.cess;
  return { slab, gains, totalIncome, rebateValue, marginal, surcharge, cess, totalTax: round10(Math.max(0, postSurcharge + cess)) };
}

export function computeTax(input: TaxInput, regime: Regime): TaxResult {
  const salaryExists = input.salary.gross > 0;
  const hra = hraExemption(input);
  const exemptAllowances = regime === 'old' ? hra.exemption + Math.max(0, input.salary.otherExemptAllowances) : 0;
  const netSalary = Math.max(0, input.salary.gross - exemptAllowances);
  const flatDeduction = regime === 'old' ? rules.oldRegime.standardDeduction : rules.newRegime.standardDeduction;
  const standardDeduction = salaryExists ? Math.min(netSalary, flatDeduction) : 0;
  const house = housePropertyIncome(input.houseProperty, regime);
  const otherSources = otherSourcesIncome(input);
  const grossTotalIncome = Math.max(0, netSalary - standardDeduction + house.income + otherSources);
  const deductions = chapterVIA(input, regime, grossTotalIncome);
  const taxableIncome = round10(Math.max(0, grossTotalIncome - deductions.total));
  const tax = taxOnIncome(input, regime, taxableIncome);
  const { gains, marginal, surcharge: surchargeInfo, cess, totalTax } = tax;
  const tdsPaid = Math.max(0, input.tdsPaid);
  const balanceOrRefund = totalTax - tdsPaid;
  const deductionSteps = deductions.lines.filter((line) => line.key !== 'hra' && line.allowed > 0);
  const steps: Step[] = [
    step(1, 'Gross salary', input.salary.gross, 'Salary entered.'),
    step(2, 'Less: exempt allowances', -exemptAllowances, regime === 'old' ? `HRA exemption is ${hra.working}; other exempt allowances ₹${Math.max(0, input.salary.otherExemptAllowances)}.` : 'Exempt salary allowances are not allowed in the new regime.', '10(13A)', regime === 'new' && (hra.exemption > 0 || input.salary.otherExemptAllowances > 0)),
    step(3, 'Net salary', netSalary, 'Gross salary less allowed exemptions.'),
    step(4, 'Less: standard deduction', -standardDeduction, salaryExists ? `Flat ₹${flatDeduction} for salaried taxpayers in the ${regime} regime.` : 'No salary or pension income; no standard deduction.', '16(ia)'),
    step(5, 'Income from house property', house.income, house.working),
    step(6, 'Income from other sources', otherSources, 'Savings interest, deposit interest, dividends and family pension.'),
    step(7, 'Gross total income', grossTotalIncome, 'Net salary less standard deduction, plus house property and other income.'),
    step(8, 'Less: Chapter VI-A deductions', -deductions.total, deductionSteps.length ? deductionSteps.map((line) => `${line.label}: ₹${Math.round(line.allowed)}${line.note ? ` (${line.note})` : ''}`).join('; ') : regime === 'new' ? 'Only employer NPS, Agniveer and family-pension deductions apply in the new regime.' : 'No allowed Chapter VI-A deductions.'),
    step(9, 'Taxable income', taxableIncome, 'Rounded to nearest ₹10. Special-rate capital gains are taxed separately below.', '288A'),
    step(10, 'Tax at slab rates', tax.slab, `Slab rates for the ${regime} regime applied to ₹${taxableIncome}.`),
    step(11, 'Special-rate capital gains tax', gains.tax, gains.working, '111A/112A'),
    step(12, 'Less: rebate', -tax.rebateValue, input.residency === 'resident' ? `Available when total income (₹${tax.totalIncome}) is within ₹${regime === 'new' ? rules.newRegime.rebateThreshold : rules.oldRegime.rebateThreshold}; applies to slab tax only.` : 'Non-residents are not eligible for 87A rebate.', '87A'),
    step(13, 'Less: rebate marginal relief', -marginal.relief, marginal.relief > 0 ? `Slab tax is capped at income above ₹${rules.newRegime.rebateThreshold}.` : 'Not in the new-regime marginal-relief zone.'),
    step(14, 'Add: surcharge', surchargeInfo.surcharge, surchargeInfo.rate > 0 ? `Surcharge at ${surchargeInfo.rate * 100}% (capped at 15% on capital-gains tax).` : 'Income does not exceed a surcharge threshold.'),
    step(15, 'Less: surcharge marginal relief', -surchargeInfo.relief, surchargeInfo.relief > 0 ? 'Increase above threshold capped at extra income.' : 'No surcharge marginal relief needed.'),
    step(16, 'Add: health and education cess', cess, '4% on tax after rebate and surcharge.', '4%'),
    step(17, 'Total tax payable', totalTax, 'Rounded to nearest ₹10.', '288B'),
    step(18, balanceOrRefund >= 0 ? 'Balance payable after TDS' : 'Refund due after TDS', balanceOrRefund, `Total tax ₹${totalTax} less TDS already paid ₹${tdsPaid}.`)
  ];
  return { regime, steps, grossTotalIncome, taxableIncome, totalIncomeForSurcharge: tax.totalIncome, slabTax: tax.slab, specialTax: gains.tax, rebate: tax.rebateValue, marginalRelief: marginal.relief, surcharge: surchargeInfo.surcharge, surchargeRelief: surchargeInfo.relief, cess, totalTax, tdsPaid, balanceOrRefund, deductions: deductions.lines, hraExemption: hra.exemption, housePropertyCarryForwardLoss: house.carryForwardLoss };
}

export function compareRegimes(input: TaxInput): Comparison {
  const old = computeTax(input, 'old'); const newer = computeTax(input, 'new');
  const winner = old.totalTax === newer.totalTax ? 'tie' : old.totalTax < newer.totalTax ? 'old' : 'new';
  return { old, new: newer, winner, difference: Math.abs(old.totalTax - newer.totalTax) };
}

/**
 * Old-regime income before everything the break-even model treats as a "deduction":
 * salary exemptions (HRA and others), self-occupied home-loan interest and Chapter VI-A.
 */
export function oldIncomeBeforeDeductions(input: TaxInput): number {
  const salary = input.salary.gross > 0 ? Math.max(0, input.salary.gross - rules.oldRegime.standardDeduction) : 0;
  const house = input.houseProperty.kind === 'letOut' ? housePropertyIncome(input.houseProperty, 'old').income : 0;
  return Math.max(0, salary + house + otherSourcesIncome(input));
}

/** Every old-regime reduction the break-even model counts, so the synthetic tax at this amount matches the ledger. */
export function currentOldDeductions(input: TaxInput): number {
  const old = computeTax(input, 'old');
  const selfOccupied = input.houseProperty.kind === 'selfOccupied' ? -housePropertyIncome(input.houseProperty, 'old').income : 0;
  const chapterVIA = old.deductions.filter((line) => line.key !== 'hra').reduce((sum, line) => sum + line.allowed, 0);
  return Math.round(old.hraExemption + Math.max(0, input.salary.otherExemptAllowances) + selfOccupied + chapterVIA);
}

/** Computes an old-regime tax with a single synthetic deduction amount for break-even search. */
export function oldTaxAtDeductions(input: TaxInput, deductionsAmount: number): number {
  const taxableIncome = round10(Math.max(0, oldIncomeBeforeDeductions(input) - Math.max(0, deductionsAmount)));
  return taxOnIncome(input, 'old', taxableIncome).totalTax;
}
