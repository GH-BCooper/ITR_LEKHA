import { computeTax } from '@/lib/tax/compute';
import { documentFlags } from './detectors/document';
import { duplicateFlags } from './detectors/duplicates';
import { incomeFlags } from './detectors/income';
import { tdsIntegrityFlags } from './detectors/tds';
import { riskScore } from './riskScore';
import type { ReconciliationInput, ReconciliationResult } from './types';

export function reconcile(input: ReconciliationInput): ReconciliationResult {
  const duplicates = duplicateFlags(input); const income = incomeFlags(input, duplicates.duplicateEntryIds);
  const flags = [...documentFlags(input), ...duplicates.flags, ...income.flags, ...tdsIntegrityFlags(input)].sort((a, b) => ({ BLOCKER: 0, WARNING: 1, INFO: 2 }[a.severity] - { BLOCKER: 0, WARNING: 1, INFO: 2 }[b.severity]));
  return { flags, duplicateEntryIds: duplicates.duplicateEntryIds, undeclaredIncomeTotal: income.undeclaredIncomeTotal, risk: riskScore(flags, income.undeclaredIncomeTotal, computeTax(input.declared, 'new').grossTotalIncome) };
}
