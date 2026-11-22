import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export const CONTACT_EMAIL = 'gyanvirsingh09@gmail.com';
export const REPO_URL = 'https://github.com/Gyanvir/Volentify';

/**
 * Footer: the full site map, grouped by what people come to do. Role-gated consoles (dashboard, command hub,
 * administration) are deliberately absent — they sit in the account menu and would only bounce visitors to sign-in.
 */
const COLUMNS = [
  { title: 'Respond', links: [
    { href: '/map', label: 'Tactical map' }, { href: '/disasters', label: 'Active incidents' },
    { href: '/alerts', label: 'Alerts & advisories' }, { href: '/volunteer', label: 'Volunteer dispatch' },
    { href: '/resources', label: 'Hospitals, shelters & research' }, { href: '/contact', label: 'Report an incident' },
  ] },
  { title: 'Understand', links: [
    { href: '/analytics', label: 'Analytics' }, { href: '/transparency', label: 'Transparency' },
    { href: '/predictions', label: 'Forecasts' }, { href: '/disaster-intelligence', label: 'Satellite & bulletins' },
    { href: '/knowledge', label: 'Preparedness guides' }, { href: '/research', label: 'Methods & models' },
  ] },
  { title: 'Volentify', links: [
    { href: '/about', label: 'About' }, { href: '/mesh', label: 'Volentify Mesh app' },
    { href: '/safety', label: 'Safety & rules' }, { href: '/ngo-partners', label: 'For NGOs' },
    { href: '/government', label: 'For government agencies' }, { href: '/faqs', label: 'Questions' },
  ] },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="page grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo size={34} />
          <p className="max-w-xs text-sm leading-relaxed text-stone">
            Disaster intelligence and volunteer coordination for India — built to keep working when the network does not.
          </p>
          <div className="space-y-1 pt-2 text-sm">
            <p className="text-sand">In an emergency, call <a href="tel:112" className="link">112</a></p>
            <p className="text-stone">Ambulance <a href="tel:108" className="link">108</a> · NDMA <a href="tel:1078" className="link">1078</a></p>
            <p className="pt-2 text-stone">Questions: <a href={`mailto:${CONTACT_EMAIL}`} className="link">{CONTACT_EMAIL}</a></p>
          </div>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="mb-4 text-sm text-ivory">{c.title}</p>
            <ul className="space-y-2.5">
              {c.links.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-stone transition-colors hover:text-ivory">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="page flex flex-col gap-2 py-6 text-xs text-ash sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Volentify · Open source under the MIT licence · Not a government service</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/privacy" className="hover:text-sand">Privacy</Link>
            <Link href="/terms" className="hover:text-sand">Terms</Link>
            <Link href="/safety" className="hover:text-sand">Safety</Link>
            <a href={REPO_URL} className="hover:text-sand">Source</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
