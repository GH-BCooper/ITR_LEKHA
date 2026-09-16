'use client';

/** Whole-rupee input: accepts "12,00,000" or "₹1200000", shows Indian digit grouping. */
export function MoneyField({ label, value, onChange, hint, className }: { label: string; value: number; onChange: (value: number) => void; hint?: string; className?: string }) {
  return <label className={className}>{label}
    <span className="money"><input inputMode="numeric" autoComplete="off" placeholder="0" value={value ? value.toLocaleString('en-IN') : ''} onChange={(event) => onChange(Math.min(1_000_000_000, Number(event.target.value.replace(/[^0-9]/g, '')) || 0))} /></span>
    {hint && <span className="hint">{hint}</span>}
  </label>;
}
