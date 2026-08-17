import Link from 'next/link';
import { ComparisonLedger } from '@/components/ledger/ComparisonLedger';
import { compareRegimes } from '@/lib/tax/compute';
import { personas } from '@/lib/personas';

export default function LandingPage() { const comparison = compareRegimes(personas.rohan.input); return <><p className="eyebrow">FY 2025-26 · AY 2026-27</p><h1>Show the tax working before you file.</h1><p className="muted">Lekha computes both regimes and checks the difference between Form 16 and AIS, entirely in your browser.</p><ComparisonLedger comparison={comparison} /><h2>Start with a real scenario</h2><div className="grid">{Object.entries(personas).map(([key, item]) => <article className="card" key={key}><h3>{item.name}</h3><p>{item.description}</p><Link className="button secondary" href={`/compare?persona=${key}`}>Load {item.name.split(',')[0]}</Link></article>)}</div><p><Link href="/methodology">Read the rules and limitations</Link></p></>; }
