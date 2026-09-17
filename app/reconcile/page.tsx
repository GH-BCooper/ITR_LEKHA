'use client';
import Link from 'next/link';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import formSample from '@/data/samples/form16.sample.json';
import aisSample from '@/data/samples/ais.sample.json';
import formTemplate from '@/data/templates/form16.template.json';
import aisTemplate from '@/data/templates/ais.template.json';
import { MoneyField } from '@/components/MoneyField';
import { inr } from '@/lib/format/inr';
import { emptyInput } from '@/lib/tax/compute';
import { rules } from '@/lib/tax/rules';
import { reconcile } from '@/lib/reconcile/reconcile';
import { duplicateFlags } from '@/lib/reconcile/detectors/duplicates';
import type { Ais, Flag, Form16 } from '@/lib/reconcile/types';
import type { TaxInput } from '@/lib/tax/types';
import { aisSchema, form16Schema } from '@/lib/validation/schemas';

type Kind = 'form' | 'ais';
type Declared = { savingsInterest: number; depositInterest: number; dividends: number; stcg111A: number; ltcg112A: number; rentDeclared: boolean };
const noDeclared: Declared = { savingsInterest: 0, depositInterest: 0, dividends: 0, stcg111A: 0, ltcg112A: 0, rentDeclared: false };
const fieldNames: Record<string, string> = { pan: 'your PAN', 'employer.name': 'the employer name', 'employer.tan': 'the employer TAN' };
const severityLabels = { BLOCKER: 'Blockers', WARNING: 'Warnings', INFO: 'Good to know' } as const;

function download(name: string, data: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }

/** The return you intend to file: Form 16 salary and deductions plus the other income you enter here. */
function declaredInput(form: Form16, ais: Ais | null, declared: Declared): TaxInput {
  const rent = ais?.entries.filter((entry) => entry.category === 'RENT_RECEIVED').reduce((sum, entry) => sum + entry.amount, 0) ?? 0;
  return {
    ...emptyInput,
    salary: { ...emptyInput.salary, gross: form.salary.gross, basic: form.salary.basic, da: form.salary.da, hraReceived: form.salary.hraReceived, otherExemptAllowances: form.salary.exemptAllowances, employerNpsContribution: form.salary.employerNpsContribution },
    otherIncome: { ...emptyInput.otherIncome, savingsInterest: declared.savingsInterest, depositInterest: declared.depositInterest, dividends: declared.dividends },
    capitalGains: { stcg111A: declared.stcg111A, ltcg112A: declared.ltcg112A },
    houseProperty: declared.rentDeclared ? { kind: 'letOut', rentReceived: rent, municipalTaxes: 0, interestPaid: 0 } : { kind: 'none' },
    deductions: { ...emptyInput.deductions, section80C: form.deductionsConsidered['80C'] ?? 0, section80Dself: form.deductionsConsidered['80D'] ?? 0, section80CCD1B: form.deductionsConsidered['80CCD1B'] ?? 0 },
    tdsPaid: form.totalTds + (ais?.entries.filter((entry) => entry.sourceTan !== form.employer.tan).reduce((sum, entry) => sum + entry.tdsCredited, 0) ?? 0)
  };
}

