'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Header */}
      <div className="space-y-4 pb-8 border-b border-white/[0.08]">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
          <Lock className="w-3.5 h-3.5" />
          <span>HUMANITARIAN DATA PRIVACY GOVERNANCE</span>
        </div>
        <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
          Privacy Policy & Location Protocols
        </h1>
        <p className="text-base text-slate-400 font-light leading-relaxed">
          How Volentify safeguards volunteer telemetry and citizen emergency requests during active crisis operations.
        </p>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-surface-card border border-white/[0.08] space-y-6 shadow-2xl">
        <div className="space-y-3">
          <h2 className="font-serif text-2xl text-white">Geolocation & Sensor Telemetry Protection</h2>
          <p className="text-sm text-slate-400 font-light leading-relaxed">
            Volentify adheres strictly to data minimization standards. Volunteer GPS coordinates and citizen SOS locations are encrypted in transit via TLS 1.3 and stored only for the operational duration of active disaster dispatches. Location coordinates are never sold, indexed for commercial advertising, or exposed to third parties.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-white/[0.06]">
          <h2 className="font-serif text-2xl text-white">Emergency Broadcast Phone & SMS Relays</h2>
          <p className="text-sm text-slate-400 font-light leading-relaxed">
            Phone numbers registered on Volentify are utilized exclusively for life-critical CAP (Common Alerting Protocol) SMS early warning broadcasts issued by state emergency operations centers.
          </p>
        </div>
      </div>

    </div>
  );
}
