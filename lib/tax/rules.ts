import rawRules from '@/data/tax-rules/fy-2025-26.json';

export type Slab = { upTo: number | null; rate: number };
export type SurchargeRate = { threshold: number; rate: number };
export type TaxRules = typeof rawRules;
export const rules: TaxRules = rawRules;
