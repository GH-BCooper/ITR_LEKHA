import { rules } from './rules';
import type { TaxInput } from './types';

export function hraExemption(input: TaxInput): { exemption: number; working: string } {
  const { hraReceived, rentPaid, basic, da, city } = input.salary;
  const salaryForHra = basic + da;
  const rentLessSalaryShare = Math.max(0, rentPaid - rules.rates.hraRentSalaryRatio * salaryForHra);
  const cityRatio = rules.cities.includes(city) ? rules.rates.hraMetro : rules.rates.hraNonMetro;
  const cityLimit = cityRatio * salaryForHra;
  const exemption = Math.max(0, Math.min(hraReceived, rentLessSalaryShare, cityLimit));
  return { exemption, working: `min(HRA received ₹${hraReceived}, rent less 10% salary ₹${rentLessSalaryShare}, city limit ₹${cityLimit})` };
}
