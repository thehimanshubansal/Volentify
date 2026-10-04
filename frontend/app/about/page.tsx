'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Sparkles, Code2, Heart, Award, ArrowUpRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-16">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>DISASTER INTELLIGENCE PLATFORM</span>
          </div>
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            About Volentify
          </h1>
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Pioneering humanitarian GIS engineering, real-time multi-spectral satellite telemetry, and rapid volunteer mobilization for India.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/map"
            className="px-6 py-3.5 rounded-full bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs transition-all flex items-center space-x-2 shadow-lg"
          >
            <span>Explore Live Platform</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Narrative Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <h2 className="heading-editorial text-3xl sm:text-4xl text-white">
            Architecture built for national crisis scale.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-light leading-relaxed">
            Volentify replaces fragmented emergency coordination with an open, resilient GIS telemetry stack. By streaming real-time observations from ISRO Bhuvan, Sentinel-2, and IMD radars alongside crowdsourced first-responder telemetry, we enable district authorities to dispatch certified volunteers in minutes instead of hours.
          </p>
          <div className="pt-2 font-mono text-xs text-slate-400 space-y-2">
            <div>• Sub-meter GIS accuracy across 720+ Indian districts</div>
            <div>• Real-time Haversine proximity & skill dispatch heuristics</div>
            <div>• 100% Zero-key open basemap infrastructure powered by Esri ArcGIS</div>
          </div>
        </div>

        <div className="lg:col-span-5 p-8 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-6">
          <h3 className="font-serif text-2xl text-white">Platform Tenets</h3>
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <strong className="text-white block font-sans text-sm mb-1">Humanity First</strong>
              <p className="text-slate-400 font-light">Every engineering decision is prioritized by the speed and clarity it provides to people in harm's way.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <strong className="text-white block font-sans text-sm mb-1">Radical Openness</strong>
              <p className="text-slate-400 font-light">Open data standards, open GIS layers, and non-proprietary satellite formats that work without paywalls.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
