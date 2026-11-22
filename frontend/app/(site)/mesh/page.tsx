import type { Metadata } from 'next';
import { Bluetooth, Download, ShieldCheck, Smartphone } from 'lucide-react';
import { latestMeshRelease, MESH_DOWNLOAD_PATH } from '@/lib/release';
import { ButtonLink } from '@/components/ui/Button';
import DownloadQr from './DownloadQr';

export const metadata: Metadata = {
  title: 'Volentify Mesh for Android',
  description: 'Relay field reports and messages phone-to-phone over Bluetooth when there is no mobile network.',
};
export const revalidate = 300;

const STEPS = [
  {
    title: 'Download the app',
    body: 'Tap the button on your Android phone, or scan the code from a computer. The file is about 2 MB.',
  },
  {
    title: 'Allow the install',
    body: 'Volentify Mesh is distributed directly, not through the Play Store. When Android asks, allow your browser to install apps. If Google Play Protect shows a warning, tap “More details” → “Install anyway”.',
  },
  {
    title: 'Open it and allow nearby devices',
    body: 'Grant Nearby devices (Bluetooth), Location and Notifications. Leave the relay switched on — it keeps passing reports while the phone is in your pocket.',
  },
  {
    title: 'It syncs on its own',
    body: 'Whenever the phone gets mobile data or Wi-Fi, every report it carries — its own and those relayed to it — uploads to this website and appears on the map and in the incident’s timeline. Responders can add a gateway token from their dashboard in the app’s Settings to mark uploads as verified.',
  },
];

const RULES = [
  ['Call 112 first', 'The mesh is best-effort and can take minutes to hours to reach responders.'],
  ['Report only what you see', 'False alarms are an offence (Disaster Management Act 2005, s.54). One report per situation — repeats are refused for a minute.'],
  ['Unverified until reviewed', 'Only messages marked “Official · Volentify command” come from verified command. Never forward rumours.'],
  ['No identity numbers', 'Aadhaar, PAN, bank and phone numbers are removed — reports pass through other people’s phones.'],
  ['Stay out of danger', 'Never enter flood water, damaged buildings or closed zones to file a report.'],
  ['Mask your location if you must', 'Shifts your position by up to 500 m. Switch it off if you need rescuers to find you.'],
] as const;

const TROUBLE = [
  { q: '“App not installed” or “package conflicts”', a: 'An earlier test build is on the phone with a different signature. Uninstall Volentify Mesh, then install again.' },
  { q: 'The file opens as unknown or won’t open', a: 'Open it from the browser’s Downloads list, or from Files → Downloads. Some phones need “Install unknown apps” enabled for the Files app instead of the browser.' },
  { q: 'No phones nearby', a: 'Bluetooth must be on and the relay switched on in both phones. Phones exchange reports within roughly 30–50 metres, more in open ground.' },
  { q: 'Reports stay on “Saved locally”', a: 'That is expected without signal. They move to Relayed when a nearby phone takes a copy, and to Server-confirmed once any phone carrying them reaches the internet.' },
];

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function MeshAppPage() {
  const release = await latestMeshRelease();
  return (
    <>
      <section className="page grid gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-2xl space-y-6">
          <p className="eyebrow">Volentify Mesh for Android</p>
          <h1 className="display text-balance text-[2.75rem] sm:text-6xl">When the towers go down, the phones become the network.</h1>
          <p className="text-[1.0625rem] leading-relaxed text-stone">
            Volentify Mesh saves field reports and short messages on the phone, hands copies to other phones over
            Bluetooth — up to five hops — and uploads everything the moment any one of them reaches the internet.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a href={MESH_DOWNLOAD_PATH} download
              className="inline-flex h-12 items-center gap-2 rounded-full bg-signal px-6 text-[0.9375rem] font-medium text-ink transition-colors hover:bg-signal-soft">
              <Download className="h-4 w-4" aria-hidden /> Download for Android
            </a>
            <p className="text-sm text-stone">
              {release ? <>Version {release.version} · {formatSize(release.size)} · Android 8.0 or newer</> : 'Android 8.0 or newer'}
            </p>
          </div>
        </div>
        <div className="hidden items-end gap-6 lg:flex">
          <DownloadQr />
        </div>
      </section>

      <section className="border-y border-line bg-ink-900/60">
        <div className="page grid gap-10 py-16 sm:grid-cols-3">
          {[
            { icon: Bluetooth, title: 'Works with no signal', body: 'Phones find each other over Bluetooth Low Energy and swap reports automatically. No Wi-Fi, SIM or internet needed.' },
            { icon: Smartphone, title: 'Nothing is lost', body: 'Reports live in the phone’s storage and survive the app closing or the phone restarting until the server confirms them.' },
            { icon: ShieldCheck, title: 'Private by design', body: 'Each phone uses a random ID, never its hardware address. You can mask your exact location by up to 500 m.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="space-y-3">
              <Icon className="h-5 w-5 text-gold" aria-hidden />
              <h2 className="text-2xl">{title}</h2>
              <p className="text-sm leading-relaxed text-stone">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page grid gap-14 py-20 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-3">
          <h2 className="display text-4xl">Install in four steps</h2>
          <p className="text-sm text-stone">About two minutes. Do it before you need it.</p>
        </div>
        <ol className="space-y-10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2.5rem_1fr] gap-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong font-serif text-lg text-gold">{i + 1}</span>
              <div className="space-y-1.5">
                <h3 className="text-2xl">{s.title}</h3>
                <p className="max-w-[62ch] leading-relaxed text-stone">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="page pb-16">
        <div className="panel grid gap-8 p-6 sm:p-8 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-3">
            <h2 className="text-[2rem] leading-tight">Before you use it</h2>
            <p className="text-sm text-stone">The app asks you to accept these on first launch.</p>
            <ButtonLink href="/safety" variant="secondary" size="sm">All safety rules</ButtonLink>
          </div>
          <ul className="grid gap-x-8 gap-y-4 text-sm leading-relaxed text-sand sm:grid-cols-2">
            {RULES.map(([title, body]) => (
              <li key={title}><span className="block text-ivory">{title}</span>{body}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="page pb-8">
        <h2 className="mb-6 text-[2rem]">If something goes wrong</h2>
        <dl className="grid gap-x-12 gap-y-8 md:grid-cols-2">
          {TROUBLE.map((t) => (
            <div key={t.q} className="space-y-1.5 border-t border-line pt-5">
              <dt className="text-ivory">{t.q}</dt>
              <dd className="text-sm leading-relaxed text-stone">{t.a}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-12 flex flex-wrap gap-3">
          <ButtonLink href="/dashboard" variant="secondary">Get a gateway token</ButtonLink>
          {release && <ButtonLink href={release.notesUrl} variant="ghost">Release notes</ButtonLink>}
        </div>
      </section>
    </>
  );
}
