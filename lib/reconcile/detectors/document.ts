import type { Flag, ReconciliationInput } from '../types';
import { flag, employerEntries, salaryTolerance, tdsTolerance } from './helpers';

export function documentFlags(input: ReconciliationInput): Flag[] {
  const flags: Flag[] = []; const { form16, ais } = input;
  if (form16.pan !== ais.pan) flags.push(flag('PAN_MISMATCH', 'BLOCKER', 'The PANs do not match', 'These documents appear to belong to different taxpayers.', 'Credits can be missed or a return can be matched to the wrong record.', 'Check both PANs before using either document.', {}, 'HIGH'));
  if (form16.assessmentYear !== ais.assessmentYear) flags.push(flag('ASSESSMENT_YEAR_MISMATCH', 'BLOCKER', 'The assessment years do not match', 'The two documents cover different filing years.', 'Comparing different years produces misleading figures.', 'Load Form 16 and AIS for the same assessment year.', {}, 'HIGH'));
  const employer = employerEntries(input);
  if (!employer.length) flags.push(flag('TAN_MISMATCH', 'BLOCKER', 'Your employer TAN is missing from AIS', 'AIS has no entry with the employer TAN on Form 16.', 'Employer TDS may not be available to claim.', 'Ask the employer to verify its TDS filing and TAN.', { aisEntryIds: [] }, 'HIGH'));
  const salary = employer.filter((entry) => entry.category === 'SALARY').reduce((sum, entry) => sum + entry.amount, 0);
  if (employer.length && Math.abs(form16.salary.gross - salary) > salaryTolerance()) flags.push(flag('SALARY_MISMATCH', 'WARNING', 'Salary differs between Form 16 and AIS', 'The employer-reported salary does not match the AIS salary amount.', 'A mismatch can trigger a follow-up on the return.', 'Compare the salary breakup and correct the source document if needed.', { formSixteenValue: form16.salary.gross, aisValue: salary, difference: form16.salary.gross - salary }, 'HIGH'));
  const credited = employer.reduce((sum, entry) => sum + entry.tdsCredited, 0);
  if (form16.totalTds - credited > tdsTolerance()) flags.push(flag('TDS_CLAIMED_EXCEEDS_CREDITED', 'BLOCKER', 'Form 16 claims more TDS than AIS credits', 'The employer TDS on Form 16 is higher than the credit visible in AIS.', 'The unmatched credit can be denied until it is corrected.', 'Ask the employer to correct its TDS return, then recheck Form 26AS.', { formSixteenValue: form16.totalTds, aisValue: credited, difference: form16.totalTds - credited }, 'HIGH'));
  if (credited - form16.totalTds > tdsTolerance()) flags.push(flag('TDS_CREDITED_NOT_CLAIMED', 'WARNING', 'AIS shows employer TDS not claimed on Form 16', 'AIS records more employer TDS than Form 16 states.', 'You may miss a tax credit or refund.', 'Verify the employer record and include only credits that belong to you.', { formSixteenValue: form16.totalTds, aisValue: credited, difference: credited - form16.totalTds }, 'HIGH'));
  return flags;
}
