import type { Flag, ReconciliationInput } from '../types';
import { flag, tdsTolerance } from './helpers';
import { rules } from '@/lib/tax/rules';

export function tdsIntegrityFlags(input: ReconciliationInput): Flag[] {
  const flags: Flag[] = []; const sum = input.form16.tdsQuarterly.reduce((total, item) => total + item.amount, 0);
  if (Math.abs(sum - input.form16.totalTds) > tdsTolerance()) flags.push(flag('QUARTERLY_TDS_SUM_MISMATCH', 'WARNING', 'Quarterly TDS does not add up to Form 16 total', 'The quarterly deposits and stated total differ.', 'A transcription or employer filing issue can obscure your credit.', 'Ask the employer for a corrected Form 16 or TDS statement.', { formSixteenValue: input.form16.totalTds, aisValue: sum, difference: input.form16.totalTds - sum }, 'HIGH'));
  for (const item of input.form16.tdsQuarterly) if (item.depositedOn > rules.tdsDepositDueDates[item.quarter]) flags.push(flag('TDS_DEPOSITED_LATE', 'INFO', `${item.quarter} TDS was deposited late`, 'The deposit date is after the stated statutory due date.', 'Late deposit is usually an employer compliance issue but can delay correction.', 'Keep Form 16 and ask the employer to confirm the deposit.', { formSixteenValue: item.amount }, 'MEDIUM'));
  return flags;
}
