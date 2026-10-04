'use client';

import React from 'react';
import { 
  Eye, 
  Satellite, 
  ShieldAlert, 
  Radio, 
  Users, 
  Hospital, 
  Home, 
  Compass, 
  ChevronRight, 
  X,
  Crosshair,
  Volume2,
  VolumeX,
  Layers,
  Sparkles
} from 'lucide-react';
import { TACTICAL_SECTORS, TacticalSector, MapFeatureNode } from './mockGisData';

interface GodsEyeHudProps {
  activeSector: string;
  onSelectSector: (sector: TacticalSector) => void;
  onExit: () => void;
  disasters: MapFeatureNode[];
  volunteers: MapFeatureNode[];
  hospitals: MapFeatureNode[];
  shelters: MapFeatureNode[];
  is3D: boolean;
  onToggle3D: () => void;
}

export default function GodsEyeHud({
  activeSector,
  onSelectSector,
  onExit,
  disasters,
  volunteers,
  hospitals,
  shelters,
  is3D,
  onToggle3D
}: GodsEyeHudProps) {
  const criticalHazards = disasters.filter(d => d.severity === 'CRITICAL').length;
  const availableVolunteers = volunteers.filter(v => v.status === 'AVAILABLE').length;
  const totalBeds = hospitals.reduce((acc, h) => acc + (h.bedsAvailable || 0), 0);
  const totalShelterCapacity = shelters.reduce((acc, s) => acc + (s.capacity || 0), 0);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-telemetry select-none overflow-hidden">
      
      {/* 1. Tactical Radar Sweep Animation Beam */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="radar-sweep-beam" />
      </div>

      {/* 2. Tactical Corner Framing Reticle */}
      <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-primary/70 pointer-events-none" />
      <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-primary/70 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-primary/70 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-primary/70 pointer-events-none" />

      {/* 3. Top Master Command Bar */}
      <div className="absolute top-3 left-12 right-12 flex flex-col md:flex-row items-center justify-between gap-2.5 pointer-events-auto">
        
        {/* Left: God's Eye Brand & Satcom Status */}
        <div className="flex items-center space-x-3 bg-surface-low/95 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-primary/50 shadow-[0_0_25px_rgba(255,107,0,0.25)]">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60"></span>
            <div className="w-8 h-8 rounded-xl bg-primary text-surface-lowest flex items-center justify-center font-black shadow-lg">
              <Eye className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black tracking-widest text-primary uppercase flex items-center space-x-1">
                <span>GOD'S EYE COMMAND VIEW</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emergency/20 text-emergency text-[9px] font-mono font-bold border border-emergency/40 animate-pulse">
                SURVEILLANCE ACTIVE
              </span>
            </div>
            <div className="text-[10px] text-tactical-muted font-mono flex items-center space-x-2">
              <span>SAT: CARTOSAT-3 / IRNSS-1I</span>
              <span>•</span>
              <span className="text-emerald-400">9.4 GHz TELEMETRY</span>
            </div>
          </div>
        </div>

        {/* Center: National Threat & Capacity Matrix */}
        <div className="hidden xl:flex items-center space-x-2 bg-surface-low/95 backdrop-blur-2xl p-1.5 rounded-2xl border border-surface-highest/80 shadow-2xl">
          <div className="px-3 py-1 rounded-xl bg-surface-high/60 border border-surface-highest flex items-center space-x-2">
            <ShieldAlert className="w-3.5 h-3.5 text-emergency" />
            <div>
              <span className="text-[9px] text-tactical-muted uppercase font-bold block">CRITICAL THREATS</span>
              <span className="text-xs font-mono font-bold text-emergency">{criticalHazards} RED ZONES</span>
            </div>
          </div>

          <div className="px-3 py-1 rounded-xl bg-surface-high/60 border border-surface-highest flex items-center space-x-2">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <div>
              <span className="text-[9px] text-tactical-muted uppercase font-bold block">MOBILIZED UNITS</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{availableVolunteers} READY</span>
            </div>
          </div>

          <div className="px-3 py-1 rounded-xl bg-surface-high/60 border border-surface-highest flex items-center space-x-2">
            <Hospital className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <span className="text-[9px] text-tactical-muted uppercase font-bold block">TRAUMA BEDS</span>
              <span className="text-xs font-mono font-bold text-cyan-400">{totalBeds} AVAILABLE</span>
            </div>
          </div>

          <div className="px-3 py-1 rounded-xl bg-surface-high/60 border border-surface-highest flex items-center space-x-2">
            <Home className="w-3.5 h-3.5 text-violet-400" />
            <div>
              <span className="text-[9px] text-tactical-muted uppercase font-bold block">SHELTER CAPACITY</span>
              <span className="text-xs font-mono font-bold text-violet-400">{totalShelterCapacity.toLocaleString()} EVACUEES</span>
            </div>
          </div>
        </div>

        {/* Right: 2D/3D Switch & Exit God's Eye */}
        <div className="flex items-center space-x-2 bg-surface-low/95 backdrop-blur-2xl p-1.5 rounded-2xl border border-surface-highest shadow-2xl">
          {/* 2D / 3D Toggle */}
          <button
            onClick={onToggle3D}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              is3D 
                ? 'bg-primary text-surface-lowest shadow-md' 
                : 'text-tactical-muted hover:text-tactical-text hover:bg-surface-high'
            }`}
            title="Toggle between 2D Top-Down and 3D Tactical Perspective"
          >
            <Compass className={`w-3.5 h-3.5 ${is3D ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }} />
            <span>{is3D ? '3D VIEW' : '2D FLAT'}</span>
          </button>

          {/* Exit God's Eye */}
          <button
            onClick={onExit}
            className="px-3 py-1.5 rounded-xl bg-emergency/20 text-emergency border border-emergency/40 text-xs font-bold hover:bg-emergency hover:text-white transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            <span>EXIT GOD'S EYE</span>
          </button>
        </div>

      </div>

      {/* 4. Bottom Tactical Sector Dock */}
      <div className="absolute bottom-6 left-6 right-6 flex flex-col items-center pointer-events-auto">
        <div className="text-center mb-2">
          <span className="px-3 py-1 rounded-full bg-surface-low/90 backdrop-blur-md border border-primary/40 text-[10px] font-mono font-bold text-primary tracking-widest uppercase shadow-tactical">
            QUICK SECTOR TELEPORTATION
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto max-w-full p-2 bg-surface-low/95 backdrop-blur-2xl rounded-2xl border border-surface-highest/90 shadow-2xl scrollbar-none">
          {TACTICAL_SECTORS.map((sector) => {
            const isSelected = activeSector === sector.id;
            return (
              <button
                key={sector.id}
                onClick={() => onSelectSector(sector)}
                className={`px-3.5 py-2 rounded-xl text-left transition-all shrink-0 border flex items-center space-x-2.5 ${
                  isSelected
                    ? 'bg-primary/20 border-primary text-tactical-text shadow-[0_0_15px_rgba(255,107,0,0.3)] ring-1 ring-primary'
                    : 'bg-surface-high/40 border-surface-highest/60 text-tactical-muted hover:text-tactical-text hover:bg-surface-high/80'
                }`}
              >
                <span className="text-lg">{sector.icon}</span>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-bold leading-tight block text-tactical-text">
                      {sector.name}
                    </span>
                    {sector.criticality === 'CRITICAL' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emergency animate-ping" />
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-[9px] font-mono text-tactical-muted">
                    <span className="text-primary font-semibold">{sector.tag}</span>
                    <span>•</span>
                    <span>{sector.activeHazardsCount} Hazards</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
