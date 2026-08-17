'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BreakEven } from '@/components/ledger/BreakEven';
import { ComparisonLedger } from '@/components/ledger/ComparisonLedger';
import { inr } from '@/lib/format/inr';
import { explainComparison } from '@/lib/explain/ruleBased';
import { personas } from '@/lib/personas';
import { findBreakEven } from '@/lib/tax/breakEven';
import { compareRegimes, emptyInput, oldTaxAtDeductions } from '@/lib/tax/compute';
import type { HouseProperty, TaxInput } from '@/lib/tax/types';

const cities = ['Other', 'Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad', 'Pune'];
function clone<T>(value: T): T { return structuredClone(value); }
function initialInput(personaKey: string | null, serialized: string | null): TaxInput {
  if (serialized) { try { return JSON.parse(decodeURIComponent(serialized)) as TaxInput; } catch { /* fall through to a safe default */ } }
  return personaKey && personaKey in personas ? clone(personas[personaKey as keyof typeof personas].input) : clone(emptyInput);
}
function Field({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label>{label}<input inputMode="numeric" min="0" value={value || ''} onChange={(event) => onChange(Math.max(0, Number(event.target.value.replace(/[^0-9]/g, '')) || 0))} /></label>;
}

function CompareContent() {
  const params = useSearchParams();
  const personaKey = params.get('persona');
  const [input, setInput] = useState<TaxInput>(() => initialInput(personaKey, params.get('state')));
  const [step, setStep] = useState(1);
  const [explore, setExplore] = useState(0);
  const [resetting, setResetting] = useState(false);
  const comparison = useMemo(() => compareRegimes(input), [input]);
  const breakEven = useMemo(() => findBreakEven(input), [input]);

  useEffect(() => { window.history.replaceState(null, '', `/compare?state=${encodeURIComponent(JSON.stringify(input))}`); }, [input]);
  function salary(key: keyof TaxInput['salary'], value: number | string) { setInput((current) => ({ ...current, salary: { ...current.salary, [key]: value } })); }
  function deduction(key: keyof TaxInput['deductions'], value: number) { setInput((current) => ({ ...current, deductions: { ...current.deductions, [key]: value } })); }
  function property(value: HouseProperty) { setInput((current) => ({ ...current, houseProperty: value })); }
  function download() { const url = URL.createObjectURL(new Blob([JSON.stringify({ input, comparison, breakEven }, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'lekha-regime-summary.json'; link.click(); URL.revokeObjectURL(url); }
  const exploredTax = oldTaxAtDeductions(input, explore);

  return <>
    <p className="eyebrow">Engines 1 and 2</p><h1>Compare regimes</h1>
    <div className="two"><section className="card"><h2>Enter your figures</h2><p className="muted">Step {step} of 3</p>
      {step === 1 && <div className="form-grid"><label>Age at any time in FY<input type="number" min="0" max="120" value={input.age} onChange={(event) => setInput({ ...input, age: Number(event.target.value) || 0 })} /></label><label>Residency<select value={input.residency} onChange={(event) => setInput({ ...input, residency: event.target.value as TaxInput['residency'] })}><option value="resident">Resident</option><option value="nonResident">Non-resident</option></select></label><label>HRA city<select value={input.salary.city} onChange={(event) => salary('city', event.target.value)}>{cities.map((city) => <option key={city}>{city}</option>)}</select><small>Only Delhi, Mumbai, Kolkata and Chennai count as metro for HRA.</small></label></div>}
      {step === 2 && <div className="form-grid"><Field label="Gross salary" value={input.salary.gross} onChange={(value) => salary('gross', value)} /><Field label="Basic salary" value={input.salary.basic} onChange={(value) => salary('basic', value)} /><Field label="DA" value={input.salary.da} onChange={(value) => salary('da', value)} /><Field label="HRA received" value={input.salary.hraReceived} onChange={(value) => salary('hraReceived', value)} /><Field label="Rent paid" value={input.salary.rentPaid} onChange={(value) => salary('rentPaid', value)} /><Field label="Other exempt allowances" value={input.salary.otherExemptAllowances} onChange={(value) => salary('otherExemptAllowances', value)} /><Field label="Employer NPS contribution" value={input.salary.employerNpsContribution} onChange={(value) => salary('employerNpsContribution', value)} /><Field label="Savings interest" value={input.otherIncome.savingsInterest} onChange={(value) => setInput({ ...input, otherIncome: { ...input.otherIncome, savingsInterest: value } })} /><Field label="FD/deposit interest" value={input.otherIncome.depositInterest} onChange={(value) => setInput({ ...input, otherIncome: { ...input.otherIncome, depositInterest: value } })} /><Field label="Dividends" value={input.otherIncome.dividends} onChange={(value) => setInput({ ...input, otherIncome: { ...input.otherIncome, dividends: value } })} /><Field label="STCG (111A)" value={input.capitalGains.stcg111A} onChange={(value) => setInput({ ...input, capitalGains: { ...input.capitalGains, stcg111A: value } })} /><Field label="LTCG (112A)" value={input.capitalGains.ltcg112A} onChange={(value) => setInput({ ...input, capitalGains: { ...input.capitalGains, ltcg112A: value } })} /></div>}
      {step === 3 && <div className="form-grid"><Field label="80C" value={input.deductions.section80C} onChange={(value) => deduction('section80C', value)} /><Field label="80CCD(1B)" value={input.deductions.section80CCD1B} onChange={(value) => deduction('section80CCD1B', value)} /><Field label="80D self/family" value={input.deductions.section80Dself} onChange={(value) => deduction('section80Dself', value)} /><Field label="80D parents" value={input.deductions.section80Dparents} onChange={(value) => deduction('section80Dparents', value)} /><Field label="Education-loan interest (80E)" value={input.deductions.section80E} onChange={(value) => deduction('section80E', value)} /><Field label="Professional tax" value={input.deductions.professionalTax} onChange={(value) => deduction('professionalTax', value)} /><Field label="TDS already paid" value={input.tdsPaid} onChange={(value) => setInput({ ...input, tdsPaid: value })} /><label>House property<select value={input.houseProperty.kind} onChange={(event) => property(event.target.value === 'selfOccupied' ? { kind: 'selfOccupied', interestPaid: 0 } : event.target.value === 'letOut' ? { kind: 'letOut', rentReceived: 0, municipalTaxes: 0, interestPaid: 0 } : { kind: 'none' })}><option value="none">None</option><option value="selfOccupied">Self-occupied</option><option value="letOut">Let-out</option></select></label>{input.houseProperty.kind === 'selfOccupied' && <Field label="Self-occupied interest" value={input.houseProperty.interestPaid} onChange={(interestPaid) => property({ kind: 'selfOccupied', interestPaid })} />}{input.houseProperty.kind === 'letOut' && <><Field label="Let-out rent" value={input.houseProperty.rentReceived} onChange={(rentReceived) => property({ kind: 'letOut', rentReceived, municipalTaxes: input.houseProperty.kind === 'letOut' ? input.houseProperty.municipalTaxes : 0, interestPaid: input.houseProperty.kind === 'letOut' ? input.houseProperty.interestPaid : 0 })} /><Field label="Let-out interest" value={input.houseProperty.interestPaid} onChange={(interestPaid) => property({ kind: 'letOut', rentReceived: input.houseProperty.kind === 'letOut' ? input.houseProperty.rentReceived : 0, municipalTaxes: input.houseProperty.kind === 'letOut' ? input.houseProperty.municipalTaxes : 0, interestPaid })} /></>}</div>}
      <div className="actions">{step > 1 && <button className="button secondary" onClick={() => setStep(step - 1)}>Back</button>}{step < 3 ? <button className="button" onClick={() => setStep(step + 1)}>Continue</button> : <button className="button" onClick={() => document.getElementById('results')?.scrollIntoView()}>Compare regimes</button>}</div>
    </section><aside className="summary"><strong>Running comparison</strong><p className="figure">Old {inr(comparison.old.totalTax)}<br />New {inr(comparison.new.totalTax)}</p><p>{explainComparison(comparison)}</p></aside></div>
    <div id="results"><ComparisonLedger comparison={comparison} /><BreakEven result={breakEven} amount={explore} onAmount={setExplore} /><p className="summary">At the explored amount, old-regime tax computes as <span className="figure">{inr(exploredTax)}</span>; new-regime tax remains <span className="figure">{inr(comparison.new.totalTax)}</span>.</p><section className="card"><h2>Explanation</h2><p>{explainComparison(comparison)}</p><p className="muted">This tool does not handle business income, foreign income, crypto/VDA, clubbing, presumptive taxation, or advance-tax interest.</p><div className="actions"><button className="button" onClick={download}>Download summary</button><button className="button danger" onClick={() => setResetting(true)}>Reset everything</button>{resetting && <span>Clear every input? <button onClick={() => { setInput(clone(emptyInput)); setExplore(0); setResetting(false); }}>Confirm reset</button> <button onClick={() => setResetting(false)}>Keep figures</button></span>}</div></section></div>
  </>;
}

export default function ComparePage() { return <Suspense fallback={<p>Loading comparison…</p>}><CompareContent /></Suspense>; }
