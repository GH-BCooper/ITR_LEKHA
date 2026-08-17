import type { Flag, ReconciliationInput } from '../types';
import { flag } from './helpers';

export function duplicateFlags(input: ReconciliationInput): { flags: Flag[]; duplicateEntryIds: string[] } {
  const seen = new Map<string, string>(); const duplicates: string[] = []; const flags: Flag[] = [];
  for (const entry of input.ais.entries) {
    const key = `${entry.category}|${entry.source}|${entry.amount}`; const first = seen.get(key);
    if (first) { duplicates.push(entry.id); flags.push(flag('PROBABLE_DUPLICATE_AIS_ENTRY', 'INFO', 'Probable duplicate AIS entry', 'Two AIS entries have the same category, source and amount.', 'Counting it twice can overstate income.', 'Check AIS feedback or the source statement before treating it as additional income.', { aisValue: entry.amount, aisEntryIds: [first, entry.id] }, 'MEDIUM')); } else seen.set(key, entry.id);
  }
  return { flags, duplicateEntryIds: duplicates };
}
