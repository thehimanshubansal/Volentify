'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, ShieldCheck, PhoneCall, Globe, ArrowRight } from 'lucide-react';

export default function GovernmentPage() {
  const agencies = [
    {
      name: 'National Disaster Management Authority (NDMA)',
      desc: 'The apex statutory body for framing policies, plans, and guidelines for disaster management in India under the Disaster Management Act, 2005.',
      phone: '011-26701700',
      role: 'Policy & National Command'
    },
    {
      name: 'National Disaster Response Force (NDRF)',
      desc: 'A specialized, dedicated multi-disciplinary force equipped with deep-diving equipment, canine search units, and flood rescue motorboats.',
      phone: '011-24363260',
      role: 'Search & Rescue Deployment'
    },
    {
      name: 'India Meteorological Department (IMD)',
      desc: 'Primary agency responsible for meteorological observations, weather forecasting, tropical cyclone tracking, and seismology alerts.',
      phone: '1800-180-1717',
      role: 'Weather & Cyclone Early Warning'
    },
    {
      name: 'Central Water Commission (CWC)',
      desc: 'Monitors river flood gauges, hydrological telemetry, and dam reservoir capacities across major Indian river basins.',
      phone: '011-26105594',
      role: 'Hydrology & Flood Gauges'
    },
    {
      name: 'National Remote Sensing Centre (NRSC / ISRO)',
      desc: 'Provides satellite data acquisition, aerial survey, and digital image processing for disaster management support programs via Bhuvan.',
      phone: '040-23884000',
      role: 'Satellite GIS Telemetry'
    },
    {
      name: 'State Disaster Management Authorities (SDMAs)',
      desc: 'Decentralized state-level executive bodies coordinating district magistrates, local emergency operations centers, and first responder deployments.',
      phone: 'Dial 112 (Statewide)',
      role: 'District Ground Operations'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
            <Building2 className="w-3.5 h-3.5" />
            <span>GOVERNMENT & INSTITUTIONAL INTEGRATION</span>
          </div>
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            Government & Disaster Authorities
          </h1>
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Connecting district emergency operation centers (EOCs) directly with real-time GIS telemetry and verified volunteer networks.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/register"
            className="px-6 py-3.5 rounded-full bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs transition-all flex items-center space-x-2 shadow-lg"
          >
            <span>Register as Agency / EOC</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agencies.map((agency, idx) => (
          <div
            key={idx}
            className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-4 shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-3">
              <span className="font-mono text-[10px] text-primary uppercase tracking-widest block font-semibold">
                {agency.role}
              </span>
              <h3 className="font-serif text-2xl text-white font-normal leading-snug">
                {agency.name}
              </h3>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                {agency.desc}
              </p>
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between font-mono text-xs">
              <span className="text-slate-500">Helpline:</span>
              <span className="text-white font-bold">{agency.phone}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
