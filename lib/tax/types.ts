export type Regime = 'old' | 'new';
export type Residency = 'resident' | 'nonResident';
export type HouseProperty =
  | { kind: 'none' }
  | { kind: 'selfOccupied'; interestPaid: number }
  | { kind: 'letOut'; rentReceived: number; municipalTaxes: number; interestPaid: number };

export type Donation = { amount: number; percent: 50 | 100; hasQualifyingLimit: boolean };
export type TaxInput = {
  dateOfBirth?: string;
  age?: number;
  residency: Residency;
  salary: { gross: number; basic: number; da: number; hraReceived: number; rentPaid: number; city: string; otherExemptAllowances: number; employerNpsContribution: number };
  houseProperty: HouseProperty;
  otherIncome: { savingsInterest: number; depositInterest: number; dividends: number; familyPension: number };
  capitalGains: { stcg111A: number; ltcg112A: number };
  deductions: { section80C: number; section80CCD1B: number; section80Dself: number; selfOrSpouseSenior: boolean; section80Dparents: number; parentSenior: boolean; section80E: number; donations: Donation[]; section80DD: number; section80DDB: number; section80U: number; section80GG: number; professionalTax: number; section80CCH: number };
  tdsPaid: number;
};

export type DeductionLine = { key: string; label: string; entered: number; allowed: number; oldAllowed: boolean; newAllowed: boolean; note?: string };
export type Step = { number: number; label: string; section?: string; value: number; working: string; disallowed?: boolean };
export type TaxResult = {
  regime: Regime; steps: Step[]; grossTotalIncome: number; taxableIncome: number; totalIncomeForSurcharge: number;
  slabTax: number; specialTax: number; rebate: number; marginalRelief: number; surcharge: number; surchargeRelief: number; cess: number;
  totalTax: number; tdsPaid: number; balanceOrRefund: number; deductions: DeductionLine[]; hraExemption: number; housePropertyCarryForwardLoss: number;
};

export type Comparison = { old: TaxResult; new: TaxResult; winner: Regime | 'tie'; difference: number };
