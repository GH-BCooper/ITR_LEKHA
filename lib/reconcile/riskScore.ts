import type { Flag, RiskScore } from './types';

export function riskScore(flags: Flag[], undeclaredIncomeTotal: number, grossTotalIncome: number): RiskScore {
  const blockers = flags.filter((flagItem) => flagItem.severity === 'BLOCKER').length; const warnings = flags.filter((flagItem) => flagItem.severity === 'WARNING').length; // A TDS credit to claim is good news, not notice risk.
  const infos = flags.filter((flagItem) => flagItem.severity === 'INFO' && flagItem.code !== 'TDS_ON_OTHER_INCOME').length;
  const incomePoints = grossTotalIncome > 0 ? undeclaredIncomeTotal / grossTotalIncome * 40 : 0;
  const score = Math.min(100, Math.round(blockers * 30 + warnings * 10 + infos * 2 + incomePoints));
  const band: RiskScore['band'] = score === 0 ? 'Clean' : score <= 24 ? 'Low' : score <= 49 ? 'Moderate' : score <= 74 ? 'High' : 'Critical';
  return { score, band, contributions: [{ label: `${blockers} blockers`, points: blockers * 30 }, { label: `${warnings} warnings`, points: warnings * 10 }, { label: `${infos} information flags`, points: infos * 2 }, { label: 'Undeclared-income ratio', points: Math.round(incomePoints) }] };
}
