'use client';

import React from 'react';
import Link from 'next/link';
import { HeartHandshake, ShieldCheck, Globe, ExternalLink, ArrowRight } from 'lucide-react';

export default function NgoPartnersPage() {
  const partners = [
    {
      name: 'Indian Red Cross Society',
      desc: 'First-aid medical triage support, emergency blood bank donation networks, and trauma relief kit distribution across coastal zones.',
      badge: 'VERIFIED NDMA PARTNER',
      focus: 'Medical & Triage'
    },
    {
      name: 'Goonj Humanitarian Response',
      desc: 'Disaster material logistics, dignified clothing distribution, and long-term community rehabilitation kits post-cyclone and flood.',
      badge: 'VERIFIED VOLENTIFY PARTNER',
      focus: 'Logistics & Clothing'
    },
    {
      name: 'Oxfam India Disaster Corps',
      desc: 'Rapid installation of clean drinking water purification plants, sanitation facilities, and emergency hygiene packs in submerged riverine districts.',
      badge: 'VERIFIED VOLENTIFY PARTNER',
      focus: 'Water & Sanitation'
    },
    {
      name: 'Doctors Without Borders (MSF)',
      desc: 'Mobile emergency health units, infectious disease control in relief camps, and rapid trauma surgical field deployments.',
      badge: 'GLOBAL HEALTH CORPS',
      focus: 'Emergency Medicine'
    },
    {
      name: 'Save the Children India',
      desc: 'Child protection in displacement shelters, emergency nutrition supplementation, and temporary learning centers.',
      badge: 'VERIFIED NDMA PARTNER',
      focus: 'Nutrition & Family'
    },
    {
      name: 'SEEDS India',
      desc: 'Resilient temporary shelter engineering, community disaster risk reduction training, and retrofitted emergency facilities.',
      badge: 'SHELTER ARCHITECTURE',
      focus: 'Shelter Engineering'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>APPROVED HUMANITARIAN PARTNERS NETWORK</span>
          </div>
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            Registered NGO Partners
          </h1>
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Collaborating with accredited relief organizations to mobilize verified volunteers, medical triage units, and food logistics at national scale.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/register"
            className="px-6 py-3.5 rounded-full bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs transition-all flex items-center space-x-2 shadow-lg"
          >
            <span>Register as NGO Partner</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map((p, idx) => (
          <div
            key={idx}
            className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-4 shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-bold">
                  {p.badge}
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {p.focus}
                </span>
              </div>
              <h3 className="font-serif text-2xl text-white font-normal leading-snug">
                {p.name}
              </h3>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                {p.desc}
              </p>
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-500">Direct GIS Integration</span>
              <span className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                Partner Desk →
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
