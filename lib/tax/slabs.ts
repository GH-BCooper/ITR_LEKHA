import { rules } from './rules';
import type { Regime } from './types';

export function ageOnFinancialYear(input: { age?: number; dateOfBirth?: string }): number {
  if (input.age !== undefined) return input.age;
  if (!input.dateOfBirth) return 0;
  const dob = new Date(`${input.dateOfBirth}T00:00:00`);
  // A person who turns 60 at any time in FY is a senior citizen for the whole FY.
  const fyEnd = new Date('2026-03-31T00:00:00');
  return fyEnd.getFullYear() - dob.getFullYear() - (fyEnd < new Date(fyEnd.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
}

export function oldSlabs(age: number): { upTo: number | null; rate: number }[] {
  const exemption = age >= 80 ? rules.oldRegime.basicExemptions.superSenior : age >= 60 ? rules.oldRegime.basicExemptions.senior : rules.oldRegime.basicExemptions.under60;
  if (age >= 80) return [{ upTo: exemption, rate: 0 }, { upTo: 1000000, rate: 0.2 }, { upTo: null, rate: 0.3 }];
  return [{ upTo: exemption, rate: 0 }, { upTo: 500000, rate: 0.05 }, { upTo: 1000000, rate: 0.2 }, { upTo: null, rate: 0.3 }];
}

export function slabTax(income: number, regime: Regime, age: number): number {
  const slabs = regime === 'new' ? rules.newRegime.slabs : oldSlabs(age);
  let tax = 0; let lower = 0;
  for (const slab of slabs) {
    const upper = slab.upTo ?? income;
    const amount = Math.max(0, Math.min(income, upper) - lower);
    tax += amount * slab.rate;
    lower = upper;
    if (income <= upper) break;
  }
  return tax;
}
