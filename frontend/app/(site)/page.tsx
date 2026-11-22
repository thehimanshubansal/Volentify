import Link from 'next/link';
import HomeHero from '@/components/home/HomeHero';
import MapPreview from '@/components/home/MapPreview';
import NgoPartnersSection from '@/components/home/NgoPartnersSection';
import { ButtonLink } from '@/components/ui/Button';

const MESH_STEPS = [
  {
    status: 'Saved locally',
    title: 'A volunteer records what they see',
    body: 'In a flooded village with no signal, the Volentify Mesh app saves a typed report — people trapped, a medical emergency, a resource request — with GPS where available. It survives the app closing and the phone restarting.',
  },
  {
    status: 'Relayed',
    title: 'Nearby phones carry it forward',
    body: 'The report hops phone to phone over Bluetooth Low Energy. Each relay stores it, drops duplicates by its event ID, and spends one hop of a five-hop budget so the network does not flood.',
  },
  {
    status: 'Syncing',
    title: 'The first phone with internet uploads it',
    body: 'Whichever device reaches a cell tower or a command camp becomes the gateway and sends its whole outbox over HTTPS, retrying with back-off until the server answers.',
  },
  {
    status: 'Server-confirmed',
    title: 'Command sees it on the map',
    body: 'The server stores each report exactly once and acknowledges the batch. Only then does the phone mark it confirmed. The report appears on the tactical map with a dashed ring until an incident controller reviews it.',
  },
];

export default function HomePage() {
  return (
    <>
      <HomeHero />

      <section className="page py-24 sm:py-32">
        <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-end">
          <h2 className="display text-balance text-5xl sm:text-6xl">The national picture, updated as it changes.</h2>
          <p className="text-[1.0625rem] leading-relaxed text-stone">
            Incident zones, field reports from the mesh, open missions, hospitals and shelters on one map. Switch to 3D terrain
            or orbit a sector in God’s Eye view.
          </p>
        </div>
        <MapPreview />
      </section>

      <section className="border-y border-line bg-ink-900/60">
        <div className="page grid gap-14 py-24 sm:py-32 lg:grid-cols-[22rem_1fr]">
          <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">Volentify Mesh</p>
            <h2 className="display text-5xl">Reports that outlive the network.</h2>
            <p className="leading-relaxed text-stone">
              When towers fail, the phones in the field become the network. Every report shows exactly where it is in its
              journey, so nobody mistakes “saved on my phone” for “command has it”.
            </p>
            <div className="space-y-2 pt-2">
              <ButtonLink href="/mesh">Get the Android app</ButtonLink>
              <p className="text-xs text-stone">Free · Android 8.0 or newer · Bluetooth LE</p>
            </div>
          </div>
          <ol className="relative space-y-12 border-l border-line pl-8 sm:pl-12">
            {MESH_STEPS.map((s, i) => (
              <li key={s.status} className="relative">
                <span className="absolute -left-[2.55rem] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-ink font-serif text-lg text-gold sm:-left-[3.55rem]">
                  {i + 1}
                </span>
                <p className="mb-2 inline-flex rounded-full px-2.5 py-0.5 text-xs text-signal ring-1 ring-inset ring-signal/30">{s.status}</p>
                <h3 className="mb-2 text-3xl">{s.title}</h3>
                <p className="max-w-[62ch] leading-relaxed text-stone">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page grid gap-14 py-24 sm:py-32 lg:grid-cols-2 lg:items-center">
        <figure className="overflow-hidden rounded-[1.75rem] border border-line">
          <img
            src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1400&q=80"
            alt="Volunteers coordinating relief supplies in the field"
            className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
            loading="lazy"
          />
        </figure>
        <div className="space-y-6">
          <p className="eyebrow">Dispatch</p>
          <h2 className="display text-5xl">The paramedic goes to the trauma ward, not the packing line.</h2>
          <p className="max-w-[60ch] leading-relaxed text-stone">
            The dispatch engine ranks every open mission by urgency and fills it with the closest qualified responder, weighing
            skill match, distance and how many missions each person already carries. Rare specialists are protected from
            generic work while anyone else can do it, and every shortfall is reported as a named bottleneck.
          </p>
          <ButtonLink href="/volunteer" variant="secondary">See the dispatch board</ButtonLink>
        </div>
      </section>

      <section className="page grid gap-14 pb-24 sm:pb-32 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6 lg:order-1">
          <p className="eyebrow">Forecasting and triage</p>
          <h2 className="display text-5xl">Read the storm before landfall. Read the message in any language.</h2>
          <p className="max-w-[60ch] leading-relaxed text-stone">
            The surge model estimates coastal storm-surge height and hazard probability from wind, rainfall, pressure, distance
            to the coast and tide. Laya triage reads distress messages in Hindi, Odia, Bengali, Tamil, Telugu, Malayalam and
            English, and flags trapped people, medical emergencies and supply needs — without generating text.
          </p>
          <ButtonLink href="/predictions" variant="secondary">Try the forecasting tools</ButtonLink>
        </div>
        <figure className="overflow-hidden rounded-[1.75rem] border border-line">
          <img
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80"
            alt="Earth from orbit at night"
            className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
            loading="lazy"
          />
        </figure>
      </section>

      <NgoPartnersSection />

      <section className="page">
        <div className="rounded-[2rem] border border-line bg-ink-900 px-6 py-16 sm:px-14 sm:py-20">
          <div className="max-w-3xl space-y-6">
            <h2 className="display text-balance text-5xl sm:text-6xl">Every response needs people who show up.</h2>
            <p className="max-w-[56ch] text-lg leading-relaxed text-stone">
              Register your skills and equipment once. When a mission near you needs them, you will see it first — and your
              muster pass gets you through the cordon.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <ButtonLink href="/register" size="lg">Create your account</ButtonLink>
              <ButtonLink href="/knowledge" size="lg" variant="ghost">Prepare your household</ButtonLink>
            </div>
            <p className="pt-4 text-sm text-stone">
              Agencies and NGOs: <Link href="/contact" className="link">talk to us about onboarding your teams</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
