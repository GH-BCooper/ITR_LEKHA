import type { TaxInput } from '@/lib/tax/types';

export type AisCategory = 'SALARY' | 'SAVINGS_INTEREST' | 'FD_INTEREST' | 'DIVIDEND' | 'SECURITIES_SALE' | 'RENT_RECEIVED';
export type Form16 = { documentType: 'FORM16'; assessmentYear: string; pan: string; employer: { name: string; tan: string }; salary: { gross: number; basic: number; da: number; hraReceived: number; exemptAllowances: number; employerNpsContribution: number }; deductionsConsidered: Record<string, number>; tdsQuarterly: { quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; amount: number; depositedOn: string }[]; totalTds: number };
export type AisEntry = { id: string; category: AisCategory; source: string; sourceTan?: string; amount: number; tdsCredited: number; note?: string };
export type Ais = { documentType: 'AIS'; assessmentYear: string; pan: string; entries: AisEntry[] };
export type FlagCode = 'TDS_CLAIMED_EXCEEDS_CREDITED' | 'TDS_CREDITED_NOT_CLAIMED' | 'INCOME_IN_AIS_NOT_DECLARED' | 'PROBABLE_DUPLICATE_AIS_ENTRY' | 'SALARY_MISMATCH' | 'TAN_MISMATCH' | 'PAN_MISMATCH' | 'ASSESSMENT_YEAR_MISMATCH' | 'SECURITIES_SALE_NO_CG_DECLARED' | 'RENT_RECEIVED_NO_HP_INCOME' | 'SAVINGS_INTEREST_BELOW_80TTA_CAP' | 'QUARTERLY_TDS_SUM_MISMATCH' | 'TDS_DEPOSITED_LATE' | 'TDS_ON_OTHER_INCOME';
export type Flag = { id: string; severity: 'BLOCKER' | 'WARNING' | 'INFO'; code: FlagCode; title: string; whatItMeans: string; ifIgnored: string; suggestedAction: string; evidence: { formSixteenValue?: number; aisValue?: number; difference?: number; aisEntryIds?: string[] }; confidence: 'HIGH' | 'MEDIUM' | 'LOW' };
export type ReconciliationInput = { form16: Form16; ais: Ais; declared: TaxInput };
export type ReconciliationResult = { flags: Flag[]; duplicateEntryIds: string[]; undeclaredIncomeTotal: number; risk: RiskScore };
export type RiskScore = { score: number; band: 'Clean' | 'Low' | 'Moderate' | 'High' | 'Critical'; contributions: { label: string; points: number }[] };
