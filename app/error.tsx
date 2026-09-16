'use client';
import Link from 'next/link';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="card" style={{ maxWidth: 560 }}><span className="eyebrow">Something went wrong</span><h1>This page hit an error.</h1><p className="muted">No figures were sent anywhere. Try again, or start from the home page.</p><div className="actions"><button className="button" onClick={reset}>Try again</button><Link className="button secondary" href="/">Go home</Link></div></section>;
}
