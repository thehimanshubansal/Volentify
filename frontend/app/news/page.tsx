'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Clock, ShieldCheck, ExternalLink, ArrowRight } from 'lucide-react';

export default function NewsPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
            <BookOpen className="w-3.5 h-3.5" />
            <span>VERIFIED SITUATION REPORTS & PRESS BULLETINS</span>
          </div>
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            Situation Reports & News Feed
          </h1>
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Continuous official press releases and ground situation updates from the National Disaster Management Authority and state emergency desks.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
              NDMA OFFICIAL BULLETIN
            </span>
            <div className="flex items-center space-x-1.5 font-mono text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>PUBLISHED 15 MINS AGO</span>
            </div>
          </div>
          
          <h2 className="font-serif text-2xl sm:text-3xl text-white font-normal leading-snug">
            Cyclone Remal Track Update: Red Alert Extended Across 6 Coastal Odisha Districts
          </h2>
          
          <p className="text-sm text-slate-400 font-light leading-relaxed">
            The National Disaster Management Authority in coordination with IMD has updated the storm trajectory. NDRF battalions in coordination with 480 Volentify registered first-responders have successfully relocated 42,000 residents from low-lying coastal huts to concrete multi-hazard shelters.
          </p>

          <div className="pt-2 flex items-center justify-end">
            <Link
              href="/alerts"
              className="text-xs text-primary hover:text-primary-hover font-semibold flex items-center space-x-1 transition-colors"
            >
              <span>View Active Crisis Alerts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-blue-400 uppercase tracking-wider">
              ASSAM SDMA PRESS RELEASE
            </span>
            <div className="flex items-center space-x-1.5 font-mono text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>PUBLISHED 1 HOUR AGO</span>
            </div>
          </div>
          
          <h2 className="font-serif text-2xl sm:text-3xl text-white font-normal leading-snug">
            Brahmaputra Flood Relief Operations Reach 12,000 Stranded Villagers in Kamrup
          </h2>
          
          <p className="text-sm text-slate-400 font-light leading-relaxed">
            SDRF motorized rescue boats and Volentify logistics volunteers distributed over 3,000 clean drinking water purification kits and dry rations across submerged riverine islands in Majuli and Barpeta.
          </p>

          <div className="pt-2 flex items-center justify-end">
            <Link
              href="/alerts"
              className="text-xs text-primary hover:text-primary-hover font-semibold flex items-center space-x-1 transition-colors"
            >
              <span>View Active Crisis Alerts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