function FlagCard({ flag }: { flag: Flag }) {
  const { formSixteenValue, aisValue, difference, aisEntryIds } = flag.evidence;
  return <article className={`card flag flag-${flag.severity} fade-in`}>
    <div className="actions" style={{ justifyContent: 'space-between' }}><h3>{flag.title}</h3><span className={`pill pill-${flag.severity}`}>{flag.severity}</span></div>
    <p className="muted" style={{ marginTop: 6 }}>{flag.whatItMeans}</p>
    <p><strong>What to do:</strong> {flag.suggestedAction}</p>
    <p className="small muted"><strong>If ignored:</strong> {flag.ifIgnored} · Confidence {flag.confidence.toLowerCase()}</p>
    {(formSixteenValue !== undefined || aisValue !== undefined || aisEntryIds?.length) && <dl className="kv">
      {formSixteenValue !== undefined && <div><dt>{flag.code === 'INCOME_IN_AIS_NOT_DECLARED' ? 'Declared' : 'Form 16'}</dt><dd>{inr(formSixteenValue)}</dd></div>}
      {aisValue !== undefined && <div><dt>{flag.code === 'QUARTERLY_TDS_SUM_MISMATCH' ? 'Quarters add to' : 'AIS'}</dt><dd>{inr(aisValue)}</dd></div>}
      {difference !== undefined && <div><dt>Difference</dt><dd>{inr(difference)}</dd></div>}
      {aisEntryIds && aisEntryIds.length > 0 && <div><dt>AIS entries</dt><dd>{aisEntryIds.join(', ')}</dd></div>}
    </dl>}
  </article>;
}

