'use client';

import React, { useState } from 'react';
import { Layers, Eye, EyeOff, Wind, CloudRain, Flame, Waves, Hospital, Home, Users, Check } from 'lucide-react';

interface MapLayerSelectorProps {
  activeLayers: any;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
}

export default function MapLayerSelector({ activeLayers, setActiveLayers }: MapLayerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const layerOptions = [
    { key: 'satellite', label: 'INSAT Satellite Imagery', icon: Layers },
    { key: 'weatherRadar', label: 'Doppler Weather Radar', icon: CloudRain },
    { key: 'cyclone', label: 'Cyclone Track & Wind Vector', icon: Wind },
    { key: 'flood', label: 'Flood Inundation Overlay', icon: Waves },
    { key: 'hospitals', label: 'Emergency Hospitals', icon: Hospital },
    { key: 'shelters', label: 'Relief Shelters', icon: Home },
    { key: 'volunteers', label: 'Volentify Field Units', icon: Users },
  ];

  const toggleLayer = (key: string) => {
    setActiveLayers((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="absolute top-20 right-4 z-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-xl bg-surface-low/90 backdrop-blur-md border border-surface-highest/80 shadow-tactical text-tactical-text hover:text-primary flex items-center space-x-2 transition-all"
      >
        <Layers className="w-5 h-5 text-primary" />
        <span className="text-xs font-telemetry font-bold hidden sm:inline">GIS LAYERS (7)</span>
      </button>

      {isOpen && (
        <div className="mt-2 w-72 bg-surface-low/95 backdrop-blur-md p-4 rounded-xl border border-surface-highest shadow-tactical space-y-3 font-telemetry">
          <div className="flex items-center justify-between border-b border-surface-highest pb-2">
            <h4 className="text-xs font-bold uppercase text-primary tracking-wider">
              TACTICAL LAYER SELECTOR
            </h4>
            <span className="text-[10px] text-tactical-muted">LIVE SYNC</span>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {layerOptions.map((item) => {
              const Icon = item.icon;
              const isEnabled = activeLayers[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => toggleLayer(item.key)}
                  className={`w-full p-2 rounded-lg text-left text-xs flex items-center justify-between transition-all ${
                    isEnabled
                      ? 'bg-surface-container border border-primary/40 text-tactical-text'
                      : 'bg-surface-high/40 text-tactical-muted border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isEnabled ? 'text-primary' : 'text-tactical-muted'}`} />
                    <span>{item.label}</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border ${
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
