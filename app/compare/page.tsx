'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BreakEven } from '@/components/ledger/BreakEven';
import { ComparisonLedger } from '@/components/ledger/ComparisonLedger';
import { Verdict } from '@/components/ledger/Verdict';
import { MoneyField } from '@/components/MoneyField';
import { explainComparison, explainInDetail } from '@/lib/explain/ruleBased';
import { personas } from '@/lib/personas';
import { findBreakEven } from '@/lib/tax/breakEven';
import { compareRegimes, emptyInput, oldTaxAtDeductions } from '@/lib/tax/compute';
import { normalizeInput } from '@/lib/tax/normalize';
import type { TaxInput } from '@/lib/tax/types';

const cities = ['Other', 'Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad', 'Pune', 'Ahmedabad'];
const tabs = ['About you', 'Income', 'Deductions'];

function initialInput(personaKey: string | null, serialized: string | null): TaxInput {
  if (serialized) { try { return normalizeInput(JSON.parse(serialized)); } catch { /* malformed link: fall through to a safe default */ } }
  return personaKey && personaKey in personas ? structuredClone(personas[personaKey as keyof typeof personas].input) : structuredClone(emptyInput);
}

function CompareContent() {
  const params = useSearchParams();
  const personaKey = params.get('persona');
  const [input, setInput] = useState<TaxInput>(() => initialInput(personaKey, params.get('state')));
  const [step, setStep] = useState(0);
  const [explore, setExplore] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState('');
  const [narration, setNarration] = useState<{ text: string; enhanced: boolean } | null>(null);
  const [narrating, setNarrating] = useState(false);
  const comparison = useMemo(() => compareRegimes(input), [input]);
  const breakEven = useMemo(() => findBreakEven(input), [input]);
  const details = useMemo(() => explainInDetail(input, comparison, breakEven), [input, comparison, breakEven]);
  const exploreAmount = explore ?? breakEven.currentDeductions;
  const exploredTax = useMemo(() => oldTaxAtDeductions(input, exploreAmount), [input, exploreAmount]);
  const personaName = personaKey && personaKey in personas && !params.get('state') ? personas[personaKey as keyof typeof personas].name : null;

  useEffect(() => { window.history.replaceState(null, '', `${window.location.pathname}?state=${encodeURIComponent(JSON.stringify(input))}`); setNarration(null); }, [input]);

  function update(patch: (current: TaxInput) => TaxInput) { setInput(patch); setNotice(''); }
  const salary = (key: keyof TaxInput['salary'], value: number | string) => update((current) => ({ ...current, salary: { ...current.salary, [key]: value } }));
  const deduction = (key: keyof TaxInput['deductions'], value: number | boolean) => update((current) => ({ ...current, deductions: { ...current.deductions, [key]: value } }));
  const other = (key: keyof TaxInput['otherIncome'], value: number) => update((current) => ({ ...current, otherIncome: { ...current.otherIncome, [key]: value } }));
  const gains = (key: keyof TaxInput['capitalGains'], value: number) => update((current) => ({ ...current, capitalGains: { ...current.capitalGains, [key]: value } }));
  const letOut = (patch: Partial<{ rentReceived: number; municipalTaxes: number; interestPaid: number }>) => update((current) => {
    const base = current.houseProperty.kind === 'letOut' ? current.houseProperty : { kind: 'letOut' as const, rentReceived: 0, municipalTaxes: 0, interestPaid: 0 };
    return { ...current, houseProperty: { ...base, ...patch } };
  });

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ generatedBy: 'Lekha', financialYear: '2025-26', input, verdict: explainComparison(comparison), oldRegime: comparison.old, newRegime: comparison.new, breakEven }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'lekha-regime-summary.json'; link.click(); URL.revokeObjectURL(url);
    setNotice('Summary downloaded as lekha-regime-summary.json.');
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setNotice('Link copied. Anyone with it sees these figures — nothing is stored on a server.'); }
    catch { setNotice('Could not access the clipboard. Copy the address bar instead.'); }
  }
  async function narrate() {
    setNarrating(true);
    try {
      const response = await fetch('/api/explain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ facts: details.join(' ') }) });
      const data = await response.json() as { explanation?: string; enhanced?: boolean };
      setNarration({ text: data.explanation ?? details.join(' '), enhanced: Boolean(data.enhanced) });
    } catch { setNarration({ text: details.join(' '), enhanced: false }); }
    finally { setNarrating(false); }
  }

  const hp = input.houseProperty;
  return <>
    <div className="page-head"><span className="eyebrow">FY 2025-26 · AY 2026-27</span><h1>Compare tax regimes</h1><p className="lead">Enter what you earn and what you can claim. Both regimes update as you type{personaName ? <> — loaded with <strong>{personaName}</strong>’s figures</> : ''}.</p></div>
    <div className="split">
      <section className="card" aria-label="Your figures">
        <div className="tabs" role="tablist">{tabs.map((name, index) => <button key={name} role="tab" id={`tab-${index}`} aria-controls="tab-panel" aria-selected={step === index} className="tab" onClick={() => setStep(index)}><span className="num">{index + 1}</span>{name}</button>)}</div>
        <p className="muted small" style={{ marginTop: -8 }}>Step {step + 1} of 3</p>
        <div role="tabpanel" id="tab-panel" aria-labelledby={`tab-${step}`} className="fade-in" key={step}>
          {step === 0 && <div className="form-grid">
            <label>Age during the year<input type="number" min="0" max="120" value={input.age ?? ''} onChange={(event) => update((current) => ({ ...current, age: Math.min(120, Math.max(0, Number(event.target.value) || 0)) }))} /><span className="hint">60+ and 80+ get higher old-regime exemptions.</span></label>
            <label>Residency<select value={input.residency} onChange={(event) => update((current) => ({ ...current, residency: event.target.value as TaxInput['residency'] }))}><option value="resident">Resident</option><option value="nonResident">Non-resident</option></select><span className="hint">Only residents get the 87A rebate.</span></label>
            <label className="full">City you rent in<select value={input.salary.city} onChange={(event) => salary('city', event.target.value)}>{cities.map((city) => <option key={city}>{city}</option>)}</select><span className="hint">For HRA, only Delhi, Mumbai, Kolkata and Chennai count as metro (50% of basic). Everywhere else, including Bengaluru, is 40%.</span></label>
            <MoneyField className="full" label="TDS already deducted" hint="From Form 16 and bank TDS certificates — used to show refund or balance due." value={input.tdsPaid} onChange={(value) => update((current) => ({ ...current, tdsPaid: value }))} />
          </div>}
          {step === 1 && <>
            <fieldset className="group"><legend>Salary</legend><div className="form-grid">
              <MoneyField label="Gross salary (annual)" value={input.salary.gross} onChange={(value) => salary('gross', value)} />
              <MoneyField label="Basic salary" value={input.salary.basic} onChange={(value) => salary('basic', value)} hint="Drives HRA and employer-NPS limits." />
              <MoneyField label="Dearness allowance (DA)" value={input.salary.da} onChange={(value) => salary('da', value)} />
              <MoneyField label="HRA received" value={input.salary.hraReceived} onChange={(value) => salary('hraReceived', value)} />
              <MoneyField label="Rent paid (annual)" value={input.salary.rentPaid} onChange={(value) => salary('rentPaid', value)} />
              <MoneyField label="Other exempt allowances" value={input.salary.otherExemptAllowances} onChange={(value) => salary('otherExemptAllowances', value)} hint="LTA and similar; old regime only." />
              <MoneyField label="Employer NPS contribution" value={input.salary.employerNpsContribution} onChange={(value) => salary('employerNpsContribution', value)} hint="80CCD(2): 14% of basic + DA (new), 10% (old)." />
            </div></fieldset>
            <fieldset className="group"><legend>Other income</legend><div className="form-grid">
              <MoneyField label="Savings-account interest" value={input.otherIncome.savingsInterest} onChange={(value) => other('savingsInterest', value)} />
              <MoneyField label="FD / deposit interest" value={input.otherIncome.depositInterest} onChange={(value) => other('depositInterest', value)} />
              <MoneyField label="Dividends" value={input.otherIncome.dividends} onChange={(value) => other('dividends', value)} />
              <MoneyField label="Family pension" value={input.otherIncome.familyPension} onChange={(value) => other('familyPension', value)} />
              <MoneyField label="Short-term gains on listed equity (111A)" value={input.capitalGains.stcg111A} onChange={(value) => gains('stcg111A', value)} hint="Taxed at 20%." />
              <MoneyField label="Long-term gains on listed equity (112A)" value={input.capitalGains.ltcg112A} onChange={(value) => gains('ltcg112A', value)} hint="First ₹1.25L exempt, then 12.5%." />
            </div></fieldset>
          </>}
          {step === 2 && <>
            <fieldset className="group"><legend>Tax-saving deductions <span className="hint">(old regime)</span></legend><div className="form-grid">
              <MoneyField label="80C — EPF, PPF, ELSS, LIC, principal" value={input.deductions.section80C} onChange={(value) => deduction('section80C', value)} hint="Capped at ₹1,50,000." />
              <MoneyField label="80CCD(1B) — own NPS" value={input.deductions.section80CCD1B} onChange={(value) => deduction('section80CCD1B', value)} hint="Extra ₹50,000 over 80C." />
              <MoneyField label="80D — health insurance, self & family" value={input.deductions.section80Dself} onChange={(value) => deduction('section80Dself', value)} hint={`Capped at ${input.deductions.selfOrSpouseSenior ? '₹50,000' : '₹25,000'}.`} />
              <MoneyField label="80D — parents’ health insurance" value={input.deductions.section80Dparents} onChange={(value) => deduction('section80Dparents', value)} hint={`Capped at ${input.deductions.parentSenior ? '₹50,000' : '₹25,000'}.`} />
              <label className="check"><input type="checkbox" checked={input.deductions.selfOrSpouseSenior} onChange={(event) => deduction('selfOrSpouseSenior', event.target.checked)} />You or spouse are 60+</label>
              <label className="check"><input type="checkbox" checked={input.deductions.parentSenior} onChange={(event) => deduction('parentSenior', event.target.checked)} />A parent is 60+</label>
              <MoneyField label="80E — education-loan interest" value={input.deductions.section80E} onChange={(value) => deduction('section80E', value)} />
              <MoneyField label="Professional tax" value={input.deductions.professionalTax} onChange={(value) => deduction('professionalTax', value)} hint="Capped at ₹2,500." />
              {input.salary.hraReceived === 0 && <MoneyField label="80GG — rent paid without HRA" value={input.deductions.section80GG} onChange={(value) => deduction('section80GG', value)} hint="Up to ₹60,000 a year." />}
            </div></fieldset>
            <fieldset className="group"><legend>Home loan / property</legend><div className="form-grid">
              <label className="full">Property<select value={hp.kind} onChange={(event) => update((current) => ({ ...current, houseProperty: event.target.value === 'selfOccupied' ? { kind: 'selfOccupied', interestPaid: 0 } : event.target.value === 'letOut' ? { kind: 'letOut', rentReceived: 0, municipalTaxes: 0, interestPaid: 0 } : { kind: 'none' } }))}><option value="none">No house property</option><option value="selfOccupied">Self-occupied (I live in it)</option><option value="letOut">Let out (I rent it out)</option></select></label>
              {hp.kind === 'selfOccupied' && <MoneyField className="full" label="Home-loan interest paid" value={hp.interestPaid} onChange={(interestPaid) => update((current) => ({ ...current, houseProperty: { kind: 'selfOccupied', interestPaid } }))} hint="Old regime allows up to ₹2,00,000; new regime allows none." />}
              {hp.kind === 'letOut' && <>
                <MoneyField label="Annual rent received" value={hp.rentReceived} onChange={(rentReceived) => letOut({ rentReceived })} />
                <MoneyField label="Municipal taxes paid" value={hp.municipalTaxes} onChange={(municipalTaxes) => letOut({ municipalTaxes })} />
                <MoneyField className="full" label="Home-loan interest paid" value={hp.interestPaid} onChange={(interestPaid) => letOut({ interestPaid })} hint="Loss set-off capped at ₹2,00,000 (old); not allowed against salary in the new regime." />
              </>}
            </div></fieldset>
          </>}
        </div>
        <div className="actions" style={{ marginTop: 20, justifyContent: 'space-between' }}>
          {step > 0 ? <button className="button secondary" onClick={() => setStep(step - 1)}>Back</button> : <span />}
          {step < 2 ? <button className="button" onClick={() => setStep(step + 1)}>Continue</button> : <button className="button" onClick={() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })}>See full working</button>}
        </div>
      </section>
      <aside className="sticky-side stack">
        <Verdict comparison={comparison} />
        <div className="card small explain"><p style={{ margin: 0 }}>{details[details.length > 1 ? 1 : 0]}</p></div>
      </aside>
    </div>

    <div id="results" style={{ scrollMarginTop: 80 }}>
      <ComparisonLedger comparison={comparison} />
      <BreakEven result={breakEven} amount={exploreAmount} onAmount={setExplore} exploredTax={exploredTax} newTax={comparison.new.totalTax} />
      <section className="card section" aria-labelledby="explain-title">
        <div className="actions" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 id="explain-title" style={{ margin: 0 }}>What this means for you</h2>
          <button className="button secondary" onClick={narrate} disabled={narrating}>{narrating ? 'Writing…' : 'Explain in plain English'}</button>
        </div>
        {narration
          ? <div className="fade-in" aria-live="polite"><p>{narration.text}</p><p className="muted small">{narration.enhanced ? 'AI narration of the computed figures. Every number was checked against the ledger.' : 'AI narration is not configured on this server, so this is Lekha’s rule-based explanation.'}</p></div>
          : <ul className="clean explain">{details.map((line) => <li key={line}>{line}</li>)}</ul>}
        <p className="muted small" style={{ marginTop: 14 }}>Not covered: business income, foreign income, crypto/VDA, clubbing, presumptive taxation or advance-tax interest.</p>
      </section>
      <div className="actions section" style={{ marginTop: 20 }}>
        <button className="button" onClick={download}>Download summary</button>
        <button className="button secondary" onClick={copyLink}>Copy shareable link</button>
        <button className="button danger" onClick={() => setResetting(true)}>Reset everything</button>
        {resetting && <span className="actions notice small" role="alertdialog" aria-label="Confirm reset">Clear every input?<button className="button danger-solid" onClick={() => { setInput(structuredClone(emptyInput)); setExplore(null); setResetting(false); setStep(0); setNotice('All figures cleared.'); }}>Confirm reset</button><button className="button secondary" onClick={() => setResetting(false)}>Keep figures</button></span>}
      </div>
      {notice && <p role="status" className="success small" style={{ marginTop: 12 }}>{notice}</p>}
    </div>
  </>;
}

export default function ComparePage() { return <Suspense fallback={<p className="muted">Loading comparison…</p>}><CompareContent /></Suspense>; }