export default function ReconcilePage() {
  const [form, setForm] = useState<Form16 | null>(null); const [ais, setAis] = useState<Ais | null>(null);
  const [texts, setTexts] = useState<Record<Kind, string>>({ form: '', ais: '' });
  const [declared, setDeclared] = useState<Declared>(noDeclared);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [details, setDetails] = useState(false);
  const inputs = { form: useRef<HTMLInputElement>(null), ais: useRef<HTMLInputElement>(null) };
  const result = useMemo(() => form && ais ? reconcile({ form16: form, ais, declared: declaredInput(form, ais, declared) }) : null, [form, ais, declared]);

  const say = (text: string, tone: 'success' | 'error' = 'success') => setMessage({ text, tone });
  function load(kind: Kind, data: unknown, via = 'loaded') {
    // A document dropped in the wrong panel is routed to the right one, but only after validation.
    const type = typeof data === 'object' && data !== null && 'documentType' in data ? data.documentType : undefined;
    const target: Kind = type === 'AIS' ? 'ais' : type === 'FORM16' ? 'form' : kind;
    const checked = target === 'form' ? form16Schema.safeParse(data) : aisSchema.safeParse(data);
    if (!checked.success) { const empty = checked.error.issues.filter((issue) => issue.code === 'too_small' && issue.origin === 'string').map((issue) => fieldNames[issue.path.join('.')] ?? issue.path.join('.'));
      const other = checked.error.issues.filter((issue) => !(issue.code === 'too_small' && issue.origin === 'string')).slice(0, 3).map((issue) => `${issue.path.join('.') || 'document'} — ${issue.message}`);
      say(`${target === 'form' ? 'Form 16' : 'AIS'} was not loaded. ${empty.length ? `Fill in ${empty.join(', ')} first — a blank template has these empty. ` : ''}${other.join('; ')}`.trim(), 'error'); return; }
    if (target === 'form') setForm(checked.data as Form16); else setAis(checked.data as Ais);
    const moved = target !== kind ? ` It was a${target === 'ais' ? 'n AIS' : ' Form 16'} file, so it went into the ${target === 'ais' ? 'AIS' : 'Form 16'} panel.` : '';
    say(`${target === 'form' ? 'Form 16' : 'AIS'} ${via}.${moved}`);
  }
  function paste(kind: Kind) {
    try { load(kind, JSON.parse(texts[kind]), 'loaded from pasted JSON'); }
    catch (error) { say(`JSON could not be parsed: ${error instanceof Error ? error.message : 'unknown error'}`, 'error'); }
  }
  function upload(kind: Kind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > rules.tolerances.maxUploadBytes) { say('File is larger than 2MB. Choose a smaller JSON file.', 'error'); return; }
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') { say('Choose a .json file; the previous document is unchanged.', 'error'); return; }
    file.text().then((text) => load(kind, JSON.parse(text), `loaded from ${file.name}`)).catch((error: unknown) => say(`JSON could not be parsed: ${error instanceof Error ? error.message : 'unknown error'}`, 'error'));
  }
  function fillFromAis() {
    if (!ais) return;
    const duplicates = duplicateFlags({ form16: form ?? (formSample as Form16), ais, declared: emptyInput }).duplicateEntryIds;
    const sum = (category: string) => ais.entries.filter((entry) => entry.category === category && !duplicates.includes(entry.id)).reduce((total, entry) => total + entry.amount, 0);
    setDeclared((current) => ({ ...current, savingsInterest: sum('SAVINGS_INTEREST'), depositInterest: sum('FD_INTEREST'), dividends: sum('DIVIDEND'), rentDeclared: sum('RENT_RECEIVED') > 0 }));
    say(`Declared interest and dividends set to AIS totals, skipping ${duplicates.length} probable duplicate${duplicates.length === 1 ? '' : 's'}. Capital gains still need your broker statement.`);
  }
  async function copyChecklist() {
    if (!result) return;
    const markdown = result.flags.map((flag) => `- [ ] ${flag.title}: ${flag.suggestedAction}`).join('\n') || '- [x] No mismatches found';
    try { await navigator.clipboard.writeText(markdown); say('Checklist copied to the clipboard.'); } catch { say('Could not access the clipboard in this browser.', 'error'); }
  }
  function clearAll() { setForm(null); setAis(null); setDeclared(noDeclared); setTexts({ form: '', ais: '' }); setDetails(false); say('Both documents cleared.'); }

  const panels = [
    { kind: 'form' as const, title: 'Form 16', blurb: 'Your employer’s salary and TDS certificate.', sample: formSample, template: formTemplate, status: form ? `${form.employer.name} · PAN ${form.pan} · AY ${form.assessmentYear}` : null },
    { kind: 'ais' as const, title: 'AIS', blurb: 'The tax department’s record of income reported about you.', sample: aisSample, template: aisTemplate, status: ais ? `${ais.entries.length} entries · PAN ${ais.pan} · AY ${ais.assessmentYear}` : null }
  ];
  const compareHref = form ? `/compare?state=${encodeURIComponent(JSON.stringify(declaredInput(form, ais, declared)))}` : '/compare';

  return <>
    <div className="page-head"><span className="eyebrow">Pre-filing check</span><h1>Check Form 16 against AIS</h1><p className="lead">Mismatches between what your employer, bank and broker reported and what you declare are the most common reason for tax notices. Find them before the department does.</p></div>
    <div className="two">{panels.map((panel) => <section className="card stack" key={panel.kind} aria-labelledby={`${panel.kind}-title`}>
      <div><h2 id={`${panel.kind}-title`} style={{ marginBottom: 2 }}>{panel.title}</h2><p className="muted small" style={{ margin: 0 }}>{panel.blurb}</p></div>
      <p className="status-line" style={{ margin: 0 }}><span className={`dot ${panel.status ? 'on' : ''}`} aria-hidden="true" />{panel.status ?? 'Not loaded yet'}</p>
      <div className="actions">
        <button className="button" onClick={() => load(panel.kind, panel.sample, 'sample loaded')}>Load sample</button>
        <button className="button secondary" onClick={() => inputs[panel.kind].current?.click()}>Upload JSON</button>
        <input ref={inputs[panel.kind]} hidden type="file" accept="application/json,.json" aria-label={`Upload ${panel.title} JSON`} onChange={(event) => upload(panel.kind, event)} />
        <button className="button ghost" onClick={() => download(`${panel.kind === 'form' ? 'form16' : 'ais'}.template.json`, panel.template)}>Download blank template</button>
      </div>
      <details><summary className="small muted" style={{ cursor: 'pointer' }}>Or paste JSON</summary>
        <div className="stack" style={{ marginTop: 10 }}>
          <label>Paste structured JSON<textarea value={texts[panel.kind]} onChange={(event) => setTexts((current) => ({ ...current, [panel.kind]: event.target.value }))} placeholder={`Paste ${panel.title} JSON here`} /></label>
          <div><button className="button secondary" onClick={() => paste(panel.kind)} disabled={!texts[panel.kind].trim()}>Use pasted JSON</button></div>
        </div>
      </details>
    </section>)}</div>
    {message && <p role="status" className={`${message.tone === 'error' ? 'notice' : 'success'} small`} style={{ marginTop: 16 }}>{message.text}</p>}

    <section className="card section" aria-labelledby="declared-title">
      <div className="actions" style={{ justifyContent: 'space-between' }}>
        <div><h2 id="declared-title" style={{ marginBottom: 2 }}>What you plan to declare</h2><p className="muted small" style={{ margin: 0 }}>Salary and deductions come from Form 16. Enter the other income you will put in your return.</p></div>
        {ais && <button className="button secondary" onClick={fillFromAis}>Use AIS amounts</button>}
      </div>
      <div className="grid" style={{ marginTop: 16 }}>
        <MoneyField label="Savings interest" value={declared.savingsInterest} onChange={(value) => setDeclared({ ...declared, savingsInterest: value })} />
        <MoneyField label="FD / deposit interest" value={declared.depositInterest} onChange={(value) => setDeclared({ ...declared, depositInterest: value })} />
        <MoneyField label="Dividends" value={declared.dividends} onChange={(value) => setDeclared({ ...declared, dividends: value })} />
        <MoneyField label="Short-term capital gains (111A)" value={declared.stcg111A} onChange={(value) => setDeclared({ ...declared, stcg111A: value })} />
        <MoneyField label="Long-term capital gains (112A)" value={declared.ltcg112A} onChange={(value) => setDeclared({ ...declared, ltcg112A: value })} />
        <label className="check" style={{ alignSelf: 'center' }}><input type="checkbox" checked={declared.rentDeclared} onChange={(event) => setDeclared({ ...declared, rentDeclared: event.target.checked })} />I will declare rental income</label>
      </div>
    </section>

    {!result && <p className="info section small">{form || ais ? `Load ${form ? 'your AIS' : 'your Form 16'} to run the check.` : 'Load both documents — or try the samples — to run the check. Everything stays in your browser.'}</p>}
    {result && <section className="section" aria-labelledby="risk-title">
      <div className="card">
        <h2 id="risk-title">Notice risk</h2>
        <div className="score"><span className="score-number">{result.risk.score}<span className="muted small">/100</span></span><div style={{ flex: 1, minWidth: 180 }}><strong>{result.risk.band}</strong><div className={`meter ${result.risk.band}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.risk.score} aria-label="Notice risk score"><span style={{ width: `${Math.max(2, result.risk.score)}%` }} /></div></div></div>
        <p className="muted small" style={{ marginTop: 12 }}>Undeclared AIS income, excluding probable duplicates: <span className="figure">{inr(result.undeclaredIncomeTotal)}</span></p>
        <div className="actions">
          <button className="button secondary" onClick={() => setDetails(!details)} aria-expanded={details}>{details ? 'Hide score working' : 'Show score working'}</button>
          <button className="button" onClick={copyChecklist}>Copy all flags as a checklist</button>
          <Link className="button secondary" href={compareHref}>Compare regimes with these figures</Link>
          <button className="button ghost" onClick={clearAll}>Clear documents</button>
        </div>
        {details && <ul className="clean small fade-in" style={{ marginTop: 12 }}>{result.risk.contributions.map((item) => <li key={item.label}>{item.label}: <span className="figure">{item.points}</span> points</li>)}</ul>}
      </div>
      {result.flags.length === 0 && <p className="success section">No mismatches found. Your declared figures line up with Form 16 and AIS.</p>}
      {(['BLOCKER', 'WARNING', 'INFO'] as const).map((severity) => { const flags = result.flags.filter((flag) => flag.severity === severity); return flags.length ? <section key={severity} className="section"><h2>{severityLabels[severity]} ({flags.length})</h2>{flags.map((flag) => <FlagCard key={flag.id} flag={flag} />)}</section> : null; })}
    </section>}
  </>;
}
