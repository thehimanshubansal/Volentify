import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Minus, Phone, ShieldAlert } from 'lucide-react';
import { PageHeader, Section } from '@/components/ui/Page';
import { Pill } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Safety & rules',
  description: 'The rules everyone on Volentify and Volentify Mesh follows, what each role can do, how the platform is secured, and the law behind it.',
};

const UPDATED = '5 November 2026';

const EVERYONE = [
  { title: 'In danger now? Call 112 first.', body: 'Volentify and its mesh are best-effort. A report can take minutes or hours to reach responders. They never replace 112, ambulance 108, fire 101 or police 100.' },
  { title: 'Report only what you see.', body: 'Making or circulating a false alarm about a disaster, its severity or its magnitude is an offence under Section 54 of the Disaster Management Act, 2005 — up to one year in prison or a fine. Command can reject false reports and quarantine the phone that sent them.' },
  { title: 'One report per situation.', body: 'Sending the same SOS again does not make it faster — every copy competes for the same Bluetooth airtime. The app refuses a repeat of the same report type within a minute, and caps reports at 10 an hour per phone.' },
  { title: 'Unverified until reviewed.', body: 'Field reports and messages are unverified until an incident controller reviews them. Only messages marked “Official · Volentify command” come from verified command; “Automated” advisories are guidance generated from GDACS, USGS and NASA data. Never forward rumours.' },
  { title: 'Keep identities out of reports.', body: 'Do not type Aadhaar, PAN, ration-card, bank or phone numbers, caste, religion or other people’s full names. Reports pass through strangers’ phones. Volentify removes identity and phone numbers automatically, on the phone and again on the server.' },
  { title: 'Don’t put yourself at risk to file a report.', body: 'Never enter flood water, damaged buildings, fire or gas-leak areas to take a photo or a GPS fix. A report from a safe place a few hundred metres away is just as useful.' },
];

type Cell = boolean | string;
const PERMISSIONS: { action: string; cells: [Cell, Cell, Cell, Cell] }[] = [
  { action: 'Submit a report (website or mesh app)', cells: [true, true, true, true] },
  { action: 'See public alerts, incidents and the map', cells: [true, true, true, true] },
  { action: 'Send a message into the field mesh from the website', cells: [false, 'Unverified', 'Unverified', 'Official'] },
  { action: 'See casualty and medical details in reports', cells: [false, false, true, true] },
  { action: 'Convert a field report into a mission', cells: [false, true, true, true] },
  { action: 'Accept and carry out missions', cells: [false, true, false, false] },
  { action: 'Create missions', cells: [false, false, true, true] },
  { action: 'Reject false reports, quarantine a phone', cells: [false, false, true, true] },
  { action: 'Broadcast an official alert', cells: [false, false, false, true] },
  { action: 'Verify accounts, change roles, read the audit log', cells: [false, false, false, true] },
];

