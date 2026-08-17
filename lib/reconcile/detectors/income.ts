import { rules } from '@/lib/tax/rules';
import type { AisEntry, Flag, ReconciliationInput } from '../types';
import { declaredAmount, flag, materiality } from './helpers';

export function incomeFlags(input: ReconciliationInput, duplicateEntryIds: string[]): { flags: Flag[]; undeclaredIncomeTotal: number } {
  const flags: Flag[] = []; let undeclaredIncomeTotal = 0;
  for (const entry of input.ais.entries) {
    if (duplicateEntryIds.includes(entry.id) || entry.category === 'SALARY' || entry.category === 'SECURITIES_SALE' || entry.category === 'RENT_RECEIVED') continue;
    const difference = entry.amount - declaredAmount(input, entry.category);
    if (difference > materiality()) {
      undeclaredIncomeTotal += difference;
      flags.push(flag('INCOME_IN_AIS_NOT_DECLARED', 'BLOCKER', `${entry.category.replaceAll('_', ' ').toLowerCase()} appears in AIS`, 'AIS has income that is not reflected in the entered return figures.', 'Undeclared income can lead to a notice or an amended return.', 'Reconcile this entry with your statement and include it if it is yours.', { aisValue: entry.amount, difference, aisEntryIds: [entry.id] }, 'HIGH'));
      if (entry.category === 'SAVINGS_INTEREST' && entry.amount <= rules.caps['80TTA']) flags.push(flag('SAVINGS_INTEREST_BELOW_80TTA_CAP', 'INFO', 'Savings interest is within the old-regime interest deduction cap', 'It still needs to be declared, although 80TTA may offset it in the old regime.', 'Leaving it out still creates an AIS mismatch.', 'Declare the interest, then apply the eligible deduction.', { aisValue: entry.amount, aisEntryIds: [entry.id] }, 'HIGH'));
    }
  }
  const sale = input.ais.entries.filter((entry) => entry.category === 'SECURITIES_SALE');
  if (sale.length && input.declared.capitalGains.stcg111A + input.declared.capitalGains.ltcg112A === 0) flags.push(flag('SECURITIES_SALE_NO_CG_DECLARED', 'WARNING', 'AIS shows a securities sale but no capital gains', 'A sale is not necessarily a gain; the cost basis is needed to calculate it.', 'The sale can still trigger a question if no gains schedule is present.', 'Find the contract note and cost basis before entering the gain.', { aisValue: sale.reduce((sum, entry) => sum + entry.amount, 0), aisEntryIds: sale.map((entry) => entry.id) }, 'MEDIUM'));
  const rent = input.ais.entries.filter((entry) => entry.category === 'RENT_RECEIVED');
  if (rent.length && input.declared.houseProperty.kind === 'none') flags.push(flag('RENT_RECEIVED_NO_HP_INCOME', 'WARNING', 'AIS shows rent received but no house property income', 'Rent appears in AIS while no let-out property income was entered.', 'The mismatch can cause a follow-up.', 'Check whether this rent belongs to you and enter the property details if it does.', { aisValue: rent.reduce((sum, entry) => sum + entry.amount, 0), aisEntryIds: rent.map((entry) => entry.id) }, 'MEDIUM'));
  return { flags, undeclaredIncomeTotal };
}
