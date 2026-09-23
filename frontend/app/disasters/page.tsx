'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  MapPin, 
  Wind, 
  CloudRain, 
  Waves, 
  ArrowRight, 
  Map, 
  Activity,
  Flame,
  Radio,
  SlidersHorizontal,
  RefreshCw
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-telemetry">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-surface-highest/60 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>NATIONAL MULTI-HAZARD INCIDENT REGISTRY</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
            Active Disaster Operations
          </h1>
          <p className="text-xs sm:text-sm text-tactical-muted font-sans max-w-3xl">
            Real-time multi-spectral OSINT monitoring, CWC hydrological sensors, and IMD early warning bulletins across all Indian states and coastal sectors.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDisasters}
            className="p-2.5 rounded-xl bg-surface-low border border-surface-highest text-tactical-text hover:bg-surface-high transition-colors text-xs flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden sm:inline">Refresh Feeds</span>
          </button>

          <Link
            href="/map"
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-tint text-surface-lowest font-bold text-xs transition-colors flex items-center space-x-2 shadow-tactical"
          >
            <Map className="w-4 h-4" />
            <span>OPEN GIS CANVAS</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Ribbon */}
      <div className="p-4 rounded-2xl bg-surface-low border border-surface-highest space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-primary" />
            <input
              type="text"
              placeholder="Search by state (e.g. Odisha, Assam, Kerala), district, or incident name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-lowest border border-surface-highest text-xs text-tactical-text focus:outline-none focus:border-primary font-sans placeholder-tactical-muted"
            />
          </div>

          {/* Severity Quick Filter Buttons */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            {severities.map(sev => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  selectedSeverity === sev
                    ? sev === 'CRITICAL' ? 'bg-emergency text-white' : 'bg-primary text-surface-lowest'
                    : 'bg-surface-lowest text-tactical-muted hover:text-white border border-surface-highest'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Hazard Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-2 border-t border-surface-highest/40">
          <span className="text-[10px] uppercase font-bold text-tactical-muted mr-2">Category:</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-primary/20 text-primary border border-primary/50 font-bold'
                  : 'text-tactical-muted hover:text-tactical-text hover:bg-surface-high/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count & Metric Bar */}
      <div className="flex items-center justify-between text-xs text-tactical-muted px-1">
        <span>Showing <strong className="text-primary">{filteredDisasters.length}</strong> active incident nodes</span>
        <span className="text-[11px]">System 1 Triage by <strong>Laya Multilingual Decision Engine</strong></span>
      </div>

      {/* Disaster Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDisasters.map((disaster) => {
          const isCritical = disaster.severity === 'CRITICAL';
          return (
            <div
              key={disaster.id}
              className={`p-6 rounded-2xl bg-surface-low border transition-all duration-200 hover:border-primary/60 flex flex-col justify-between space-y-4 shadow-tactical relative overflow-hidden ${
                isCritical ? 'border-emergency/40' : 'border-surface-highest'
              }`}
            >
              {/* Top Row: Severity & SubType */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                    isCritical ? 'bg-emergency text-white animate-pulse' : 'bg-primary/20 text-primary border border-primary/30'
                  }`}>
                    {disaster.severity}
                  </span>
                  <span className="text-xs text-tactical-muted">{disaster.subType}</span>
                </div>
                <span className="text-[10px] text-tactical-muted">{disaster.updatedAt}</span>
              </div>

              {/* Title & Location */}
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-tactical-text line-clamp-2">
                  {disaster.name}
                </h3>
                <div className="flex items-center space-x-1.5 text-xs text-primary font-sans">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{disaster.location || `${disaster.lat.toFixed(3)}°N, ${disaster.lng.toFixed(3)}°E`}</span>
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs text-tactical-muted line-clamp-3 font-sans leading-relaxed">
                {disaster.details}
              </p>

              {/* Telemetry Metrics Strip */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-surface-lowest border border-surface-highest text-[10px]">
                <div>
                  <span className="text-tactical-muted block">AFFECTED POP</span>
                  <span className="font-bold text-tactical-text">{disaster.affected_pop || '85K'}</span>
                </div>
                <div>
                  <span className="text-tactical-muted block">WIND SPEED</span>
                  <span className="font-bold text-primary">{disaster.wind_speed || 45} km/h</span>
                </div>
                <div>
                  <span className="text-tactical-muted block">SURGE / RAIN</span>
                  <span className="font-bold text-emerald-400">{disaster.surge_m ? `${disaster.surge_m}m surge` : `${disaster.rainfall_mm || 35}mm`}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-surface-highest/40">
                <Link
                  href={`/disasters/${disaster.id}`}
                  className="text-xs text-primary hover:text-primary-tint font-bold flex items-center space-x-1 transition-colors"
                >
                  <span>TACTICAL BRIEFING</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href={`/map`}
                  className="p-1.5 rounded-lg bg-surface-high text-tactical-text hover:text-white transition-colors"
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
