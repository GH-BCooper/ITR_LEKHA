'use client';
import { inr } from '@/lib/format/inr';
import type { BreakEvenResult } from '@/lib/tax/breakEven';

export function BreakEven({ result, amount, onAmount, exploredTax, newTax }: { result: BreakEvenResult; amount: number; onAmount: (value: number) => void; exploredTax: number; newTax: number }) {
  const max = Math.max(result.realisticCeiling, result.breakEvenExists ? result.breakEvenDeductions : 0, amount, 100000);
  const axisMax = Math.ceil(max * 1.15 / 10000) * 10000;
  return <section className="card section" aria-labelledby="breakeven-title">
    <h2 id="breakeven-title">What if you claimed more deductions?</h2>
    {result.breakEvenExists
      ? <p>The old regime matches the new regime once HRA, home-loan interest and deductions reach <strong className="figure">{inr(result.breakEvenDeductions)}</strong>. You have <span className="figure">{inr(result.currentDeductions)}</span> today — {result.gap <= 0 ? <>already past it by <span className="figure">{inr(-result.gap)}</span>.</> : <><span className="figure">{inr(result.gap)}</span> short.</>}</p>
      : <p>At your income, the new regime wins even with 80C and NPS maxed out. Extra tax-saving investments will not beat it this year.</p>}
    {result.breakEvenExists && result.exceedsRealisticCeiling && <p className="notice small">That break-even is above the {inr(result.realisticCeiling)} you could reach by maxing 80C and 80CCD(1B), so it is unlikely to be practical.</p>}
    <div className="range-line" style={{ marginTop: 12 }}>
      <div>
        <input aria-label="Explore old-regime deductions" type="range" min="0" max={axisMax} step="1000" value={Math.min(axisMax, amount)} onChange={(event) => onAmount(Number(event.target.value))} style={{ width: '100%' }} />
        <div className="axis"><span>₹0</span><span>{inr(axisMax)}</span></div>
      </div>
      <label>Total deductions to try<span className="money"><input inputMode="numeric" value={amount ? amount.toLocaleString('en-IN') : ''} placeholder="0" onChange={(event) => onAmount(Math.min(1_000_000_000, Number(event.target.value.replace(/\D/g, '')) || 0))} /></span></label>
    </div>
    <p className="info small" style={{ marginTop: 14, marginBottom: 0 }}>At the explored amount of <span className="figure">{inr(amount)}</span>, old-regime tax would be <strong className="figure">{inr(exploredTax)}</strong> against <span className="figure">{inr(newTax)}</span> in the new regime{exploredTax < newTax ? ` — the old regime would save ${inr(newTax - exploredTax)}.` : exploredTax === newTax ? ' — the same.' : '.'}</p>
  </section>;
}
