'use client';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <section className="card"><p className="eyebrow">Calculation view interrupted</p><h1>Reload this working page.</h1><p>No figures were sent anywhere. Try the calculation again.</p><button className="button" onClick={reset}>Try again</button></section>; }
