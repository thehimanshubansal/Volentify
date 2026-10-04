'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  Search, 
  MapPin, 
  ArrowRight, 
  Map, 
  Radio, 
  RefreshCw,
  Wind,
  Waves,
  Flame,
  Zap,
  ArrowUpRight
} from 'lucide-react';

interface DisasterRecord {
  id: string;
  name: string;
  category: string;
  subType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  lat: number;
  lng: number;
  location?: string;
  state?: string;
  details: string;
  status: string;
  updatedAt: string;
  affected_pop?: string;
  wind_speed?: number;
  rainfall_mm?: number;
  surge_m?: number;
}

export default function DisastersRegistryPage() {
  const [disasters, setDisasters] = useState<DisasterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const fetchDisasters = () => {
    setLoading(true);
    fetch('/api/disasters')
      .then(res => res.json())
      .then((data: DisasterRecord[]) => {
        if (Array.isArray(data)) {
          setDisasters(data);
        }
      })
      .catch(err => {
        console.error('Error loading disasters:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDisasters();
  }, []);

  const filteredDisasters = disasters.filter(d => {
    const matchesSearch = 
      searchQuery === '' ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.location && d.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.state && d.state.toLowerCase().includes(searchQuery.toLowerCase())) ||
      d.subType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = selectedSeverity === 'ALL' || d.severity === selectedSeverity;
    const matchesCategory = selectedCategory === 'ALL' || d.subType.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const categories = ['ALL', 'Cyclone', 'Flood', 'Wildfire', 'Landslide', 'Earthquake', 'Heatwave'];
  const severities = ['ALL', 'CRITICAL', 'HIGH', 'MODERATE'];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>NATIONAL MULTI-HAZARD INCIDENT REGISTRY</span>
          </div>
          
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            Active Disaster Operations
          </h1>
          
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Multi-spectral satellite observation, CWC hydrological river gauges, and IMD early warning bulletins across all Indian states and coastal sectors.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={fetchDisasters}
            className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors backdrop-blur-md border border-white/[0.08] flex items-center space-x-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh Feeds</span>
          </button>

          <Link
            href="/map"
            className="px-6 py-3 rounded-full bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs transition-all flex items-center space-x-2 shadow-lg"
          >
            <Map className="w-4 h-4" />
            <span>Open GIS Canvas</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-6 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-5 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-primary" />
            <input
              type="text"
              placeholder="Search by state (e.g. Odisha, Assam, Kerala), district, or incident name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-full bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary font-sans transition-colors"
            />
          </div>

          {/* Severity Filter Buttons */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            {severities.map(sev => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  selectedSeverity === sev
                    ? sev === 'CRITICAL' ? 'bg-emergency text-white shadow-md' : 'bg-primary text-slate-950 font-semibold shadow-md'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Hazard Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-3 border-t border-white/[0.06]">
          <span className="font-mono text-xs uppercase tracking-widest text-slate-400 mr-2">Category:</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-primary/20 text-primary border border-primary/50 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count & Metric Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
        <span>Showing <strong className="text-primary">{filteredDisasters.length}</strong> active incident nodes</span>
        <span className="text-[11px] text-slate-500">System 1 Triage by <strong className="text-slate-400">Laya Multilingual Decision Engine</strong></span>
      </div>

      {/* Disaster Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDisasters.map((disaster) => {
          const isCritical = disaster.severity === 'CRITICAL';
          return (
            <div
              key={disaster.id}
              className={`p-7 rounded-3xl bg-surface-card border transition-all duration-300 hover:border-white/[0.22] hover:shadow-2xl flex flex-col justify-between space-y-5 relative overflow-hidden ${
                isCritical ? 'border-emergency/40' : 'border-white/[0.08]'
              }`}
            >
              {/* Top Row: Severity & SubType */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider ${
                    isCritical ? 'bg-emergency text-white animate-pulse' : 'bg-primary/20 text-primary border border-primary/30'
                  }`}>
                    {disaster.severity}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{disaster.subType}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">{disaster.updatedAt}</span>
              </div>

              {/* Title & Location */}
              <div className="space-y-2">
                <h3 className="font-serif text-2xl text-white font-normal leading-snug line-clamp-2">
                  {disaster.name}
                </h3>
                <div className="flex items-center space-x-1.5 text-xs text-primary font-sans">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{disaster.location || `${disaster.lat.toFixed(3)}°N, ${disaster.lng.toFixed(3)}°E`}</span>
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-400 font-light leading-relaxed line-clamp-3">
                {disaster.details}
              </p>

              {/* Telemetry Metrics Strip */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] font-mono text-[10px]">
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">AFFECTED</span>
                  <span className="font-bold text-slate-200">{disaster.affected_pop || '85K'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">WIND</span>
                  <span className="font-bold text-primary">{disaster.wind_speed || 45} km/h</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">RAIN/SURGE</span>
                  <span className="font-bold text-emerald-400">{disaster.surge_m ? `${disaster.surge_m}m` : `${disaster.rainfall_mm || 35}mm`}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between border-t border-white/[0.06]">
                <Link
                  href={`/disasters/${disaster.id}`}
                  className="text-xs text-primary hover:text-primary-hover font-medium flex items-center space-x-1 transition-colors"
                >
                  <span>Tactical Briefing</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href={`/map`}
                  className="p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors"
                  title="View on Map"
                >
                  <Map className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
