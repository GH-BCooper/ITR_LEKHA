import Link from 'next/link';

export default function NotFound() {
  return <section className="card" style={{ maxWidth: 560 }}><span className="eyebrow">404</span><h1>This page is not in the ledger.</h1><p className="muted">The address does not exist. Pick up where it matters:</p><div className="actions"><Link className="button" href="/compare">Compare regimes</Link><Link className="button secondary" href="/">Go to Lekha</Link></div></section>;
}
