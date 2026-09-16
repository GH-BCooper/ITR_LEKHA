import { inr } from '@/lib/format/inr';
import type { Comparison, TaxResult } from '@/lib/tax/types';

function Regime({ name, result, win }: { name: string; result: TaxResult; win: boolean }) {
  return <div className={`regime ${win ? 'win' : ''}`}>
    <div className="label"><span>{name}</span>{win && <span className="badge">Lower</span>}</div>
    <div className="amount">{inr(result.totalTax)}</div>
    <div className="sub">Taxable {inr(result.taxableIncome)}</div>
    {result.tdsPaid > 0 && <div className="sub">{result.balanceOrRefund >= 0 ? `Pay ${inr(result.balanceOrRefund)} after TDS` : `Refund ${inr(-result.balanceOrRefund)}`}</div>}
  </div>;
}

export function Verdict({ comparison, children }: { comparison: Comparison; children?: React.ReactNode }) {
  const empty = comparison.old.grossTotalIncome === 0 && comparison.new.grossTotalIncome === 0 && comparison.old.specialTax === 0;
  return <div className="verdict" aria-live="polite">
    <span className="eyebrow">Your result</span>
    <p className="verdict-title">{empty ? 'Enter your income to begin' : comparison.winner === 'tie' ? 'Both regimes cost the same' : <>{comparison.winner === 'new' ? 'New' : 'Old'} regime saves <span className="figure">{inr(comparison.difference)}</span></>}</p>
    <div className="regime-pair"><Regime name="Old regime" result={comparison.old} win={comparison.winner === 'old'} /><Regime name="New regime" result={comparison.new} win={comparison.winner === 'new'} /></div>
    {children}
  </div>;
}
