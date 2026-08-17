import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = { title: 'Lekha — your ITR assistant', description: 'Compare Indian income-tax regimes and reconcile Form 16 with AIS.' };
const disclaimer = 'Lekha computes income tax from the figures you enter, using the slab rates and rules for FY 2025-26 (AY 2026-27). It is a calculation and checking aid, not tax advice, and it does not file anything. Rules change and individual situations vary — confirm anything material with a qualified chartered accountant before you file.';
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><a className="skip" href="#main">Skip to content</a><header><nav className="shell"><Link className="brand" href="/">Lekha</Link><div className="links"><Link href="/compare">Compare regimes</Link><Link href="/reconcile">Check Form 16 and AIS</Link><Link href="/methodology">Methodology</Link></div></nav></header><main id="main" className="shell">{children}</main><footer><div className="shell">{disclaimer}</div></footer></body></html>; }
