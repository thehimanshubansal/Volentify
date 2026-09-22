'use client';

import React from 'react';
import { HeartHandshake, ShieldCheck, Globe, ExternalLink } from 'lucide-react';

export default function NgoPartnersPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-telemetry font-bold">
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>APPROVED HUMANITARIAN PARTNERS NETWORK</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          Registered NGO Partners
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-telemetry">
        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <h3 className="text-base font-bold text-tactical-text">Indian Red Cross Society</h3>
          <p className="text-xs text-tactical-muted">First-aid medical support, blood donation drives, and emergency kit distribution.</p>
          <span className="text-[10px] text-emerald-400 font-bold">VERIFIED NDMA PARTNER</span>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <h3 className="text-base font-bold text-tactical-text">Goonj Humanitarian Response</h3>
          <p className="text-xs text-tactical-muted">Relief material logistics, clothing, and post-disaster rehabilitation kits.</p>
          <span className="text-[10px] text-emerald-400 font-bold">VERIFIED VOLENTIFY PARTNER</span>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <h3 className="text-base font-bold text-tactical-text">Oxfam India Disaster Corps</h3>
          <p className="text-xs text-tactical-muted">Clean drinking water purification plants and hygiene kit distribution.</p>
          <span className="text-[10px] text-emerald-400 font-bold">VERIFIED VOLENTIFY PARTNER</span>
        </div>
      </div>
    </div>
  );
}
