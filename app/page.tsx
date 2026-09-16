import Link from 'next/link';
import { Verdict } from '@/components/ledger/Verdict';
import { compareRegimes } from '@/lib/tax/compute';
import { personas } from '@/lib/personas';
import { inr } from '@/lib/format/inr';

const features = [
  { icon: '⇄', title: 'Both regimes, every line', text: 'Salary exemptions, 80C to 80U, home loans, capital gains, 87A rebate, marginal relief, surcharge and cess — shown step by step.' },
  { icon: '◎', title: 'Your break-even point', text: 'See exactly how much you would need to claim before the old regime beats the new one, and whether that is realistic.' },
  { icon: '✓', title: 'Form 16 vs AIS check', text: 'Catch unreported interest, missing TDS credits, duplicate AIS entries and PAN or TAN errors before a notice does.' }
];

export default function LandingPage() {
  const example = personas.priya;
  const comparison = compareRegimes(example.input);
  return <>
    <section className="hero">
      <div>
        <span className="eyebrow">FY 2025-26 · AY 2026-27</span>
        <h1>Know which tax regime saves you more — and why.</h1>
        <p className="lead">Lekha compares the old and new regimes line by line, then checks Form 16 against AIS so your return matches what the tax department already knows. Everything runs in your browser.</p>
        <div className="actions" style={{ marginTop: 20 }}><Link className="button" href="/compare">Compare my tax</Link><Link className="button secondary" href="/reconcile">Check Form 16 &amp; AIS</Link></div>
      </div>
      <div>
        <Verdict comparison={comparison}><p className="muted small" style={{ margin: '12px 0 0' }}>Example: {example.description}</p></Verdict>
      </div>
    </section>

    <section className="grid section">{features.map((feature) => <div className="card feature" key={feature.title}><span className="icon" aria-hidden="true">{feature.icon}</span><h3>{feature.title}</h3><p className="muted small" style={{ margin: 0 }}>{feature.text}</p></div>)}</section>

    <section className="section">
      <h2>Start from a real scenario</h2>
      <div className="grid">{Object.entries(personas).map(([key, item]) => {
        const result = compareRegimes(item.input);
        return <article className="card persona" key={key}>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
          <p className="figure small" style={{ flex: 0 }}>Old {inr(result.old.totalTax)} · New {inr(result.new.totalTax)}</p>
          <Link className="button secondary" href={`/compare?persona=${key}`}>Load {item.name.split(',')[0]}</Link>
        </article>;
      })}</div>
    </section>

    <p className="section muted small">No sign-up, no uploads to a server, no filing. <Link href="/methodology">Read the rules and limitations</Link>.</p>
  </>;
}
