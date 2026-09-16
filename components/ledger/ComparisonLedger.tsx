'use client';
import { useState } from 'react';
import { inr } from '@/lib/format/inr';
import type { Comparison } from '@/lib/tax/types';

// Headline rows stay visible even when zero, so the ledger always reads top to bottom.
const alwaysShown = new Set([1, 7, 9, 17, 18]);

export function ComparisonLedger({ comparison, title = 'Line-by-line working' }: { comparison: Comparison; title?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const winnerColumn = comparison.winner === 'tie' ? null : comparison.winner;
  const rows = comparison.old.steps.map((oldStep, index) => ({ oldStep, newStep: comparison.new.steps[index], index }));
  const visible = showAll ? rows : rows.filter(({ oldStep, newStep }) => alwaysShown.has(oldStep.number) || oldStep.value !== 0 || newStep.value !== 0);
  const hidden = rows.length - visible.length;

  return <section aria-labelledby="ledger-title" className="section">
    <div className="actions" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
      <div><h2 id="ledger-title" style={{ marginBottom: 2 }}>{title}</h2><p className="muted small" style={{ margin: 0 }}>Select a row to see how it was computed.</p></div>
      {(hidden > 0 || showAll) && <button className="button ghost" onClick={() => setShowAll(!showAll)}>{showAll ? 'Hide zero rows' : `Show all ${rows.length} steps`}</button>}
    </div>
    <div className="table-wrap">
      <table className="ledger">
        <thead><tr><th>Step</th><th className={`number ${winnerColumn === 'old' ? 'winner' : ''}`}>Old regime</th><th className={`number ${winnerColumn === 'new' ? 'winner' : ''}`}>New regime</th></tr></thead>
        <tbody>{visible.map(({ oldStep, newStep, index }) => {
          const expanded = open === index;
          return <tr key={oldStep.number} className={oldStep.number === 17 ? 'total' : undefined}>
            <td>
              <button className="row-button" onClick={() => setOpen(expanded ? null : index)} aria-expanded={expanded}><span className="chev" aria-hidden="true">▶</span><span>{oldStep.label} {oldStep.section && <span className="section-tag">{oldStep.section}</span>}</span></button>
              {expanded && <div className="working fade-in"><span><strong>Old:</strong> {oldStep.working}</span><span><strong>New:</strong> {newStep.working}</span></div>}
            </td>
            <td className={`number ${winnerColumn === 'old' ? 'winner' : ''}`}>{inr(oldStep.value)}</td>
            <td className={`number ${winnerColumn === 'new' ? 'winner' : ''}`}>{newStep.disallowed && oldStep.value !== 0 ? <><span className="strike">{inr(oldStep.value)}</span><br /><small className="muted">not allowed</small></> : inr(newStep.value)}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}
