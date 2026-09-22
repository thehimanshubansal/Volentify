'use client';

import React from 'react';
import { Building2, ShieldCheck, PhoneCall, Globe } from 'lucide-react';

export default function GovernmentPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-secondary/30 border border-secondary-bright/40 text-secondary-bright text-xs font-telemetry font-bold">
          <Building2 className="w-3.5 h-3.5" />
          <span>GOVERNMENT & INSTITUTIONAL INTEGRATION</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          Government & Disaster Authorities
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-telemetry">
        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <h3 className="text-base font-bold text-tactical-text">National Disaster Management Authority (NDMA)</h3>
          <p className="text-xs text-tactical-muted">Apex body for disaster policy framing and emergency guidelines in India.</p>
          <div className="text-xs text-primary">Helpline: 011-26701700</div>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <h3 className="text-base font-bold text-tactical-text">National Disaster Response Force (NDRF)</h3>
          <p className="text-xs text-tactical-muted">Specialized force for rescue and relief operations during natural and man-made disasters.</p>
          <div className="text-xs text-primary">Control Room: 011-24363260</div>
        </div>
      </div>
    </div>
  );
}