const ROLES = [
  {
    role: 'Citizens', who: 'People affected by a disaster, often with a cracked screen, a dying battery and no signal.',
    risks: ['Panic tapping that floods the mesh with duplicate SOS reports', 'A dying battery while the grid is down', 'Revealing exactly where a vulnerable person is sheltering', 'Believing unofficial “evacuation orders” passed along by others'],
    rules: ['File one report, then leave the relay switched on — it keeps passing other people’s reports', 'Use “Mask my location” if being found by strangers is a risk; switch it off if you need rescuers to find you', 'Follow only warnings from IMD, CWC, INCOIS, your SDMA or messages marked Official'],
  },
  {
    role: 'Volunteers', who: 'Neighbours and trained responders on foot or two-wheelers, clearing debris, ferrying water, checking on people.',
    risks: ['Entering live flood currents, collapsed structures or gas leaks without training', 'Two volunteers racing to the same mission', 'Accepting a mission and then going unreachable', 'Mis-grading a report (an insulin need marked “low”)'],
    rules: ['Specialist missions (boat rescue, paramedic, drone) are only offered to people holding that skill', 'Hold at most three active missions; start an accepted mission within 45 minutes or it returns to the board', 'Confirm the safety pledge when you start a mission; turn back from water and tell command', 'Close missions honestly — “people helped” feeds your profile and the public figures'],
  },
  {
    role: 'NGOs & relief agencies', who: 'Teams running camps, kitchens, supply trucks and health camps.',
    risks: ['Two organisations supplying Camp A while Camp B gets nothing', 'Fulfilling fabricated resource requests', 'Storing beneficiaries’ identities on shared phones'],
    rules: ['NGO accounts are verified by an administrator before they can create missions or see casualty details', 'Treat resource requests as unverified until reviewed; a false claim for relief is an offence (DM Act 2005, s.52)', 'Mesh reports carry counts and needs, never beneficiary identities'],
  },
  {
    role: 'Incident command (NDRF, SDRF, DEOC)', who: 'Commanders coordinating boats, helicopters and specialist teams from an emergency operations centre.',
    risks: ['An erroneous public alert causing panic', 'Drowning in trivial requests while people are trapped', 'Broadcasting the positions of scarce assets on an open channel'],
    rules: ['Only verified incident administrators can broadcast official alerts; every broadcast is in the audit log', 'Filter the review queue by priority — life-safety types alone may be marked Critical', 'Do not send asset positions or tactical frequencies over the mesh: mesh messages are readable by every relaying phone'],
  },
];

const APP_RULES = [
  ['Duplicate guard', 'A repeat of the same report type within 60 seconds is refused; at most 10 reports and 30 messages an hour per phone.'],
  ['Privacy filter', 'Aadhaar, PAN, card or account and phone numbers are replaced with [removed] before a report is saved, and again on the server.'],
  ['Priority sanity', 'Critical is reserved for people trapped or missing, medical emergencies, fire and flooding; everything else is capped at High.'],
  ['Hop budget', 'Every report travels at most five phone-to-phone hops and is capped at 4 KB, so the mesh cannot be flooded. Duplicates are dropped by event ID.'],
  ['Official means official', '“Official · Volentify command” appears only on messages a phone downloaded from the Volentify server. A message relayed over Bluetooth that claims to be official is shown as an unverified relay.'],
  ['Location masking', 'An optional ±500 m shift before coordinates leave the phone.'],
  ['Battery saver', 'Below 15 % battery and not charging, the app scans and relays less often.'],
  ['Short memory', 'Reports are deleted from the phone 72 hours after the server confirms them.'],
];

const SECURITY = [
  ['Who you are', 'Passwords are hashed with scrypt; sessions are signed, HTTP-only cookies that expire after 72 hours. Google sign-in tokens are verified against Google’s keys, audience, issuer and a one-time nonce.'],
  ['What you may do', 'Every action is checked on the server against your role. Command and NGO roles need verification by an administrator; changing your role through onboarding never carries a verification over.'],
  ['Staff accounts', 'The volentify.com address space is reserved: nobody can register with it. Four regulator accounts hold regulation and monitoring access, and only a regulator can change another regulator.'],
  ['Phones', 'Gateway uploads use short-lived tokens; no server secret ships in the app. Uploads without a token are accepted as public reports and rate-limited per network (20 a minute; 60 with a token). Phone IDs are random, never hardware addresses, and Bluetooth scanning is declared “never for location”. The app only talks to its server over HTTPS, trusts only certificates Android itself trusts, and keeps its data out of cloud backups and phone-to-phone transfers.'],
  ['Break-in attempts', 'Eight wrong passwords lock that account for 15 minutes, and one network can try at most 40 sign-ins in 15 minutes. Sign-ups are limited per network, and hidden form fields catch bots. Requests from another website cannot act with your session.'],
  ['Crawlers and scanners', 'Search engines may index the public safety pages so people can find them. AI-training crawlers, bulk scrapers and vulnerability scanners are refused, attack probes get nothing back, and every network has a request allowance. Volunteer names are shown as initials to signed-out visitors.'],
  ['In the browser', 'Pages may only run code from Volentify itself, cannot be embedded in another site, and are only served over HTTPS. Personal and console pages are never indexed.'],
  ['Spoofing', 'Fields such as “official” and the sender’s role are set only by the server. A phone or a web form cannot make a message look like it came from command.'],
  ['False reports', 'Command can reject a report (it disappears from public views) and quarantine the phone that sent it; its later uploads are dropped.'],
  ['Accountability', 'Sign-ins to command accounts, role changes, alerts, mission and review decisions and quarantines are written to a hash-chained audit log, kept for at least 180 days. Administrators can verify the chain at any time.'],
  ['What is not protected', 'Mesh messages are not end-to-end encrypted: any phone that relays a report can read it. That is why reports carry counts and needs rather than identities, and why people-related reports are summarised for everyone except verified command.'],
];

