import { hraExemption } from './hra';
import { rules } from './rules';
import { ageOnFinancialYear } from './slabs';
import type { DeductionLine, Regime, TaxInput } from './types';

function capped(entered: number, cap: number): number { return Math.min(Math.max(0, entered), cap); }

export function deductionLines(input: TaxInput, regime: Regime, grossTotalIncome: number): DeductionLine[] {
  const age = ageOnFinancialYear(input); const d = input.deductions;
  const self80D = capped(d.section80Dself, d.selfOrSpouseSenior ? rules.caps['80DSenior'] : rules.caps['80DNormal']);
  const parent80D = capped(d.section80Dparents, d.parentSenior ? rules.caps['80DSenior'] : rules.caps['80DNormal']);
  const nps2Cap = (input.salary.basic + input.salary.da) * rules.rates.employerNpsRate;
  const nps2 = capped(input.salary.employerNpsContribution, nps2Cap);
  const tta = age < 60 ? capped(input.otherIncome.savingsInterest, rules.caps['80TTA']) : 0;
  const ttb = age >= 60 ? capped(input.otherIncome.savingsInterest + input.otherIncome.depositInterest, rules.caps['80TTB']) : 0;
  const hra = hraExemption(input).exemption;
  const ggLimit = Math.min(rules.caps['80GGMonthly'] * 12, grossTotalIncome * rules.caps['80GGIncomeRatio'], Math.max(0, input.salary.rentPaid - grossTotalIncome * rules.caps['80GGRentIncomeRatio']));
  const gg = input.salary.hraReceived > 0 ? 0 : capped(d.section80GG, ggLimit);
  const donationLimit = grossTotalIncome * rules.caps['80GGIncomeRatio'];
  const donation = d.donations.reduce((sum, item) => sum + Math.min(item.amount, item.hasQualifyingLimit ? donationLimit : item.amount) * item.percent / 100, 0);
  const oldOnly = regime === 'old';
  const newOnly = regime === 'new';
  const lines: DeductionLine[] = [
    { key: 'hra', label: 'HRA exemption', entered: hra, allowed: oldOnly ? hra : 0, oldAllowed: true, newAllowed: false, note: hraExemption(input).working },
    { key: '80C', label: '80C', entered: d.section80C, allowed: oldOnly ? capped(d.section80C, rules.caps['80C']) : 0, oldAllowed: true, newAllowed: false, note: d.section80C > rules.caps['80C'] ? `Allowed up to ₹${rules.caps['80C']}; excess has no tax effect.` : undefined },
    { key: '80CCD1B', label: '80CCD(1B)', entered: d.section80CCD1B, allowed: oldOnly ? capped(d.section80CCD1B, rules.caps['80CCD1B']) : 0, oldAllowed: true, newAllowed: false },
    { key: '80CCD2', label: "80CCD(2), employer NPS", entered: input.salary.employerNpsContribution, allowed: nps2, oldAllowed: true, newAllowed: true, note: input.salary.employerNpsContribution > nps2 ? `Allowed up to 14% of basic + DA (₹${nps2}). Excess is taxable.` : undefined },
    { key: '80Dself', label: '80D, self/family', entered: d.section80Dself, allowed: oldOnly ? self80D : 0, oldAllowed: true, newAllowed: false },
    { key: '80Dparents', label: '80D, parents', entered: d.section80Dparents, allowed: oldOnly ? parent80D : 0, oldAllowed: true, newAllowed: false },
    { key: '80TTA', label: '80TTA savings interest', entered: input.otherIncome.savingsInterest, allowed: oldOnly ? tta : 0, oldAllowed: true, newAllowed: false, note: age >= 60 ? '80TTB applies instead for senior citizens.' : undefined },
    { key: '80TTB', label: '80TTB deposit interest', entered: input.otherIncome.savingsInterest + input.otherIncome.depositInterest, allowed: oldOnly ? ttb : 0, oldAllowed: true, newAllowed: false, note: age < 60 ? 'Available only to senior citizens.' : undefined },
    { key: '80E', label: '80E education-loan interest', entered: d.section80E, allowed: oldOnly ? Math.max(0, d.section80E) : 0, oldAllowed: true, newAllowed: false },
    { key: '80G', label: '80G donations', entered: d.donations.reduce((sum, item) => sum + item.amount, 0), allowed: oldOnly ? donation : 0, oldAllowed: true, newAllowed: false },
    { key: '80DD', label: '80DD disability', entered: d.section80DD, allowed: oldOnly ? capped(d.section80DD, rules.caps.disability) : 0, oldAllowed: true, newAllowed: false },
    { key: '80DDB', label: '80DDB specified illness', entered: d.section80DDB, allowed: oldOnly ? capped(d.section80DDB, age >= 60 ? rules.caps.specifiedIllnessSenior : rules.caps.specifiedIllness) : 0, oldAllowed: true, newAllowed: false },
    { key: '80U', label: '80U disability', entered: d.section80U, allowed: oldOnly ? capped(d.section80U, rules.caps.disability) : 0, oldAllowed: true, newAllowed: false },
    { key: '80GG', label: '80GG rent paid', entered: d.section80GG, allowed: oldOnly ? gg : 0, oldAllowed: true, newAllowed: false, note: input.salary.hraReceived > 0 ? 'Not available when HRA is received.' : undefined },
    { key: 'professionalTax', label: 'Professional tax', entered: d.professionalTax, allowed: oldOnly ? capped(d.professionalTax, rules.caps.professionalTax) : 0, oldAllowed: true, newAllowed: false },
    { key: '80CCH', label: '80CCH Agniveer contribution', entered: d.section80CCH, allowed: newOnly ? Math.max(0, d.section80CCH) : 0, oldAllowed: false, newAllowed: true },
    { key: 'familyPension', label: 'Family pension deduction', entered: input.otherIncome.familyPension, allowed: newOnly ? Math.min(rules.caps.familyPension, input.otherIncome.familyPension * rules.rates.familyPensionRatio) : 0, oldAllowed: false, newAllowed: true }
  ];
  return lines;
}

export function chapterVIA(input: TaxInput, regime: Regime, grossTotalIncome: number): { total: number; lines: DeductionLine[] } {
  const lines = deductionLines(input, regime, grossTotalIncome);
  // HRA is an exemption from salary and is deliberately excluded from Chapter VI-A.
  return { total: lines.filter((line) => line.key !== 'hra').reduce((sum, line) => sum + line.allowed, 0), lines };
}
