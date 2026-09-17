import type { Metadata } from 'next';
import Link from 'next/link';
import rules from '@/data/tax-rules/fy-2025-26.json';
import { inr } from '@/lib/format/inr';

export const metadata: Metadata = { title: 'Methodology', description: 'The FY 2025-26 rates, caps and assumptions Lekha uses.' };

type Slab = { upTo: number | null; rate: number };
function SlabTable({ slabs, caption }: { slabs: Slab[]; caption: string }) {
  return <div className="table-wrap"><table className="ledger"><caption className="sr-only" style={{ position: 'absolute', left: -10000 }}>{caption}</caption><thead><tr><th>Taxable income</th><th className="number">Rate</th></tr></thead><tbody>{slabs.map((slab, index) => {
    const from = index === 0 ? 0 : slabs[index - 1].upTo ?? 0;
    return <tr key={index}><td className="figure">{slab.upTo === null ? `Above ${inr(from)}` : `${inr(from)} – ${inr(slab.upTo)}`}</td><td className="number">{Math.round(slab.rate * 100)}%</td></tr>;
  })}</tbody></table></div>;
}

const oldSlabs: Slab[] = [{ upTo: rules.oldRegime.basicExemptions.under60, rate: 0 }, { upTo: 500000, rate: 0.05 }, { upTo: 1000000, rate: 0.2 }, { upTo: null, rate: 0.3 }];

export default function MethodologyPage() {
  const caps: [string, string][] = [
    ['Standard deduction', `${inr(rules.newRegime.standardDeduction)} new · ${inr(rules.oldRegime.standardDeduction)} old`],
    ['87A rebate', `Up to ${inr(rules.newRegime.rebateCap)} if total income ≤ ${inr(rules.newRegime.rebateThreshold)} (new); ${inr(rules.oldRegime.rebateCap)} if ≤ ${inr(rules.oldRegime.rebateThreshold)} (old)`],
    ['80C', inr(rules.caps['80C'])], ['80CCD(1B)', inr(rules.caps['80CCD1B'])],
    ['80CCD(2) employer NPS', `${rules.rates.employerNpsRate * 100}% of basic + DA (new) · ${rules.rates.employerNpsRateOld * 100}% (old)`],
    ['80D', `${inr(rules.caps['80DNormal'])} each for self and parents; ${inr(rules.caps['80DSenior'])} if senior`],
    ['80TTA / 80TTB', `${inr(rules.caps['80TTA'])} under 60 · ${inr(rules.caps['80TTB'])} for seniors`],
    ['Self-occupied home-loan interest', `${inr(rules.caps.selfOccupiedInterest)} (old regime only)`],
    ['HRA', `Least of HRA received, rent − 10% of basic + DA, and ${rules.rates.hraMetro * 100}% (metro) or ${rules.rates.hraNonMetro * 100}% of basic + DA. Metro: ${rules.cities.join(', ')}`],
    ['Capital gains', `STCG 111A ${rules.rates.stcg111A * 100}% · LTCG 112A ${rules.rates.ltcg112A * 100}% above ${inr(rules.rates.ltcg112AExemption)}; surcharge on these capped at 15%`],
    ['80G donations', `50% or 100% of the donation; "qualifying limit" donations capped at ${rules.caps['80GQualifyingRatio'] * 100}% of gross total income`],
    ['80DD / 80U', `Flat ${inr(rules.caps.disability)}, or ${inr(rules.caps.severeDisability)} for severe disability`],
    ['80DDB', `${inr(rules.caps.specifiedIllness)}, or ${inr(rules.caps.specifiedIllnessSenior)} for seniors`],
    ['Cess', `${rules.rates.cess * 100}% on tax plus surcharge`]
  ];
  return <>
    <div className="page-head"><span className="eyebrow">Methodology</span><h1>The rules behind every figure</h1><p className="lead">FY {rules.financialYear}, AY {rules.assessmentYear}. Last verified {new Date(rules.lastVerified).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. {rules.sourceNote}</p></div>
    <div className="two">
      <section><h2>New regime (default)</h2><SlabTable slabs={rules.newRegime.slabs} caption="New-regime slabs" /></section>
      <section><h2>Old regime (under 60)</h2><SlabTable slabs={oldSlabs} caption="Old-regime slabs" /><p className="muted small" style={{ marginTop: 8 }}>Basic exemption rises to {inr(rules.oldRegime.basicExemptions.senior)} at 60 and {inr(rules.oldRegime.basicExemptions.superSenior)} at 80.</p></section>
    </div>
    <section className="section"><h2>Limits and rates used</h2><div className="table-wrap"><table className="ledger"><tbody>{caps.map(([name, value]) => <tr key={name}><td style={{ width: '32%' }}><strong>{name}</strong></td><td>{value}</td></tr>)}</tbody></table></div></section>
    <div className="grid section">
      <section className="card"><h2>How it works</h2><ul className="clean small">
        <li>All tax and reconciliation logic is deterministic TypeScript that runs in your browser. Nothing you type is stored on a server.</li>
        <li>Taxable income and final tax are rounded to the nearest ₹10 (sections 288A and 288B).</li>
        <li>The optional AI explanation only rephrases already-computed facts. Any reply containing a number that is not in the ledger is thrown away.</li>
        <li>Reconciliation uses structured JSON rather than PDF parsing, because silent extraction errors are unacceptable in a tax tool.</li>
      </ul></section>
      <section className="card"><h2>Judgement calls</h2><ul className="clean small">
        <li><strong>87A marginal relief with capital gains.</strong> Rebate eligibility uses total income including 111A/112A gains. Just above ₹12,00,000, relief caps only the slab-rate tax at the income over the limit; tax on special-rate gains is never rebated or relieved. How relief interacts with special-rate income is not settled, so treat results in that narrow band with care.</li>
        <li><strong>Surcharge marginal relief.</strong> Tax at the threshold keeps your capital gains and trims slab income first.</li>
        <li><strong>80G qualifying limit.</strong> Uses gross total income rather than adjusted gross total income, which can slightly overstate the limit when you have other deductions.</li>
        <li><strong>Break-even.</strong> Treats HRA, other exemptions, home-loan interest and Chapter VI-A as one pool of deductions.</li>
      </ul></section>
      <section className="card"><h2>Not handled</h2><ul className="clean small">
        <li>Business or professional income, including presumptive taxation.</li>
        <li>Foreign income, foreign assets, DTAA or crypto/VDA.</li>
        <li>Clubbing, revised or belated returns, and interest under 234A/B/C.</li>
        <li>Capital gains other than listed equity under 111A and 112A.</li>
      </ul></section>
    </div>
    <p className="section"><Link className="button" href="/compare">Compare your figures</Link></p>
  </>;
}