const LAW = [
  { name: 'Disaster Management Act, 2005', points: ['Section 54: a false alarm or warning about a disaster that causes panic is punishable with up to one year’s imprisonment or a fine.', 'Section 52: a knowingly false claim for relief is punishable with up to two years’ imprisonment and a fine.', 'Volentify therefore never labels citizen or volunteer messages as warnings, and labels its automated advisories “not an official warning”.'] },
  { name: 'Digital Personal Data Protection Act, 2023', points: ['Personal data may be processed without consent to respond to a medical emergency or to help people during a disaster (Section 7, legitimate uses) — so a distress report never waits for a consent screen.', 'Data minimisation: free text and exact coordinates of field reports are minimised 30 days after the observation once the incident is closed. No personal data is sold or used for advertising.'] },
  { name: 'CERT-In Directions, 28 April 2022', points: ['Logs of privileged actions are kept for at least 180 days (the audit trail).', 'Cyber incidents affecting the platform are to be reported to CERT-In within six hours of being noticed.'] },
  { name: 'Wireless use', points: ['Volentify Mesh uses ordinary Bluetooth Low Energy in the licence-exempt 2.4 GHz band — no licence or special hardware is needed.'] },
];

const SCENARIOS = [
  { name: 'Cellular network and power are down', steps: ['Open Volentify Mesh and file one report; it is saved on the phone even with no signal or GPS.', 'Leave the relay on. Phones within roughly 30–50 m swap reports automatically; each copy spends one of five hops.', 'The first phone that reaches any internet — mobile data, Wi-Fi, a satellite terminal at a relief camp — uploads everything it carries and brings official messages back into the mesh.', 'Reports appear on the map and in the review queue; command converts them into missions and the dispatch board matches responders.'] },
  { name: 'False or panic reports', steps: ['Every mesh and website report is unverified until reviewed, and is shown that way everywhere.', 'Command checks it against official warnings and other reports; a report with no corroboration stays unverified.', 'A deliberately false report is rejected; if the same phone keeps sending them, it is quarantined and its uploads are dropped.', 'Command can broadcast an official correction that phones carry back into the mesh.'] },
  { name: 'Hazardous zones', steps: ['Specialist missions — boat rescue, paramedic, drone — are only offered to people who hold that skill.', 'Volunteers confirm a safety pledge when they start a mission; road routes on the map can be out of date, so water and debris always win.', 'If the route is blocked or unsafe, turn back, release the mission and tell command so it can go to a specialist team.'] },
];

function Mark({ value }: { value: Cell }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-low" aria-label="Yes" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-ash" aria-label="No" />;
  return <span className="text-xs text-sand">{value}</span>;
}

