'use client';

import React from 'react';
import { BookOpen, Clock, ShieldCheck, ExternalLink } from 'lucide-react';

export default function NewsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-telemetry font-bold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>VERIFIED SITUATION REPORTS & PRESS RELEASE</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          Situation Reports & News Feed
        </h1>
      </div>

      <div className="space-y-4 font-telemetry">
        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <div className="flex items-center justify-between text-xs text-tactical-muted">
            <span className="text-primary font-bold">NDMA OFFICIAL BULLETIN</span>
            <span>PUBLISHED 15 MINS AGO</span>
          </div>
          <h2 className="text-xl font-bold text-tactical-text">
            Cyclone Remal Track Update: Red Alert Extended Across 6 Coastal Odisha Districts
          </h2>
          <p className="text-xs text-tactical-muted leading-relaxed">
            The National Disaster Management Authority in coordination with IMD has updated the cyclone trajectory. NDRF teams have successfully evacuated 42,000 residents to concrete shelters.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <div className="flex items-center justify-between text-xs text-tactical-muted">
            <span className="text-blue-400 font-bold">ASSAM SDMA PRESS RELEASE</span>
            <span>PUBLISHED 1 HOUR AGO</span>
          </div>
          <h2 className="text-xl font-bold text-tactical-text">
            Brahmaputra Flood Relief Operations Reach 12,000 Stranded Villagers
          </h2>
          <p className="text-xs text-tactical-muted leading-relaxed">
            SDRF motorboats and Volentify volunteer corps deployed dry ration packs and water purification tablets across Kamrup district.
          </p>
        </div>
      </div>
    </div>
  );
}
