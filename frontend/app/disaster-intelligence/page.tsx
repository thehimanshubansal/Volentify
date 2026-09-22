'use client';

import React from 'react';
import Link from 'next/link';
import { BrainCircuit, Layers, Activity, ShieldCheck, MapPin, Eye, Zap, Radio } from 'lucide-react';

export default function IntelligencePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-telemetry font-bold">
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>TACTICAL SATELLITE & SENSOR ANALYTICS</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          Disaster Intelligence Center
        </h1>
        <p className="text-xs sm:text-sm text-tactical-muted">
          Multi-spectral satellite telemetry, thermal hotspot detection, population vulnerability indices, and real-time river basin monitoring.
        </p>
      </div>

      {/* Main Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="p-6 rounded-2xl glass-panel space-y-3 font-telemetry">
          <div className="flex items-center justify-between text-primary">
            <Layers className="w-6 h-6" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20">INSAT-3DR STREAM</span>
          </div>
          <h3 className="text-base font-bold text-tactical-text">Coastal Storm Surge Model</h3>
          <p className="text-xs text-tactical-muted">
            Hydrodynamic ocean circulation model predicting 3.4m wave heights along Odisha sea front.
          </p>
          <div className="pt-2 text-xs font-bold text-primary">RISK FACTOR: CRITICAL</div>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3 font-telemetry">
          <div className="flex items-center justify-between text-emerald-400">
            <Zap className="w-6 h-6" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20">SENTINEL-2 INFRARED</span>
          </div>
          <h3 className="text-base font-bold text-tactical-text">Wildfire Thermal Hotspots</h3>
          <p className="text-xs text-tactical-muted">
            42 active thermal anomalies detected in Western Himalayas pine canopy.
          </p>
          <div className="pt-2 text-xs font-bold text-emerald-400 font-telemetry">THERMAL ANOMALY: HIGH</div>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3 font-telemetry">
          <div className="flex items-center justify-between text-blue-400">
            <Radio className="w-6 h-6" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20">CWC RIVER SENSORS</span>
          </div>
          <h3 className="text-base font-bold text-tactical-text">Brahmaputra Basin Water Level</h3>
          <p className="text-xs text-tactical-muted">
            Telemetry sensors indicate 1.82m rise over warning threshold at Pandu Station.
          </p>
          <div className="pt-2 text-xs font-bold text-blue-400">STATUS: OVERFLOW RISK</div>
        </div>

      </div>

      {/* High-Resolution GIS Satellite Mock Preview */}
      <div className="p-8 rounded-2xl bg-surface-low border border-surface-highest space-y-4 font-telemetry relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-tactical-text">INSAT-3DR VISIBLE & THERMAL COMPOSITE</h3>
            <p className="text-xs text-tactical-muted">Updated 4 mins ago | Spatial Resolution: 10m/pixel</p>
          </div>
          <Link
            href="/map"
            className="px-4 py-2 rounded bg-primary text-surface-lowest font-bold text-xs hover:bg-primary-tint transition-colors"
          >
            OPEN FULL GIS CANVAS
          </Link>
        </div>

        <div className="w-full h-80 rounded-xl bg-tactical-grid border border-surface-highest flex items-center justify-center relative">
          <div className="text-center space-y-2">
            <div className="inline-block p-4 rounded-full bg-primary/20 text-primary animate-pulse">
              <Eye className="w-8 h-8" />
            </div>
            <p className="text-xs text-tactical-muted font-mono">
              [SATELLITE RENDERER ACTIVE — 20.5937° N, 78.9629° E]
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