export default function SafetyPage() {
  return (
    <>
      <PageHeader
        label="Safety & rules"
        title="Rules that keep people safe — on the ground and online."
        lede="What everyone using Volentify and the Volentify Mesh app agrees to, what each role can and cannot do, how the platform protects itself, and the law behind it."
        actions={<ButtonLink href="tel:112" variant="danger"><Phone className="h-4 w-4" aria-hidden />Call 112</ButtonLink>}
        meta={<p className="text-sm text-stone">Last updated <span className="code">{UPDATED}</span> · Questions or a security problem: <a href="mailto:gyanvirsingh09@gmail.com" className="link">gyanvirsingh09@gmail.com</a></p>}
      />

      <Section title="Rules for everyone" className="pt-0">
        <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
          {EVERYONE.map((r, i) => (
            <li key={r.title} className="space-y-2 bg-ink p-6">
              <p className="flex items-baseline gap-3"><span className="numeral text-2xl text-signal">{i + 1}</span><span className="text-[1.0625rem] text-ivory">{r.title}</span></p>
              <p className="text-sm leading-relaxed text-stone">{r.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Caveats and rules by role" description="Each kind of user faces different risks. These are the ones Volentify is designed around, and the rules that answer them.">
        <div className="grid gap-4 lg:grid-cols-2">
          {ROLES.map((r) => (
            <article key={r.role} className="panel space-y-4 p-6">
              <div>
                <h3 className="text-2xl">{r.role}</h3>
                <p className="mt-1 text-sm text-stone">{r.who}</p>
              </div>
              <div>
                <p className="mb-2 text-[0.8125rem] font-medium text-high">Risks</p>
                <ul className="space-y-1.5 text-sm text-sand">{r.risks.map((x) => <li key={x} className="flex gap-2"><span className="text-ash">—</span>{x}</li>)}</ul>
              </div>
              <div>
                <p className="mb-2 text-[0.8125rem] font-medium text-low">Rules & safeguards</p>
                <ul className="space-y-1.5 text-sm text-sand">{r.rules.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-low" aria-hidden />{x}</li>)}</ul>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Who can do what" description="Enforced by the server on every request. NGO and command permissions apply only after an administrator verifies the account.">
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs text-stone">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Action</th>
                {['Citizen', 'Volunteer', 'NGO', 'Command'].map((h) => <th key={h} scope="col" className="px-4 py-3 text-center font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PERMISSIONS.map((p) => (
                <tr key={p.action}>
                  <th scope="row" className="px-4 py-3 font-normal text-sand">{p.action}</th>
                  {p.cells.map((c, i) => <td key={i} className="px-4 py-3 text-center"><Mark value={c} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="What the Volentify Mesh app enforces" description="Built into the Android app, and checked again by the server because phones can run old versions."
        actions={<ButtonLink href="/mesh" variant="secondary" size="sm">Get the app</ButtonLink>}>
        <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {APP_RULES.map(([k, v]) => (
            <div key={k} className="border-t border-line pt-4">
              <dt className="text-[0.9375rem] text-ivory">{k}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-stone">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="How the platform is secured">
        <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {SECURITY.map(([k, v]) => (
            <div key={k} className="border-t border-line pt-4">
              <dt className="flex items-center gap-2 text-[0.9375rem] text-ivory">{k}{k === 'What is not protected' && <Pill tone="warn">Limitation</Pill>}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-stone">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="The law behind these rules" description="A plain-language summary, not legal advice.">
        <div className="grid gap-4 md:grid-cols-2">
          {LAW.map((l) => (
            <article key={l.name} className="panel space-y-3 p-6">
              <h3 className="text-xl">{l.name}</h3>
              <ul className="space-y-2 text-sm leading-relaxed text-sand">{l.points.map((x) => <li key={x}>{x}</li>)}</ul>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Standard operating procedures">
        <div className="grid gap-4 lg:grid-cols-3">
          {SCENARIOS.map((s) => (
            <article key={s.name} className="panel space-y-3 p-6">
              <h3 className="text-xl">{s.name}</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-sand">{s.steps.map((x) => <li key={x}>{x}</li>)}</ol>
            </article>
          ))}
        </div>
        <p className="mt-8 flex items-start gap-2 text-sm text-stone">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-high" aria-hidden />
          See also the <Link href="/privacy" className="link">privacy notice</Link>, the <Link href="/terms" className="link">terms of use</Link> and the{' '}
          <Link href="/transparency" className="link">transparency page</Link>.
        </p>
      </Section>
    </>
  );
}
