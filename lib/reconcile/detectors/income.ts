import { rules } from '@/lib/tax/rules';
import type { AisEntry, Flag, ReconciliationInput } from '../types';
import { declaredAmount, flag, materiality } from './helpers';

const categoryLabels: Record<'SAVINGS_INTEREST' | 'FD_INTEREST' | 'DIVIDEND', string> = { SAVINGS_INTEREST: 'Savings-account interest', FD_INTEREST: 'Fixed-deposit interest', DIVIDEND: 'Dividend income' };

export function incomeFlags(input: ReconciliationInput, duplicateEntryIds: string[]): { flags: Flag[]; undeclaredIncomeTotal: number } {
  const flags: Flag[] = []; let undeclaredIncomeTotal = 0;
  const counted = input.ais.entries.filter((entry) => !duplicateEntryIds.includes(entry.id));
  // Compare category totals, not single entries: two ₹40,000 FDs against ₹50,000 declared is still ₹30,000 short.
  for (const category of ['SAVINGS_INTEREST', 'FD_INTEREST', 'DIVIDEND'] as const) {
    const entries = counted.filter((entry) => entry.category === category);
    if (!entries.length) continue;
    const reported = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const declared = declaredAmount(input, category);
    const difference = reported - declared;
    const ids = entries.map((entry) => entry.id);
    if (difference > materiality()) {
      undeclaredIncomeTotal += difference;
      flags.push(flag('INCOME_IN_AIS_NOT_DECLARED', 'BLOCKER', `${categoryLabels[category]} in AIS is not fully declared`, `AIS reports ${formatRupees(reported)} from ${sources(entries)}, but only ${formatRupees(declared)} is entered as declared.`, 'Undeclared income can lead to a notice under section 143(1)(a) or a revised return.', 'Check the bank or company statement and declare the full amount under income from other sources.', { formSixteenValue: declared, aisValue: reported, difference, aisEntryIds: ids }, 'HIGH'));
      if (category === 'SAVINGS_INTEREST' && reported <= rules.caps['80TTA']) flags.push(flag('SAVINGS_INTEREST_BELOW_80TTA_CAP', 'INFO', 'Savings interest is within the old-regime 80TTA cap', 'It still needs to be declared, although 80TTA can offset it in the old regime.', 'Leaving it out still creates an AIS mismatch.', 'Declare the interest, then apply the eligible deduction.', { aisValue: reported, aisEntryIds: ids }, 'HIGH'));
    }
  }
  const sale = counted.filter((entry) => entry.category === 'SECURITIES_SALE');
  if (sale.length && input.declared.capitalGains.stcg111A + input.declared.capitalGains.ltcg112A === 0) flags.push(flag('SECURITIES_SALE_NO_CG_DECLARED', 'WARNING', 'AIS shows a securities sale but no capital gains', 'A sale is not necessarily a gain; the cost basis is needed to calculate it.', 'The sale can still trigger a question if no gains schedule is present.', 'Download the capital-gains statement from your broker and enter STCG/LTCG, even if the result is a loss.', { aisValue: sale.reduce((sum, entry) => sum + entry.amount, 0), aisEntryIds: sale.map((entry) => entry.id) }, 'MEDIUM'));
  const rent = counted.filter((entry) => entry.category === 'RENT_RECEIVED');
  if (rent.length && input.declared.houseProperty.kind !== 'letOut') flags.push(flag('RENT_RECEIVED_NO_HP_INCOME', 'WARNING', 'AIS shows rent received but no let-out property', 'Rent appears in AIS while no let-out property income was entered.', 'The mismatch can cause a follow-up.', 'Check whether this rent belongs to you and enter the property details if it does.', { aisValue: rent.reduce((sum, entry) => sum + entry.amount, 0), aisEntryIds: rent.map((entry) => entry.id) }, 'MEDIUM'));
  const otherTds = counted.filter((entry) => entry.sourceTan !== input.form16.employer.tan && entry.tdsCredited > 0);
  if (otherTds.length) flags.push(flag('TDS_ON_OTHER_INCOME', 'INFO', 'AIS shows TDS on non-salary income you can claim', `${formatRupees(otherTds.reduce((sum, entry) => sum + entry.tdsCredited, 0))} was deducted by ${sources(otherTds)}. This is not on Form 16.`, 'You may overpay tax or miss a refund.', 'Claim this TDS in the return schedule for TDS on income other than salary.', { aisValue: otherTds.reduce((sum, entry) => sum + entry.tdsCredited, 0), aisEntryIds: otherTds.map((entry) => entry.id) }, 'HIGH'));
  return { flags, undeclaredIncomeTotal };
}

function sources(entries: AisEntry[]): string { return [...new Set(entries.map((entry) => entry.source))].join(', '); }
function formatRupees(value: number): string { return `₹${Math.round(value).toLocaleString('en-IN')}`; }
