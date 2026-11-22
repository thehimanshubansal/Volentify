import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/Page';

export const metadata: Metadata = { title: 'Preparedness' };

type Phase = 'Before' | 'During' | 'After';
interface Hazard { id: string; name: string; summary: string; phases: Record<Phase, string[]> }

const HAZARDS: Hazard[] = [
  {
    id: 'cyclone', name: 'Cyclone',
    summary: 'The Bay of Bengal and Arabian Sea coasts face cyclones mainly in April–June and October–December. Storm surge, not wind, causes most deaths.',
    phases: {
      Before: [
        'Know your nearest cyclone shelter and the safest route to it on foot.',
        'Keep an emergency kit: drinking water for three days, dry food, medicines, torch, spare batteries, a power bank, copies of ID and documents in a waterproof bag.',
        'Follow IMD bulletins. A yellow message means watch, orange means alert, red means warning — act on orange.',
        'Secure loose roofing sheets and objects, trim weak branches and moor boats well inland.',
      ],
      During: [
        'Evacuate when the district administration asks, even if the weather looks calm. Low-lying coastal areas flood first.',
        'If you cannot leave, shelter in the strongest room away from windows. Switch off mains power and gas.',
        'Do not go out during the calm “eye” — winds return from the opposite direction within minutes.',
        'Keep a radio or phone on for official updates; save battery by closing other apps.',
      ],
      After: [
        'Wait for the all-clear before returning home.',
        'Stay away from fallen power lines and damaged buildings. Report them to the electricity board or 112.',
        'Drink only boiled, chlorinated or packaged water until supply is declared safe.',
        'Photograph damage before cleaning up — it helps with relief and insurance claims.',
      ],
    },
  },
  {
    id: 'flood', name: 'Flood',
    summary: 'River floods in Assam, Bihar and the Gangetic plain, flash floods in the hills and urban flooding after intense rain can all rise within hours.',
    phases: {
      Before: [
        'Find out whether your home lies in a flood-prone zone and where the nearest high ground or relief camp is.',
        'Raise electrical sockets, appliances and stored grain above the highest previous flood level.',
        'Keep important documents in sealed plastic and an emergency kit ready to carry.',
        'Note Central Water Commission river-level forecasts for your district during the monsoon.',
      ],
      During: [
        'Move to higher ground as soon as you are told to — do not wait for water to enter the house.',
        'Never walk or drive through moving water. Fifteen centimetres can knock you down; sixty can float a car.',
        'Switch off electricity at the main if water is entering. Do not touch electrical equipment if you are wet.',
        'If trapped, go to the highest floor or roof and signal with a bright cloth or torch. Report your location through Volentify or 112.',
      ],
      After: [
        'Return only when authorities say it is safe; floodwater can undermine foundations and roads.',
        'Treat everything floodwater touched as contaminated. Discard food and medicines that got wet.',
        'Watch for snakes and animals that sheltered indoors.',
        'Seek medical advice for fever, diarrhoea or skin infections — leptospirosis and cholera follow floods.',
      ],
    },
  },
  {
    id: 'landslide', name: 'Landslide',
    summary: 'The Western Ghats, the Himalaya and the north-east are most exposed, especially after several days of continuous heavy rain.',
    phases: {
      Before: [
        'Learn the warning signs: new cracks in walls or ground, tilting trees or poles, sudden muddy water in streams, rumbling sounds.',
        'Avoid building or camping at the base of steep slopes, on drainage paths or near old slide scars.',
        'During red rainfall warnings, plan to stay with relatives or at a camp away from the slope.',
      ],
      During: [
        'Move away from the path of the slide quickly, sideways rather than downhill.',
        'If you cannot escape, curl into a tight ball and protect your head.',
        'Avoid river valleys and low ground — slides can dam streams and trigger flash floods.',
      ],
      After: [
        'Stay away from the slide area; further slides are common.',
        'Check for injured or trapped people nearby without entering the slide, and direct rescuers to them.',
        'Report broken roads, utility lines and blocked streams to the district control room (1077).',
      ],
    },
  },
  {
    id: 'heatwave', name: 'Heatwave',
    summary: 'A heatwave is declared when temperatures are 4.5 °C or more above normal, or exceed 45 °C in the plains. Older people, infants, outdoor workers and people with chronic illness are most at risk.',
    phases: {
      Before: [
        'Follow IMD heat alerts and plan heavy work for early morning or evening.',
        'Keep ORS packets, a water bottle and a cotton cloth or cap ready.',
        'Identify a cool place you can reach — a shaded room, cooling centre or public building.',
      ],
      During: [
        'Drink water regularly even when not thirsty. Avoid alcohol, tea, coffee and sugary drinks.',
        'Stay indoors between 12:00 and 15:00. Wear light, loose cotton clothes.',
        'Never leave children or pets in parked vehicles.',
        'Check on elderly neighbours and people living alone twice a day.',
      ],
      After: [
        'Recognise heatstroke: hot dry skin, confusion, fainting or a body temperature above 40 °C. Call 108 immediately.',
        'While waiting, move the person to shade, loosen clothing, sponge with cool water and fan them. Do not give fluids if they are unconscious.',
      ],
    },
  },
  {
    id: 'earthquake', name: 'Earthquake',
    summary: 'Almost 59 % of India’s land is exposed to moderate or severe earthquakes, from the Himalaya to Gujarat and the north-east.',
    phases: {
      Before: [
        'Fix heavy furniture, cylinders and water heaters to walls. Store heavy objects on low shelves.',
        'Identify safe spots in each room: under a sturdy table, against an inner wall.',
        'Agree a family meeting point outside and an out-of-area contact everyone can call.',
      ],
      During: [
        'Drop, cover and hold on under a sturdy table until the shaking stops.',
        'Stay away from windows, glass and hanging objects. Do not run outside while the ground is shaking.',
        'If outdoors, move to open ground away from buildings, trees and power lines.',
        'If in a vehicle, stop away from bridges and overpasses and stay inside.',
      ],
      After: [
        'Expect aftershocks. Leave damaged buildings by the stairs, never the lift.',
        'Check for gas leaks by smell — do not use flames or switches if you suspect one.',
        'If trapped, tap on a pipe or wall or use a whistle; shout only as a last resort to avoid inhaling dust.',
        'Use text messages rather than calls so lines stay free for emergencies.',
      ],
    },
  },
  {
    id: 'fire', name: 'Fire',
    summary: 'Forest fires in Uttarakhand, Himachal and central India peak between February and June; urban fires are a year-round risk.',
    phases: {
      Before: [
        'Keep a fire extinguisher and know how to use it: pull, aim at the base, squeeze, sweep.',
        'Do not burn crop residue or leaves near forest edges during dry, windy weather.',
        'Plan two ways out of every room and keep exits clear.',
      ],
      During: [
        'Call 101. Leave immediately; do not stop to collect belongings.',
        'Stay low under smoke and feel doors before opening — a hot door means fire on the other side.',
        'If your clothes catch fire: stop, drop and roll.',
        'In a forest fire, move downhill and across the wind, towards areas already burned or with little vegetation.',
      ],
      After: [
        'Do not re-enter until the fire service says it is safe.',
        'Get medical care for burns and smoke inhalation, even if they seem minor.',
      ],
    },
  },
];

