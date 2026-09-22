'use client';

import React from 'react';
import { BookOpen, ShieldAlert, Waves, Wind, Flame, CheckCircle } from 'lucide-react';

export default function KnowledgePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-telemetry font-bold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>NATIONAL DISASTER PREPAREDNESS KNOWLEDGE BASE</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          Disaster Safety Guidelines & Protocols
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-telemetry">
        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <Wind className="w-6 h-6 text-primary" />
          <h3 className="text-base font-bold text-tactical-text">Cyclone Safety Protocol</h3>
          <p className="text-xs text-tactical-muted">Secure loose roof sheets, stock 72h water, switch off main electricity grid during landfall.</p>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <Waves className="w-6 h-6 text-blue-400" />
          <h3 className="text-base font-bold text-tactical-text">Flood Evacuation Steps</h3>
          <p className="text-xs text-tactical-muted">Move to upper floors or designated elevated shelters. Avoid wading in moving water.</p>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <Flame className="w-6 h-6 text-emergency" />
          <h3 className="text-base font-bold text-tactical-text">Forest Fire Prevention</h3>
          <p className="text-xs text-tactical-muted">Maintain firebreaks, report smoke anomalies immediately to forest range officers.</p>
        </div>
      </div>
    </div>
  );
}
