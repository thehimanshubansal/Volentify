'use client';

import Link from 'next/link';
import { Download, ExternalLink } from 'lucide-react';
import reference from '@/lib/reference-data.json';
import { useApi } from '@/lib/api';
import { SEVERITY_META } from '@/lib/constants';
import type { Severity, TransparencyReport } from '@/lib/types';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import { Pill } from '@/components/ui/Badge';
import { ErrorState, LoadingRows, SourceTag } from '@/components/ui/DataState';
import { fmt, formatMinutes } from '@/app/(site)/(intelligence)/analytics/charts';

const CONTACT = 'gyanvirsingh09@gmail.com';
const REPO = 'https://github.com/Gyanvir/Volentify';
const PRACTICES = reference.transparency_practices as string[];

const SECTIONS = [
  { id: 'who', title: 'What Volentify is and who runs it', clause: 's.4(1)(b)(i), (ii), (xvi)' },
  { id: 'figures', title: 'Live accountability figures', clause: 's.4(1)(b)(xiv), s.4(2)' },
  { id: 'decisions', title: 'How decisions are made', clause: 's.4(1)(b)(iii), (iv)' },
  { id: 'data', title: 'Data we hold and for how long', clause: 's.4(1)(b)(vi)' },
  { id: 'rules', title: 'Rules that protect the public', clause: 's.4(1)(b)(v)' },
  { id: 'checklist', title: 'Good-practice checklist', clause: 's.4(1)–(4)' },
  { id: 'request', title: 'Request information', clause: 's.4(1)(b)(xv)' },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

const SOURCE_NAME: Record<string, string> = {
  GDACS: 'GDACS (EC Joint Research Centre and UN OCHA)',
  USGS: 'USGS Earthquake Hazards Program',
  'NASA EONET': 'NASA Earth Observatory (EONET)',
  Volentify: 'Entered by incident command',
};

const AUDIT_LABEL: Record<string, string> = {
  auth: 'Sign-ins and password changes',
  admin: 'Role and verification changes',
  task: 'Mission changes',
  alert: 'Alert broadcasts',
  mesh: 'Field-report decisions and phone quarantines',
  review: 'Ratings of responders',
};

const LEVELS: Severity[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

export default function TransparencyView() {
  const res = useApi<TransparencyReport>('/api/transparency');
  const r = res.data;
  const g = r?.governance;

  return (
    <div className="page grid gap-10 pb-20 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
      <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow mb-3">On this page</p>
        <ol className="space-y-2 border-l border-line text-sm">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-4 text-stone transition-colors hover:border-signal hover:text-ivory">
                <span className="code mr-2 text-ash">{i + 1}</span>{s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0 space-y-20">
        {/* 1 ───────────────────────────────────────────────────────── */}
        <Part id="who">
          <Prose>
            <p>
              Volentify is a disaster-intelligence and volunteer-response platform for India. It brings live hazard feeds, field
              reports relayed phone to phone by Volentify Mesh, and a register of skilled volunteers into one picture, so incident
              command can see what is happening and send the right people.
            </p>
          </Prose>
          <dl className="mt-8 divide-y divide-line border-y border-line">
            <Row term="Who runs it">
              An independent, open-source project. The code is public under the MIT licence at{' '}
              <a href={REPO} className="link" target="_blank" rel="noreferrer">github.com/Gyanvir/Volentify</a>, so
              anyone can check how every figure on this page is computed.
            </Row>
            <Row term="What it is not">
              A government body. Volentify does not issue official warnings; IMD, NDMA, state disaster management authorities and
              district administrations do. See the <Link href="/government" className="link">government agencies</Link> it works alongside.
            </Row>
            <Row term="Status under the RTI Act">
              The Right to Information Act, 2005 applies to public authorities: bodies set up by the Constitution or by law, or
              owned, controlled or substantially financed by government (s.2(h)). Volentify is none of these, so the Act does not
              oblige it to answer RTI applications. It publishes what s.4(1)(b) asks of public authorities voluntarily, and answers
              information requests on similar terms.
            </Row>
            <Row term="Information requests">
              <a href={`mailto:${CONTACT}?subject=Information%20request`} className="link break-all">{CONTACT}</a>
            </Row>
            <Row term="Response time">
              We aim to reply within 30 days, the limit the RTI Act sets for public authorities (s.7(1)).
            </Row>
            <Row term="Emergencies">
              Call <a href="tel:112" className="link">112</a>. The information address is not watched around the clock and is not
              a way to get help.
            </Row>
          </dl>
        </Part>

        {/* 2 ───────────────────────────────────────────────────────── */}
        <Part id="figures">
          <p className="max-w-[68ch] leading-relaxed text-sand">
            Aggregates only, computed from the platform’s own records each time this page loads (cached for one minute). No names,
            contact details, report text or exact locations are included. The same figures, with charts and monthly trends, are on{' '}
            <Link href="/analytics?view=impact" className="link">analytics</Link>.
          </p>
          {!r && res.loading && <LoadingRows rows={3} className="mt-8" />}
          {!r && !res.loading && (
            <ErrorState className="mt-8" message={res.error?.message ?? 'Figures are unavailable right now.'} onRetry={res.reload} />
          )}
          {r && (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone">
                <span>
                  Generated <time dateTime={r.generated_at} className="code text-sand">{formatDateTime(r.generated_at)}</time>{' '}
                  ({timeAgo(r.generated_at)})
                </span>
                <SourceTag source={res.source ?? r.data_source} />
                <a href="/api/transparency" download="volentify-transparency.json" className="inline-flex items-center gap-1.5 text-sand hover:text-ivory">
                  <Download className="h-3.5 w-3.5" aria-hidden />Download figures (JSON)
                </a>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Register title="Incidents tracked" rows={[
                  ['Total in the register', r.incidents.total],
                  ['Active now', r.incidents.active],
                  ['Closed', r.incidents.closed],
                  ...(r.incidents.total ? [['By source', null] as RowSpec] : []),
                  ...Object.entries(r.incidents.by_source).sort((a, b) => b[1] - a[1])
                    .map(([k, n]) => [SOURCE_NAME[k] ?? k, n, true] as RowSpec),
                ]} />
                <Register title="Alerts broadcast" note="Broadcasts by verified incident command. Automated advisories are not counted here."
                  rows={[
                    ['All time', r.alerts.broadcasts],
                    ['Last 30 days', r.alerts.last_30_days],
                    ['By level, all time', null],
                    ...LEVELS.map((l) => [`${SEVERITY_META[l].label} level`, r.alerts.by_level[l] ?? 0, true] as RowSpec),
                  ]} />
                <Register title="Field reports" note={<>Received over Volentify Mesh or the website. Median delay from observation to server: {formatMinutes(r.mesh.median_relay_minutes)}.</>}
                  rows={[
                    ['Received', r.mesh.events],
                    ['Looked at by a person', r.mesh.reviewed + r.mesh.promoted + r.mesh.rejected],
                    ['Turned into missions', r.mesh.promoted, true],
                    ['Rejected as false or duplicate', r.mesh.rejected, true],
                    ['Waiting for review', r.mesh.unreviewed],
                    ['Phones quarantined for false reports', r.mesh.blocked_nodes],
                  ]} />
                <Register title="Missions and outcomes" rows={[
                  ['Created', r.missions.total],
                  ['Dispatched (accepted by a responder)', r.missions.dispatched],
                  ['Completed', r.missions.completed],
                  ['Cancelled', r.missions.cancelled],
                  [<>People helped <Pill tone="gold" className="ml-1">responder-confirmed</Pill></>, r.people.helped_by_missions],
                  ['Volunteer hours on completed missions', r.missions.volunteer_hours],
                  [<>People reported rescued <Pill tone="warn" className="ml-1">unverified</Pill></>, r.people.rescues_reported],
                ]} note="The two people counts measure different things and must not be added together." />
                <Register title="Accounts" rows={[
                  ['Verified incident-command and NGO accounts', r.accounts.verified_elevated],
                  ['Registered volunteers', r.volunteers.registered],
                  ['of which verified', r.volunteers.verified, true],
                  ['All accounts', r.accounts.total],
                ]} />
                <Register title="Audit log, last 180 days" note="Every privileged or safety-relevant action is logged. Entries are hash-chained, so an edited or deleted entry is detectable."
                  rows={[
                    ['Entries', r.governance.audit_entries_180d],
                    ...(r.governance.audit_entries_180d ? [['By kind of action', null] as RowSpec] : []),
                    ...Object.entries(r.governance.audit_by_action).sort((a, b) => b[1] - a[1])
                      .map(([k, n]) => [AUDIT_LABEL[k] ?? k, n, true] as RowSpec),
                  ]} />
              </div>
            </>
          )}
        </Part>

        {/* 3 ───────────────────────────────────────────────────────── */}
        <Part id="decisions">
          <Prose>
            <h3>Who is sent to a mission</h3>
            <p>
              Dispatch follows a published scoring rule, not a hidden one. For each open mission, every available responder gets a
              score that rises with the mission’s urgency, with how rare the needed skill is, and with how well the responder’s
              certified skills match (exact, related, or general help only). It falls with distance, halving at 15 km, and with
              the number of missions the responder already has. Specialists score lower on general tasks so they stay free for work
              only they can do. The most urgent missions are filled first, and a responder still has to accept. The formula and a
              live run are on the <Link href="/volunteer">volunteer dispatch page</Link>.
            </p>
            <h3>Who can issue alerts</h3>
            <p>
              Only incident-command accounts that an administrator has verified can broadcast an alert. Volentify also generates
              automated advisories from live-feed incidents; these are always labelled as automated, name their source, and are
              not official warnings. Official warnings come from IMD, NDMA’s SACHET system, CWC and INCOIS.
            </p>
            <h3>How field reports are reviewed</h3>
          </Prose>
          <ol className="mt-5 grid max-w-[68ch] gap-3 sm:grid-cols-2">
            {[
              ['Unverified', 'Every report starts here and is labelled unverified. Casualty and medical details are visible only to verified command and NGO accounts.', 'dashed'],
              ['Reviewed', 'A person has looked at the report.', 'solid'],
              ['Turned into a mission', 'The report has become a mission that responders can accept.', 'gold'],
              ['Rejected', 'Judged false or a duplicate, and hidden from public views.', 'muted'],
            ].map(([t, body, ring]) => (
              <li key={t} className="panel flex gap-3 p-4">
                <span aria-hidden className={cn('mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2',
                  ring === 'dashed' && 'border-dashed border-sand', ring === 'solid' && 'border-sand',
                  ring === 'gold' && 'border-gold', ring === 'muted' && 'border-ash')} />
                <div>
                  <p className="font-medium text-ivory">{t}</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Prose className="mt-5">
            <p>
              Responders, NGO partners and incident command can mark a report reviewed or turn it into a mission. Only verified
              command and NGO accounts can reject a report or quarantine the phone that sent it. Every decision is written to the
              audit log.
            </p>
            <h3>How a mission runs</h3>
            <p>
              A mission is open until a responder accepts it, then started, then completed or cancelled. A responder who accepts but
              does not start within {g ? `${g.mission_start_limit_minutes} minutes` : 'the time limit'} is released and the mission
              returns to the pool, so nobody can hold a mission they cannot attend. On completion the responder records how many
              people were helped; that is the responder-confirmed figure above.
            </p>
          </Prose>
        </Part>

        {/* 4 ───────────────────────────────────────────────────────── */}
        <Part id="data">
          <div className="relative max-w-full overflow-x-auto rounded-2xl border border-line" role="region" aria-label="Records and retention" tabIndex={0}>
            <table className="w-full min-w-[38rem] text-left text-sm">
              <thead className="bg-ink-900 text-stone">
                <tr>
                  <th scope="col" className="w-[11rem] px-4 py-2.5 font-normal">Record</th>
                  <th scope="col" className="px-4 py-2.5 font-normal">What it holds</th>
                  <th scope="col" className="px-4 py-2.5 font-normal">How long we keep it</th>
                </tr>
              </thead>
              <tbody className="align-top leading-relaxed">
                <RetentionRow record="Field reports (mesh and website)"
                  holds="Type, priority, when it was observed and received, location, number of people, needs, and a short note. Aadhaar, PAN, card, bank and phone numbers are removed from the note before it is stored or relayed."
                  keep={<>Minimised once a report is {g ? <strong>{g.report_retention_days} days</strong> : 'a set number of days'} old and its incident is closed (or it was never linked to one): the note is deleted and the location rounded to about 1 km. The minimised record stays in the response history.</>} />
                <RetentionRow record="Reports on phones"
                  holds="Reports a phone created or relayed with Volentify Mesh."
                  keep={<>Until the server confirms them, then <strong>72 hours</strong>, then deleted from the phone.</>} />
                <RetentionRow record="Audit log"
                  holds="Who did what and when: sign-ins, role and verification changes, alert broadcasts, mission changes, review decisions and quarantines. No report text or contact details."
                  keep={<>At least {g ? <strong>{g.audit_retention_days} days</strong> : 'the required period'}, as CERT-In’s directions of 28 April 2022 require for logs. Volentify does not currently delete audit entries.</>} />
                <RetentionRow record="Missions and alerts"
                  holds="Mission details and status times, people helped and outcome notes; alert text, level and area."
                  keep="Kept as the record of the response, so decisions can be reviewed afterwards." />
                <RetentionRow record="Accounts"
                  holds="Name, email, mobile number and the role details you gave at onboarding."
                  keep="While your account is active. On request we delete your profile and onboarding details, keeping only what the audit record needs." />
              </tbody>
            </table>
          </div>
          <Prose className="mt-6">
            <p>
              We do not sell personal data or use it for advertising. The <Link href="/privacy">privacy notice</Link> explains what
              each role shares and with whom.
            </p>
            <p>
              Under the <strong>Digital Personal Data Protection Act, 2023</strong> you can ask us for a summary of the personal data we
              hold about you and who it has been shared with (s.11), have it corrected, completed or erased (s.12), and have a
              grievance addressed (s.13). Write to <a href={`mailto:${CONTACT}?subject=DPDP%20request`}>{CONTACT}</a>.
            </p>
          </Prose>
        </Part>

        {/* 5 ───────────────────────────────────────────────────────── */}
        <Part id="rules">
          <ul className="grid gap-4 md:grid-cols-2">
            <RuleCard title="False alarms are an offence">
              Section 54 of the Disaster Management Act, 2005 makes it an offence to make or circulate a false alarm or warning about
              a disaster, or its severity or magnitude, that leads to panic, punishable with up to one year’s imprisonment or a fine.
              Command can reject a deliberately false report and quarantine the phone that sent it, after which its uploads are
              dropped.{r ? ` ${fmt(r.mesh.blocked_nodes)} ${r.mesh.blocked_nodes === 1 ? 'phone is' : 'phones are'} quarantined now.` : ''}
            </RuleCard>
            <RuleCard title="Only verified command issues official alerts">
              Broadcasting an alert needs a verified incident-command account. A phone cannot mark its own message as official: the
              fields that identify official or automated messages are set only by the server, so a mesh message cannot pass itself
              off as incident command.
            </RuleCard>
            <RuleCard title="Missions are not held by absent responders">
              A mission accepted but not started within {g ? `${g.mission_start_limit_minutes} minutes` : 'the time limit'} returns to
              the open pool and the release is logged.
            </RuleCard>
            <RuleCard title="Priority and privacy are checked on the server">
              Critical priority is kept for life-safety reports (people trapped or missing, medical emergencies, fire and flooding);
              anything else is capped at high. Identity and contact numbers are removed from report text. The server applies these
              rules again because a phone may run an older app.
            </RuleCard>
          </ul>
          <p className="mt-6 text-sm text-stone">
            The full rules for reporters and responders are on the <Link href="/safety" className="link">safety page</Link>.
          </p>
        </Part>

        {/* 6 ───────────────────────────────────────────────────────── */}
        <Part id="checklist">
          <p className="max-w-[68ch] leading-relaxed text-sand">
            What good proactive disclosure looks like in disaster response, drawn from the RTI Act and related rules. It is a fair
            standard for any agency or platform in a response, Volentify included.
          </p>
          <ol className="mt-6 max-w-[72ch] divide-y divide-line border-y border-line">
            {PRACTICES.map((p, i) => (
              <li key={i} className="grid grid-cols-[2rem_1fr] gap-3 py-4">
                <span className="code pt-0.5 text-ash">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-[0.9375rem] leading-relaxed text-sand">{p}</p>
              </li>
            ))}
          </ol>
        </Part>

        {/* 7 ───────────────────────────────────────────────────────── */}
        <Part id="request">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="panel p-5 sm:p-6" aria-labelledby="ask-us">
              <h3 id="ask-us" className="text-2xl leading-tight">Ask Volentify</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-[0.9375rem] leading-relaxed text-sand">
                <li>Aggregate figures beyond this page, such as missions or reports by state or month.</li>
                <li>A summary of the personal data we hold about you, and who it was shared with.</li>
                <li>Correction, completion or erasure of your personal data.</li>
                <li>Reasons for a decision that affected you, such as why a report you sent was rejected.</li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-stone">
                We will not release personal data about other people, the contents of individual reports, or the exact location of
                anyone in them.
              </p>
              <p className="mt-5 text-sm text-sand">
                Write to <a href={`mailto:${CONTACT}?subject=Information%20request`} className="link break-all">{CONTACT}</a>. For your
                own data, include the email or phone number on your account. We aim to reply within 30 days.
              </p>
            </section>
            <section className="panel p-5 sm:p-6" aria-labelledby="ask-gov">
              <h3 id="ask-gov" className="text-2xl leading-tight">Government records</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-[0.9375rem] leading-relaxed text-sand">
                <li>
                  For central bodies such as NDMA, NDRF, IMD or the Ministry of Home Affairs, file an RTI application online at{' '}
                  <a href="https://rtionline.gov.in" target="_blank" rel="noreferrer" className="link">
                    rtionline.gov.in<ExternalLink className="ml-1 inline h-3 w-3" aria-hidden />
                  </a>. The fee is ₹10; applicants below the poverty line are exempt.
                </li>
                <li>
                  For state and district bodies (State Disaster Management Authorities, relief commissioners, district collectorates
                  and emergency operation centres), apply to that body’s Public Information Officer. Many states run their own RTI portals.
                </li>
                <li>
                  Public authorities must reply within 30 days, or within 48 hours where the information concerns a person’s life or
                  liberty (s.7(1)).
                </li>
              </ul>
            </section>
          </div>
        </Part>
      </div>
    </div>
  );
}

/* ─── Pieces ─────────────────────────────────────────────────────────── */

function Part({ id, children }: { id: SectionId; children: React.ReactNode }) {
  const i = SECTIONS.findIndex((s) => s.id === id);
  const s = SECTIONS[i];
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <p className="eyebrow flex flex-wrap items-baseline gap-x-3">
        <span>Section {i + 1}</span>
        <span className="code" title="Corresponding clause of the RTI Act, 2005">RTI Act {s.clause}</span>
      </p>
      <h2 id={`${id}-title`} className="mt-2 text-[2rem] leading-tight sm:text-[2.25rem]">{s.title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'max-w-[68ch] space-y-4 leading-[1.75] text-sand',
      '[&_h3]:pt-4 [&_h3]:text-2xl [&_h3]:leading-tight [&_h3:first-child]:pt-0',
      '[&_a]:text-ivory [&_a]:underline [&_a]:decoration-line-strong [&_a]:underline-offset-4 hover:[&_a]:decoration-signal',
      '[&_strong]:font-medium [&_strong]:text-ivory',
      className,
    )}>
      {children}
    </div>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
      <dt className="text-sm text-stone">{term}</dt>
      <dd className="max-w-[60ch] leading-relaxed text-sand">{children}</dd>
    </div>
  );
}

/** [label, value, indented?]; a null value makes the row a group label for the indented rows after it. */
type RowSpec = [React.ReactNode, number | null, boolean?];

function Register({ title, rows, note }: { title: string; rows: RowSpec[]; note?: React.ReactNode }) {
  return (
    <section className="panel flex flex-col p-5 sm:p-6" aria-label={title}>
      <h3 className="text-xl leading-tight">{title}</h3>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {rows.map(([label, value, sub], i) => value === null ? (
            <tr key={i} className="border-t border-line first:border-t-0">
              <th scope="colgroup" colSpan={2} className="pb-1 pt-3 text-left text-xs font-normal text-stone">{label}</th>
            </tr>
          ) : (
            <tr key={i} className="border-t border-line first:border-t-0">
              <th scope="row" className={cn('py-2 pr-4 text-left font-normal', sub ? 'pl-4 text-stone' : 'text-sand')}>{label}</th>
              <td className="py-2 text-right tabular-nums text-ivory">{fmt(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="mt-3 text-xs leading-relaxed text-stone">{note}</p>}
    </section>
  );
}

function RetentionRow({ record, holds, keep }: { record: string; holds: React.ReactNode; keep: React.ReactNode }) {
  return (
    <tr className="border-t border-line">
      <th scope="row" className="px-4 py-3 text-left font-medium text-ivory">{record}</th>
      <td className="px-4 py-3 text-sand">{holds}</td>
      <td className="px-4 py-3 text-sand [&_strong]:font-medium [&_strong]:text-ivory">{keep}</td>
    </tr>
  );
}

function RuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="panel list-none p-5 sm:p-6">
      <h3 className="text-xl leading-tight">{title}</h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-sand">{children}</p>
    </li>
  );
}
