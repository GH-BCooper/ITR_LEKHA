import { rules } from '@/lib/tax/rules';
import type { AisEntry, Flag, ReconciliationInput } from '../types';

export function flag(code: Flag['code'], severity: Flag['severity'], title: string, whatItMeans: string, ifIgnored: string, suggestedAction: string, evidence: Flag['evidence'], confidence: Flag['confidence']): Flag {
  return { id: `${code}-${evidence.aisEntryIds?.join('-') ?? 'document'}`, code, severity, title, whatItMeans, ifIgnored, suggestedAction, evidence, confidence };
}
export const tdsTolerance = () => rules.tolerances.tds;
export const salaryTolerance = () => rules.tolerances.salary;
export const materiality = () => rules.tolerances.undeclaredIncome;
export function employerEntries(input: ReconciliationInput): AisEntry[] { return input.ais.entries.filter((entry) => entry.sourceTan === input.form16.employer.tan); }
export function declaredAmount(input: ReconciliationInput, category: AisEntry['category']): number {
  const declared = input.declared;
  if (category === 'SAVINGS_INTEREST') return declared.otherIncome.savingsInterest;
  if (category === 'FD_INTEREST') return declared.otherIncome.depositInterest;
  if (category === 'DIVIDEND') return declared.otherIncome.dividends;
  return 0;
}
