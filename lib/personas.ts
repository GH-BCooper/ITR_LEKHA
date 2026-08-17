import type { TaxInput } from './tax/types';
import { emptyInput } from './tax/compute';

function persona(name: string, description: string, input: TaxInput) { return { name, description, input }; }
export const personas = {
  aarav: persona('Aarav, 26', '₹9L salary, first job — the new regime wins and paperwork cannot improve it.', { ...emptyInput, age: 26, salary: { ...emptyInput.salary, gross: 900000, basic: 500000 }, deductions: { ...emptyInput.deductions, section80C: 100000 } }),
  priya: persona('Priya, 34', '₹18L salary, home loan, HRA and full 80C — deductions pay off.', { ...emptyInput, age: 34, salary: { ...emptyInput.salary, gross: 1800000, basic: 900000, hraReceived: 360000, rentPaid: 360000, city: 'Mumbai' }, houseProperty: { kind: 'selfOccupied', interestPaid: 200000 }, deductions: { ...emptyInput.deductions, section80C: 150000, section80CCD1B: 50000, section80Dself: 25000 } }),
  rohan: persona('Rohan, 41', '₹14L salary, FD interest and shares sold — reconciliation surfaces missing income.', { ...emptyInput, age: 41, salary: { ...emptyInput.salary, gross: 1400000, basic: 700000, hraReceived: 280000, rentPaid: 240000, city: 'Bengaluru' }, otherIncome: { ...emptyInput.otherIncome, depositInterest: 68000 }, capitalGains: { stcg111A: 100000, ltcg112A: 0 } })
} as const;
