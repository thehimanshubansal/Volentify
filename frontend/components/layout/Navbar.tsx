'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Menu, Phone, Smartphone, X } from 'lucide-react';
import { ROLE_META } from '@/lib/constants';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';

/**
 * Navigation: the bar holds what people use during an emergency (map, incidents, alerts, volunteering, resources)
 * plus one "Insights" menu for analysis. Everything about the organisation, policies and partners lives in the
 * footer; consoles (dashboard, command hub, administration) live in the account menu because they are role-gated.
 */
const PRIMARY = [
  { href: '/map', label: 'Map' },
  { href: '/disasters', label: 'Incidents' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/volunteer', label: 'Volunteer' },
  { href: '/resources', label: 'Resources' },
];
const INTELLIGENCE = [
  { href: '/analytics', label: 'Analytics', blurb: 'Live operations, response impact and past disasters' },
  { href: '/predictions', label: 'Forecasts', blurb: 'Cyclone models, storm surge and multilingual triage' },
  { href: '/disaster-intelligence', label: 'Satellite & bulletins', blurb: 'Satellite imagery on the tactical map, NDMA warnings' },
  { href: '/transparency', label: 'Transparency', blurb: 'Accountability figures, data held and how decisions are made' },
];

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onOutside();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOutside]);
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, status, signOut } = useSession();
  const [mobile, setMobile] = useState(false);
  const [intel, setIntel] = useState(false);
  const [account, setAccount] = useState(false);
  const intelRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  useClickOutside(intelRef, () => setIntel(false));
  useClickOutside(accountRef, () => setAccount(false));
  useEffect(() => { setMobile(false); setIntel(false); setAccount(false); }, [pathname]);

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const consoleLinks = user ? [
    ...(user.role === 'VOLUNTEER' ? [{ href: '/volunteers/me', label: 'My profile' }] : []),
    { href: '/dashboard', label: 'My dashboard' },
    ...(['INCIDENT_ADMIN', 'NGO_MEMBER'].includes(user.role) ? [{ href: '/agency', label: 'Command hub' }] : []),
    ...(user.role === 'INCIDENT_ADMIN' ? [{ href: '/admin', label: 'Administration' }] : []),
  ] : [];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/85 backdrop-blur-xl">
      <div className="page flex h-16 items-center justify-between gap-6">
        <Link href="/" className="shrink-0 rounded-lg" aria-label="Volentify home">
          <Logo size={28} />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {PRIMARY.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? 'page' : undefined}
              className={cn('rounded-lg px-3 py-2 text-sm transition-colors', active(l.href) ? 'text-ivory' : 'text-stone hover:text-ivory')}>
              {l.label}
            </Link>
          ))}
          <div ref={intelRef} className="relative">
            <button onClick={() => setIntel((v) => !v)} aria-expanded={intel}
              className={cn('flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors',
                INTELLIGENCE.some((l) => active(l.href)) ? 'text-ivory' : 'text-stone hover:text-ivory')}>
              Insights <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', intel && 'rotate-180')} aria-hidden />
            </button>
            {intel && (
              <div className="absolute left-0 top-full mt-2 w-72 animate-fade-up rounded-2xl border border-line bg-ink-900 p-2 shadow-float">
                {INTELLIGENCE.map((l) => (
                  <Link key={l.href} href={l.href} className="block rounded-xl px-3 py-2.5 hover:bg-ivory/[0.05]">
                    <span className="block text-sm text-ivory">{l.label}</span>
                    <span className="block text-xs text-stone">{l.blurb}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/mesh" className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] text-ivory ring-1 ring-inset ring-line-strong transition-colors hover:bg-ivory/[0.05] md:flex">
            <Smartphone className="h-3.5 w-3.5 text-gold" aria-hidden /> Get the app
          </Link>
          <a href="tel:112" className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] text-critical ring-1 ring-inset ring-critical/30 transition-colors hover:bg-critical/10 sm:flex">
            <Phone className="h-3.5 w-3.5" aria-hidden /> Emergency 112
          </a>
          {status === 'authenticated' && user ? (
            <div ref={accountRef} className="relative hidden sm:block">
              <button onClick={() => setAccount((v) => !v)} aria-expanded={account}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 ring-1 ring-inset ring-line-strong hover:ring-ivory/30">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
                  : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 font-serif text-sm text-gold">{user.name[0]}</span>}
                <span className="max-w-[9rem] truncate text-[0.8125rem] text-ivory">{user.name.split(' ')[0]}</span>
              </button>
              {account && (
                <div className="absolute right-0 top-full mt-2 w-64 animate-fade-up rounded-2xl border border-line bg-ink-900 p-2 shadow-float">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm text-ivory">{user.name}</p>
                    <p className="text-xs text-stone">{ROLE_META[user.role].label}{user.is_verified ? '' : ' · awaiting verification'}</p>
                  </div>
                  <div className="my-1 border-t border-line" />
                  {consoleLinks.map((l) => (
                    <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 text-sm text-sand hover:bg-ivory/[0.05] hover:text-ivory">{l.label}</Link>
                  ))}
                  <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sand hover:bg-ivory/[0.05] hover:text-ivory">
                    <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : status === 'anonymous' ? (
            <div className="hidden items-center gap-1 sm:flex">
              <ButtonLink href="/login" variant="ghost" size="sm">Sign in</ButtonLink>
              <ButtonLink href="/register" variant="quiet" size="sm">Join</ButtonLink>
            </div>
          ) : <span className="hidden w-24 sm:block" />}
          <button className="rounded-lg p-2 text-sand hover:text-ivory lg:hidden" onClick={() => setMobile((v) => !v)}
            aria-label={mobile ? 'Close menu' : 'Open menu'} aria-expanded={mobile}>
            {mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobile && (
        <nav className="border-t border-line bg-ink lg:hidden" aria-label="Mobile">
          <div className="page grid gap-1 py-4">
            {[
              { title: null, links: PRIMARY },
              { title: 'Insights', links: INTELLIGENCE },
              { title: user ? 'Your account' : null, links: [...consoleLinks, { href: '/mesh', label: 'Get the Android app' }] },
            ].map((g, i) => (
              <div key={i} className={cn('grid gap-1', i > 0 && 'mt-2 border-t border-line pt-3')}>
                {g.title && <p className="eyebrow px-3 pb-1">{g.title}</p>}
                {g.links.map((l) => (
                  <Link key={l.href} href={l.href} className={cn('rounded-lg px-3 py-2.5 text-[0.9375rem]', active(l.href) ? 'bg-ivory/[0.06] text-ivory' : 'text-sand')}>
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="mt-3 flex gap-2 border-t border-line pt-4">
              <ButtonLink href="tel:112" variant="danger" size="sm"><Phone className="h-3.5 w-3.5" />Call 112</ButtonLink>
              {user
                ? <button onClick={signOut} className="ml-auto text-sm text-stone">Sign out</button>
                : <><ButtonLink href="/login" variant="secondary" size="sm">Sign in</ButtonLink><ButtonLink href="/register" variant="quiet" size="sm">Join</ButtonLink></>}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
