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
  RefreshCw,
  Map
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
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-16">
      
      {/* Editorial Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
            <Satellite className="w-3.5 h-3.5 animate-pulse" />
            <span>ISRO BHUVAN & NRSC MULTI-SPECTRAL DISASTER TELEMETRY</span>
          </div>
          
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            Satellite Intelligence Hub
          </h1>
          
          <p className="text-base text-slate-400 font-light leading-relaxed">
            National Remote Sensing Centre (NRSC), Space Applications Centre (SAC), and MOSDAC INSAT-3DR multi-spectral thermal, hydrological, and oceanographic radar monitoring.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/map"
            className="px-6 py-3.5 rounded-full bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs transition-all flex items-center space-x-2 shadow-lg"
          >
            <Map className="w-4 h-4" />
            <span>Open God's Eye GIS</span>
          </Link>
        </div>
      </div>

      {/* Main Satellite Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: INSAT-3DR Storm Surge */}
        <div className="p-7 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between text-primary">
            <Layers className="w-6 h-6" />
            <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
              INSAT-3DR RAPID SCAN
            </span>
          </div>
          <h3 className="font-serif text-2xl text-white font-normal leading-snug">
            Coastal Storm Surge & Gale Telemetry
          </h3>
          <p className="text-xs text-slate-400 font-light leading-relaxed">
            Hydrodynamic ocean circulation model predicting 3.4m wave heights along Odisha sea front with sustained gale velocities.
          </p>
          <div className="pt-2 font-mono text-xs font-bold text-primary">
            RISK FACTOR: CRITICAL
          </div>
        </div>

        {/* Card 2: ISRO / FSI Forest Fire Hotspots */}
        <div className="p-7 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between text-emergency">
            <Flame className="w-6 h-6" />
            <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-full bg-emergency/20 text-emergency border border-emergency/30">
              MODIS & VIIRS / NRSC
            </span>
          </div>
          <h3 className="font-serif text-2xl text-white font-normal leading-snug">
            Thermal Hotspot Anomaly Tracking
          </h3>
          <p className="text-xs text-slate-400 font-light leading-relaxed">
            48 active thermal fire anomalies identified across Garhwal Himalayas pine forest slopes using shortwave infrared.
          </p>
          <div className="pt-2 font-mono text-xs font-bold text-emergency">
            THERMAL ANOMALY: HIGH
          </div>
        </div>

        {/* Card 3: CWC & RISAT-SAR Flood Inundation */}
        <div className="p-7 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between text-blue-400">
            <Waves className="w-6 h-6" />
            <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              RISAT-SAR & CWC SENSORS
            </span>
          </div>
          <h3 className="font-serif text-2xl text-white font-normal leading-snug">
            Brahmaputra Basin Flood Inundation
          </h3>
          <p className="text-xs text-slate-400 font-light leading-relaxed">
            Synthetic Aperture Radar (SAR) indicates 42,000 hectares submerged across Kamrup. River level +1.85m over red mark.
          </p>
          <div className="pt-2 font-mono text-xs font-bold text-blue-400">
            STATUS: OVERFLOW ACTIVE
          </div>
        </div>

      </div>

      {/* ISRO Bhuvan Live Bulletins Feed */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-primary animate-pulse" />
            <h2 className="heading-editorial text-3xl sm:text-4xl text-white">
              ISRO Bhuvan / NRSC Disaster Bulletins
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-500">Source: ISRO DMSP Feed</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bulletins.map((bulletin) => (
            <div
              key={bulletin.id}
              className="p-7 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-primary font-bold px-3 py-1 rounded-full bg-primary/20 border border-primary/30">
                  {bulletin.agency}
                </span>
                <span className="font-mono text-[10px] text-slate-500">{bulletin.published_at}</span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl text-white font-normal leading-snug">
                {bulletin.title}
              </h3>

              <p className="text-xs text-slate-400 font-light leading-relaxed">
                {bulletin.summary}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
                <div className="flex items-center space-x-2 font-mono text-[11px]">
                  <span className="text-slate-500">SENSOR:</span>
                  <span className="font-bold text-slate-300">{bulletin.satellite_source}</span>
                </div>

                <Link
                  href="/map"
                  className="text-primary hover:text-primary-hover font-medium flex items-center space-x-1.5 transition-colors"
                >
                  <span>View on GIS</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-Resolution GIS Satellite Canvas Preview Frame */}
      <div className="p-8 sm:p-10 rounded-3xl bg-surface-card border border-white/[0.08] space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="heading-editorial text-3xl sm:text-4xl text-white">
              ISRO Bhuvan Multi-Spectral OGC WMS Layer
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-light">
              Pan-India spatial resolution: 5m/pixel (Cartosat-3 & Resourcesat-2A high-resolution optical rasters).
            </p>
          </div>
          <Link
            href="/map"
            className="px-6 py-3.5 rounded-full bg-primary text-slate-950 font-semibold text-xs hover:bg-primary-hover transition-all shadow-lg shrink-0"
          >
            Launch God's Eye 3D GIS
          </Link>
        </div>

        <div className="w-full h-80 rounded-2xl bg-background/60 border border-white/[0.08] flex items-center justify-center relative overflow-hidden">
          <div className="text-center space-y-3 z-10">
            <div className="inline-block p-4 rounded-full bg-primary/20 text-primary animate-pulse border border-primary/30">
              <Satellite className="w-8 h-8" />
            </div>
            <p className="font-mono text-xs text-slate-400">
              [BHUVAN WMS RASTER TELEMETRY ACTIVE — 20.5937° N, 78.9629° E]
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
