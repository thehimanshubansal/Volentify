'use client';

import React from 'react';
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
  ShieldAlert,
  Sparkles,
  Map as MapIcon,
  Globe,
  Mountain,
  Moon,
  X
} from 'lucide-react';

interface MapLayerSelectorProps {
  activeLayers: any;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
  selectedBasemap: string;
  setSelectedBasemap: (basemap: 'voyager' | 'satellite' | 'dark' | 'topo') => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function MapLayerSelector({ 
  activeLayers, 
  setActiveLayers, 
  selectedBasemap,
  setSelectedBasemap,
  isOpen, 
  onClose 
}: MapLayerSelectorProps) {
  if (!isOpen) return null;

  const basemaps = [
    { key: 'voyager', label: 'Real Map (Detailed)', desc: 'Streets, topography & rivers', icon: MapIcon },
    { key: 'satellite', label: 'Satellite HD', desc: 'Real Earth imagery by Esri', icon: Globe },
    { key: 'dark', label: 'Dark Tactical', desc: 'High-contrast night operations', icon: Moon },
    { key: 'topo', label: 'Topographic', desc: 'Physical relief & elevation', icon: Mountain },
  ];

  const layerOptions = [
    { key: 'severityHeatmap', label: 'Disaster Severity Heatmap', icon: Flame, badge: 'GPU LIVE' },
    { key: 'hazardZones', label: 'Tactical Hazard Buffer Zones', icon: Waves, badge: 'ACTIVE' },
    { key: 'disasters', label: 'Disaster Tactical Glyphs', icon: ShieldAlert, badge: null },
    { key: 'volunteers', label: 'Active Field Volunteers', icon: Users, badge: null },
    { key: 'weatherRadar', label: 'Doppler Weather Radar (RainViewer)', icon: CloudRain, badge: 'RADAR' },
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

  return (
    <div className="absolute top-16 right-4 z-40 w-84 bg-surface-low/98 backdrop-blur-2xl p-4 rounded-2xl border border-surface-highest shadow-2xl space-y-4 font-telemetry animate-in fade-in-50 zoom-in-95 duration-200">
      <div className="flex items-center justify-between border-b border-surface-highest/80 pb-2.5">
        <div className="flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-bold uppercase text-primary tracking-wider">
            BASEMAP & GIS LAYERS
          </h4>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg text-tactical-muted hover:text-tactical-text hover:bg-surface-high transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Basemap Selection Grid */}
      <div>
        <span className="text-[10px] font-bold text-tactical-muted uppercase tracking-wider block mb-2">
          BASEMAP ENGINE
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {basemaps.map((b) => {
            const Icon = b.icon;
            const isSelected = selectedBasemap === b.key;
            return (
              <button
                key={b.key}
                onClick={() => setSelectedBasemap(b.key as any)}
                className={`p-2 rounded-xl text-left transition-all border ${
                  isSelected
                    ? 'bg-primary/20 border-primary text-primary shadow-sm ring-1 ring-primary/40'
                    : 'bg-surface-high/40 border-transparent text-tactical-muted hover:bg-surface-high/80 hover:text-tactical-text'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-0.5">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-bold truncate">{b.label}</span>
                </div>
                <p className="text-[9px] text-tactical-muted line-clamp-1">{b.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Data Overlay Layers */}
      <div>
        <span className="text-[10px] font-bold text-tactical-muted uppercase tracking-wider block mb-2">
          TACTICAL DATA LAYERS
        </span>
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {layerOptions.map((item) => {
            const Icon = item.icon;
            const isEnabled = activeLayers[item.key];
            return (
              <button
                key={item.key}
                onClick={() => toggleLayer(item.key)}
                className={`w-full p-2 rounded-xl text-left text-xs flex items-center justify-between transition-all ${
                  isEnabled
                    ? 'bg-surface-container border border-primary/50 text-tactical-text shadow-sm'
                    : 'bg-surface-high/30 text-tactical-muted border border-transparent hover:bg-surface-high/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg ${isEnabled ? 'bg-primary/20 text-primary' : 'bg-surface-high text-tactical-muted'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold block text-[11px] leading-tight">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono text-primary uppercase font-bold tracking-tight">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
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
    </div>
  );
}
