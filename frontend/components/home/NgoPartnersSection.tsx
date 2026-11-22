'use client';

import Link from 'next/link';
import { BadgeCheck, Building2, LifeBuoy, MapPin, Stethoscope, Tent, Utensils, ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Badge';

interface PartnerProfile {
  id: string;
  name: string;
  category: string;
  district: string;
  state: string;
  darpanId: string;
  capacityTitle: string;
  capacityValue: string;
  fleet: string;
  icon: typeof LifeBuoy;
}

const PILOT_PARTNERS: PartnerProfile[] = [
  {
    id: 'coastal-rescue',
    name: 'Coastal Disaster Relief Trust',
    category: 'Flood & Cyclone Evacuation',
    district: 'Puri',
    state: 'Odisha',
    darpanId: 'OD/2021/028491',
    capacityTitle: 'Evacuation quota',
    capacityValue: '1,200 people / 24h',
    fleet: '14 Inflatable rescue boats · 85 certified crew',
    icon: LifeBuoy,
  },
  {
    id: 'trauma-med',
    name: 'Aapda Rahat Swasthya Unit',
    category: 'Emergency Trauma & Medical',
    district: 'Dehradun',
    state: 'Uttarakhand',
    darpanId: 'UA/2022/019482',
    capacityTitle: 'Mobile medical quota',
    capacityValue: '450 field stabilisations / day',
    fleet: '4 Mobile trauma ICU vans · 22 paramedics',
    icon: Stethoscope,
  },
  {
    id: 'annapurna-food',
    name: 'Annapurna Community Kitchens',
    category: 'Mass Nutrition & Potable Water',
    district: 'Vijayawada',
    state: 'Andhra Pradesh',
    darpanId: 'AP/2020/007321',
    capacityTitle: 'Nutrition supply',
    capacityValue: '6,000 hot meals & 10k L water / day',
    fleet: '2 Field kitchens · 3 Water purification trucks',
    icon: Utensils,
  },
  {
    id: 'ashray-shelter',
    name: 'Ashray Displaced Shelter Foundation',
    category: 'Temporary Shelter & Sanitation',
    district: 'Silchar',
    state: 'Assam',
    darpanId: 'AS/2023/031094',
    capacityTitle: 'Emergency shelter',
    capacityValue: '1,400 bed capacity',
    fleet: '350 All-weather tents · 1,500 bedding kits',
    icon: Tent,
  },
];

export default function NgoPartnersSection() {
  return (
    <section className="border-t border-line bg-ink-900/40 py-24 sm:py-32">
      <div className="page space-y-14">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-3">
              <p className="eyebrow">Humanitarian network</p>
              <Pill tone="good" dot>Open pilot network</Pill>
            </div>
            <h2 className="display text-balance text-4xl sm:text-5xl lg:text-6xl">
              Relief organisations coordinating on the platform.
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-stone">
              Verified NGOs, civil defense trusts, and humanitarian teams declare daily relief quotas, deploy supplies,
              and fill mission shortages with vetted local volunteers.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ButtonLink href="/ngo-partners" variant="secondary">
              View partner directory <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>

        {/* 4 Representative NGO Partner Cards */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PILOT_PARTNERS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className="group panel relative flex flex-col justify-between p-6 transition-all duration-300 hover:border-line-strong hover:bg-ink-900/80"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink-950 text-gold shadow-sm">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified NGO
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-2xl leading-snug text-ivory group-hover:text-gold transition-colors">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-signal">{p.category}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-stone">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      {p.district}, {p.state}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3 border-t border-line pt-4 text-xs">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-stone">{p.capacityTitle}</p>
                    <p className="mt-0.5 font-medium text-sand">{p.capacityValue}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-stone">Dedicated fleet</p>
                    <p className="mt-0.5 text-stone/90 leading-relaxed">{p.fleet}</p>
                  </div>
                  <div className="pt-1">
                    <span className="code text-[10px] text-stone">DARPAN: {p.darpanId}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Onboarding Callout Banner */}
        <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-gradient-to-br from-ink-900 via-ink-900/90 to-ink-950 p-8 sm:p-10">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2 text-gold">
                <Building2 className="h-5 w-5" aria-hidden />
                <span className="text-xs font-semibold tracking-wider uppercase">Are you a registered relief organisation?</span>
              </div>
              <h3 className="display text-3xl sm:text-4xl text-ivory">
                Join our open humanitarian pilot network.
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-stone">
                Register with your NGO Darpan ID to declare daily relief capacity, request dispatch-matched volunteers,
                and access live field intelligence during regional emergencies.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/register" size="lg">
                Register your organisation
              </ButtonLink>
              <ButtonLink href="/ngo-partners" size="lg" variant="secondary">
                How partnership works
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
