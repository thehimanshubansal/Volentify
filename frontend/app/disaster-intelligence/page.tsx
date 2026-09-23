'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BrainCircuit, 
  Layers, 
  Activity, 
  ShieldCheck, 
  MapPin, 
  Eye, 
  Zap, 
  Radio, 
  Satellite, 
  Flame, 
  Waves, 
  Wind,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface BhuvanBulletin {
  id: string;
  agency: string;
  title: string;
  published_at: string;
  summary: string;
  hazard_type: string;
  state: string;
  severity: string;
  satellite_source: string;
  wms_url: string;
}

export default function IntelligencePage() {
  const [bulletins, setBulletins] = useState<BhuvanBulletin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bhuvan/bulletins')
      .then(res => res.json())
      .then((data: BhuvanBulletin[]) => {
        if (Array.isArray(data)) {
          setBulletins(data);
        }
      })
      .catch(err => console.error('Error loading Bhuvan bulletins:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-telemetry">
      
      {/* Page Header */}
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold">
          <Satellite className="w-3.5 h-3.5 animate-pulse" />
          <span>ISRO BHUVAN & NRSC MULTI-SPECTRAL DISASTER TELEMETRY</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          Satellite Disaster Intelligence Hub
        </h1>
        <p className="text-xs sm:text-sm text-tactical-muted font-sans max-w-3xl">
          National Remote Sensing Centre (NRSC), Space Applications Centre (SAC), and MOSDAC INSAT-3DR multi-spectral thermal, hydrological, and oceanographic radar monitoring.
        </p>
      </div>

      {/* Main Satellite Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: INSAT-3DR Storm Surge */}
        <div className="p-6 rounded-2xl bg-surface-low border border-surface-highest space-y-3 shadow-tactical">
          <div className="flex items-center justify-between text-primary">
            <Layers className="w-6 h-6" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20">INSAT-3DR RAPID SCAN</span>
          </div>
          <h3 className="text-base font-bold text-tactical-text">Coastal Storm Surge & Gale Telemetry</h3>
          <p className="text-xs text-tactical-muted font-sans leading-relaxed">
            Hydrodynamic ocean circulation model predicting 3.4m wave heights along Odisha sea front with sustained gale velocities.
          </p>
          <div className="pt-2 text-xs font-bold text-primary">RISK FACTOR: CRITICAL</div>
        </div>

        {/* Card 2: ISRO / FSI Forest Fire Hotspots */}
        <div className="p-6 rounded-2xl bg-surface-low border border-surface-highest space-y-3 shadow-tactical">
          <div className="flex items-center justify-between text-emergency">
            <Flame className="w-6 h-6" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emergency/20 text-emergency">MODIS & VIIRS / NRSC</span>
          </div>
          <h3 className="text-base font-bold text-tactical-text">Thermal Hotspot Anomaly Tracking</h3>
          <p className="text-xs text-tactical-muted font-sans leading-relaxed">
            48 active thermal fire anomalies identified across Garhwal Himalayas pine forest slopes using shortwave infrared.
          </p>
          <div className="pt-2 text-xs font-bold text-emergency">THERMAL ANOMALY: HIGH</div>
        </div>

        {/* Card 3: CWC & RISAT-SAR Flood Inundation */}
        <div className="p-6 rounded-2xl bg-surface-low border border-surface-highest space-y-3 shadow-tactical">
          <div className="flex items-center justify-between text-blue-400">
            <Waves className="w-6 h-6" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20">RISAT-SAR & CWC SENSORS</span>
          </div>
          <h3 className="text-base font-bold text-tactical-text">Brahmaputra Basin Flood Inundation</h3>
          <p className="text-xs text-tactical-muted font-sans leading-relaxed">
            Synthetic Aperture Radar (SAR) indicates 42,000 hectares submerged across Kamrup. River level +1.85m over red mark.
          </p>
          <div className="pt-2 text-xs font-bold text-blue-400">STATUS: OVERFLOW ACTIVE</div>
        </div>

      </div>

      {/* ISRO Bhuvan Live Bulletins Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-primary animate-pulse" />
            <h2 className="text-lg font-bold text-tactical-text">
              ISRO Bhuvan / NRSC Disaster Bulletins
            </h2>
          </div>
          <span className="text-xs text-tactical-muted font-sans">Source: ISRO Disaster Management Support Program</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bulletins.map((bulletin) => (
            <div
              key={bulletin.id}
              className="p-5 rounded-2xl bg-surface-low border border-surface-highest hover:border-primary/50 transition-all space-y-3 shadow-tactical"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-primary font-bold px-2 py-0.5 rounded bg-primary/20">
                  {bulletin.agency}
                </span>
                <span className="text-[10px] text-tactical-muted">{bulletin.published_at}</span>
              </div>

              <h3 className="text-sm font-bold text-tactical-text">
                {bulletin.title}
              </h3>

              <p className="text-xs text-tactical-muted font-sans leading-relaxed">
                {bulletin.summary}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-surface-highest text-[10px]">
                <div className="flex items-center space-x-2">
                  <span className="text-tactical-muted">SENSOR:</span>
                  <span className="font-bold text-tactical-text">{bulletin.satellite_source}</span>
                </div>

                <Link
                  href="/map"
                  className="text-primary hover:text-primary-tint font-bold flex items-center space-x-1"
                >
                  <span>VIEW ON GIS</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-Resolution GIS Satellite Canvas Preview */}
      <div className="p-8 rounded-2xl bg-surface-low border border-surface-highest space-y-4 relative overflow-hidden shadow-tactical">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-tactical-text">ISRO BHUVAN 2D & SATELLITE OGC WMS CANVAS</h3>
            <p className="text-xs text-tactical-muted font-sans">Pan-India Multi-Spectral Spatial Resolution: 5m/pixel (Cartosat & Resourcesat)</p>
          </div>
          <Link
            href="/map"
            className="px-4 py-2 rounded-xl bg-primary text-surface-lowest font-bold text-xs hover:bg-primary-tint transition-colors"
          >
            OPEN FULL GOD'S EYE GIS MAP
          </Link>
        </div>

        <div className="w-full h-80 rounded-xl bg-surface-lowest border border-surface-highest flex items-center justify-center relative">
          <div className="text-center space-y-2">
            <div className="inline-block p-4 rounded-full bg-primary/20 text-primary animate-pulse">
              <Satellite className="w-8 h-8" />
            </div>
            <p className="text-xs text-tactical-muted font-mono">
              [BHUVAN WMS RASTER STREAM ACTIVE — 20.5937° N, 78.9629° E]
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
