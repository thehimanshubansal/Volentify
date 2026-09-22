'use client';

import React from 'react';
import { PhoneCall, Mail, MapPin, Send } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-telemetry">
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          Contact Command Center
        </h1>
        <p className="text-xs text-tactical-muted">Reach our 24x7 National Incident Operations Team.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
        <div className="p-6 rounded-2xl glass-panel space-y-4">
          <h3 className="text-sm font-bold text-primary">NATIONAL COMMAND HELPLINE</h3>
          <div className="space-y-2 text-tactical-text">
            <div>Emergency Hotline: 112</div>
            <div>NDRF Control Room: 011-24363260</div>
            <div>Volentify Tech Operations: ops@volentify.org</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <h3 className="text-sm font-bold text-primary">SEND DIRECT DISPATCH MESSAGE</h3>
          <input placeholder="Your Name" className="w-full p-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest" />
          <textarea rows={3} placeholder="Incident Query or Support Request" className="w-full p-2.5 rounded bg-surface-lowest text-tactical-text border border-surface-highest" />
          <button className="w-full py-2.5 rounded bg-primary text-surface-lowest font-bold">SEND MESSAGE</button>
        </div>
      </div>
    </div>
  );
}