const PHASES: Phase[] = ['Before', 'During', 'After'];

export default function KnowledgePage() {
  return (
    <>
      <PageHeader
        label="Preparedness"
        title="What to do before, during and after a disaster."
        lede="Practical steps for households and volunteers, drawn from NDMA and IMD public guidance. If anyone is in danger right now, call 112."
      />
      <div className="page grid gap-14 pb-10 lg:grid-cols-[13rem_1fr]">
        <nav className="hidden lg:block" aria-label="Hazards">
          <ul className="sticky top-28 space-y-2 text-sm">
            {HAZARDS.map((h) => <li key={h.id}><a href={`#${h.id}`} className="text-stone hover:text-ivory">{h.name}</a></li>)}
          </ul>
        </nav>
        <div className="space-y-20">
          <nav className="flex flex-wrap gap-2 lg:hidden" aria-label="Hazards">
            {HAZARDS.map((h) => (
              <a key={h.id} href={`#${h.id}`} className="rounded-full px-3 py-1.5 text-[0.8125rem] text-sand ring-1 ring-inset ring-line-strong">{h.name}</a>
            ))}
          </nav>
          {HAZARDS.map((h) => (
            <section key={h.id} id={h.id} className="scroll-mt-28">
              <h2 className="text-5xl">{h.name}</h2>
              <p className="mt-4 max-w-[68ch] text-[1.0625rem] leading-[1.75] text-stone">{h.summary}</p>
              <div className="mt-8 grid gap-10 border-t border-line pt-8 md:grid-cols-3 md:gap-8">
                {PHASES.map((phase) => (
                  <div key={phase}>
                    <h3 className="mb-4 text-2xl">{phase}</h3>
                    <ul className="space-y-3">
                      {h.phases[phase].map((step) => (
                        <li key={step} className="flex gap-3 text-[0.9375rem] leading-[1.7] text-sand">
                          <span className="mt-[0.7rem] h-px w-3 shrink-0 bg-signal" aria-hidden />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <div className="border-t border-line pt-10 text-[0.9375rem] leading-relaxed text-stone">
            <p>
              Emergency numbers: national emergency <a href="tel:112" className="link">112</a>, ambulance{' '}
              <a href="tel:108" className="link">108</a>, fire <a href="tel:101" className="link">101</a>, NDMA{' '}
              <a href="tel:1078" className="link">1078</a>, district control room <a href="tel:1077" className="link">1077</a>.
            </p>
            <p className="mt-3">
              Seen something responders should know about? <Link href="/contact" className="link">Report an incident</Link>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
