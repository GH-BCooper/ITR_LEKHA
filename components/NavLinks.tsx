'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [{ href: '/compare', label: 'Compare regimes' }, { href: '/reconcile', label: 'Check Form 16 & AIS' }, { href: '/methodology', label: 'Methodology' }];

export function NavLinks() {
  const pathname = usePathname();
  return <div className="nav-links">{links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}</Link>)}</div>;
}
