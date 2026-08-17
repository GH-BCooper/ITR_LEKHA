import { describe, expect, it } from 'vitest';
import formJson from '@/data/samples/form16.sample.json';
import aisJson from '@/data/samples/ais.sample.json';
import { emptyInput } from '@/lib/tax/compute';
import { reconcile } from '@/lib/reconcile/reconcile';
import { documentFlags } from '@/lib/reconcile/detectors/document';
import { duplicateFlags } from '@/lib/reconcile/detectors/duplicates';
import { incomeFlags } from '@/lib/reconcile/detectors/income';
import { tdsIntegrityFlags } from '@/lib/reconcile/detectors/tds';
import { riskScore } from '@/lib/reconcile/riskScore';
import type { ReconciliationInput } from '@/lib/reconcile/types';

function sample(): ReconciliationInput { return structuredClone({ form16: formJson, ais: aisJson, declared: { ...emptyInput, salary: { ...emptyInput.salary, gross: 1450000 } } }) as ReconciliationInput; }

describe('reconciliation detectors', () => {
  it('finds the deliberately seeded sample problems and excludes the duplicate from income', () => {
    const result = reconcile(sample());
    expect(result.flags.some((item) => item.code === 'TDS_CLAIMED_EXCEEDS_CREDITED')).toBe(true);
    expect(result.flags.filter((item) => item.code === 'INCOME_IN_AIS_NOT_DECLARED')).toHaveLength(3);
    expect(result.flags.some((item) => item.code === 'PROBABLE_DUPLICATE_AIS_ENTRY')).toBe(true);
    expect(result.flags.some((item) => item.code === 'SECURITIES_SALE_NO_CG_DECLARED')).toBe(true);
    expect(result.flags.some((item) => item.code === 'RENT_RECEIVED_NO_HP_INCOME')).toBe(true);
    expect(result.undeclaredIncomeTotal).toBe(91600); expect(result.risk.band).toBe('Critical');
  });
  it('handles clean and threshold document data plus every document mismatch', () => {
    const clean = sample(); clean.ais.entries = [clean.ais.entries[0]]; clean.form16.totalTds = 88000; clean.form16.tdsQuarterly = [{ quarter: 'Q1', amount: 88000, depositedOn: '2025-07-07' }];
    expect(documentFlags(clean)).toEqual([]);
    const mismatched = sample(); mismatched.ais.pan = 'OTHER'; mismatched.ais.assessmentYear = '2025-26'; mismatched.ais.entries[0].sourceTan = 'NOPE'; mismatched.form16.tdsQuarterly[0].amount = 1;
    const codes = documentFlags(mismatched).map((item) => item.code); expect(codes).toContain('PAN_MISMATCH'); expect(codes).toContain('ASSESSMENT_YEAR_MISMATCH'); expect(codes).toContain('TAN_MISMATCH');
    const overCredit = sample(); overCredit.ais.entries[0].tdsCredited = 9011; overCredit.form16.totalTds = 9000; expect(documentFlags(overCredit).some((item) => item.code === 'TDS_CREDITED_NOT_CLAIMED')).toBe(true);
  });
  it('detects duplicate, below-cap savings, sale, rent and TDS integrity boundaries', () => {
    const value = sample(); const duplicates = duplicateFlags(value); expect(duplicates.duplicateEntryIds).toEqual(['A6']);
    const low = sample(); low.ais.entries = [{ id: 'S', category: 'SAVINGS_INTEREST', source: 'Bank', amount: 9000, tdsCredited: 0 }]; const income = incomeFlags(low, []); expect(income.flags.map((item) => item.code)).toContain('SAVINGS_INTEREST_BELOW_80TTA_CAP');
    const tds = sample(); tds.form16.totalTds = 1; tds.form16.tdsQuarterly[0].depositedOn = '2025-07-08'; expect(tdsIntegrityFlags(tds).map((item) => item.code)).toEqual(expect.arrayContaining(['QUARTERLY_TDS_SUM_MISMATCH', 'TDS_DEPOSITED_LATE']));
  });
  it('makes risk score transparent in every band', () => {
    expect(riskScore([], 0, 1).band).toBe('Clean'); expect(riskScore([{ severity: 'WARNING' } as never], 0, 1).band).toBe('Low'); expect(riskScore([{ severity: 'BLOCKER' } as never, { severity: 'BLOCKER' } as never], 0, 1).band).toBe('High');
  });
});
