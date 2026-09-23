'use client';

import React, { useState } from 'react';
import { 
  Layers, 
  Wind, 
  CloudRain, 
  Flame, 
  Waves, 
  Hospital, 
  Home, 
  Users, 
  Check, 
  Activity, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface MapLayerSelectorProps {
  activeLayers: any;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
}

export default function MapLayerSelector({ activeLayers, setActiveLayers }: MapLayerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const layerOptions = [
    { key: 'severityHeatmap', label: 'Disaster Severity Heatmap', icon: Flame, badge: 'GPU LIVE' },
    { key: 'disasters', label: 'Disaster Tactical Glyphs', icon: ShieldAlert, badge: null },
    { key: 'volunteers', label: 'Active Field Volunteers', icon: Users, badge: null },
    { key: 'weatherRadar', label: 'Doppler Weather Radar (Live)', icon: CloudRain, badge: 'RADAR' },
    { key: 'bhuvanWms', label: 'ISRO Bhuvan Satellite (NRSC)', icon: Layers, badge: null },
    { key: 'flood', label: 'NRSC Flood Inundation Buffer', icon: Waves, badge: null },
    { key: 'cyclone', label: 'Cyclone Track & Wind Vector', icon: Wind, badge: null },
    { key: 'hospitals', label: 'Emergency Trauma Hospitals', icon: Hospital, badge: null },
    { key: 'shelters', label: 'Relief Shelters & Camps', icon: Home, badge: null },
  ];

  const toggleLayer = (key: string) => {
    setActiveLayers((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const activeCount = Object.values(activeLayers).filter(Boolean).length;

  return (
    <div className="absolute top-20 right-4 z-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-xl bg-surface-low/90 backdrop-blur-md border border-surface-highest/80 shadow-tactical text-tactical-text hover:text-primary flex items-center space-x-2 transition-all hover:scale-105 active:scale-95"
      >
        <Layers className="w-5 h-5 text-primary" />
        <span className="text-xs font-telemetry font-bold hidden sm:inline">GIS LAYERS ({activeCount})</span>
      </button>

      {isOpen && (
        <div className="mt-2 w-80 bg-surface-low/95 backdrop-blur-md p-4 rounded-xl border border-surface-highest shadow-tactical space-y-3 font-telemetry animate-in fade-in-50 zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-surface-highest pb-2">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <h4 className="text-xs font-bold uppercase text-primary tracking-wider">
                TACTICAL GIS LAYERS
              </h4>
            </div>
            <span className="text-[10px] text-tactical-muted bg-surface-high px-1.5 py-0.5 rounded border border-surface-highest">
              REAL-TIME
            </span>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {layerOptions.map((item) => {
              const Icon = item.icon;
              const isEnabled = activeLayers[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => toggleLayer(item.key)}
                  className={`w-full p-2.5 rounded-lg text-left text-xs flex items-center justify-between transition-all ${
                    isEnabled
                      ? 'bg-surface-container border border-primary/50 text-tactical-text shadow-sm'
                      : 'bg-surface-high/40 text-tactical-muted border border-transparent hover:bg-surface-high/70'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1 rounded ${isEnabled ? 'bg-primary/20 text-primary' : 'bg-surface-high text-tactical-muted'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold block">{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] font-mono text-primary uppercase font-bold tracking-tight">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      isEnabled ? 'bg-primary border-primary text-surface-lowest' : 'border-surface-highest'
                    }`}
                  >
                    {isEnabled && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

