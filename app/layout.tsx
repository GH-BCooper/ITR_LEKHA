import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { NavLinks } from '@/components/NavLinks';
import './globals.css';

export const metadata: Metadata = { title: { default: 'Lekha — your ITR assistant', template: '%s · Lekha' }, description: 'Compare India’s old and new income-tax regimes line by line, and reconcile Form 16 with AIS before you file. Runs in your browser.' };
export const viewport: Viewport = { themeColor: [{ media: '(prefers-color-scheme: light)', color: '#F7F7F4' }, { media: '(prefers-color-scheme: dark)', color: '#111313' }] };

const disclaimer = 'Lekha computes income tax from the figures you enter, using the slab rates and rules for FY 2025-26 (AY 2026-27). It is a calculation and checking aid, not tax advice, and it does not file anything. Rules change and individual situations vary — confirm anything material with a qualified chartered accountant before you file.';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-IN">
    <body>
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header"><nav className="shell"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">₹</span>Lekha</Link><NavLinks /></nav></header>
      <main id="main" className="shell">{children}</main>
      <footer className="site-footer"><div className="shell">{disclaimer}</div></footer>
    </body>
  </html>;
}
