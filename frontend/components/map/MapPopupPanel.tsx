'use client';

import React from 'react';
import { X, ShieldAlert, Hospital, Home, Users, Navigation, Phone, Activity, ExternalLink } from 'lucide-react';
import { MapFeatureNode } from './DisasterGISMap';
import Link from 'next/link';

interface MapPopupPanelProps {
  node: MapFeatureNode;
  onClose: () => void;
}

export default function MapPopupPanel({ node, onClose }: MapPopupPanelProps) {
  const getCategoryIcon = () => {
    switch (node.category) {
      case 'hazard':
        return <ShieldAlert className="w-5 h-5 text-emergency" />;
      case 'hospital':
        return <Hospital className="w-5 h-5 text-emerald-400" />;
      case 'shelter':
        return <Home className="w-5 h-5 text-blue-400" />;
      case 'volunteer':
        return <Users className="w-5 h-5 text-purple-400" />;
      default:
        return <Activity className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="absolute top-20 left-4 z-30 w-80 sm:w-96 bg-surface-low/95 backdrop-blur-xl p-5 rounded-2xl border border-surface-highest shadow-2xl space-y-4 font-telemetry animate-in slide-in-from-left duration-300">
      
      {/* Header & Close */}
      <div className="flex items-start justify-between border-b border-surface-highest pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-surface-high border border-surface-highest">
            {getCategoryIcon()}
          </div>
          <div>
            <span className="text-[10px] text-tactical-muted uppercase font-bold tracking-wider">
              {node.category.toUpperCase()} — {node.subType}
            </span>
            <h3 className="text-sm font-bold text-tactical-text leading-snug">
              {node.name}
            </h3>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-tactical-muted hover:text-tactical-text hover:bg-surface-high transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Telemetry Details */}
      <div className="space-y-3 text-xs">
        
        <div className="p-3 rounded-lg bg-surface-container border border-surface-highest/60">
          <span className="text-[10px] text-tactical-muted uppercase font-bold block mb-1">STATUS TELEMETRY</span>
          <div className="flex items-center justify-between">
            <span className="text-tactical-text font-bold">{node.status}</span>
            {node.severity && (
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                  node.severity === 'CRITICAL' ? 'bg-emergency text-white' : 'bg-primary text-surface-lowest'
                }`}
              >
                {node.severity}
              </span>
            )}
          </div>
        </div>

        <div>
          <span className="text-[10px] text-tactical-muted uppercase font-bold block mb-1">FIELD SITUATION REPORT</span>
          <p className="text-tactical-text leading-relaxed bg-surface-high/40 p-2.5 rounded border border-surface-highest/40">
            {node.details}
          </p>
        </div>

        {node.contact && (
          <div className="flex items-center space-x-2 text-tactical-muted">
            <Phone className="w-3.5 h-3.5 text-primary" />
            <span>{node.contact}</span>
          </div>
        )}

        <div className="text-[10px] text-tactical-muted flex items-center justify-between border-t border-surface-highest pt-2">
          <span>COORDINATES: {node.lat.toFixed(4)}° N, {node.lng.toFixed(4)}° E</span>
          <span>UPDATED: {node.updatedAt}</span>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Link
          href={`/disasters/${node.id}`}
          className="w-full py-2 rounded bg-primary text-surface-lowest font-bold text-xs flex items-center justify-center space-x-1 hover:bg-primary-tint transition-colors"
        >
          <span>Full Intel</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={() => alert(`Routing coordinates to [${node.lat}, ${node.lng}]`)}
          className="w-full py-2 rounded bg-surface-high hover:bg-surface-highest text-tactical-text font-bold text-xs flex items-center justify-center space-x-1 border border-surface-highest transition-colors"
        >
          <Navigation className="w-3.5 h-3.5 text-primary" />
          <span>Route GIS</span>
        </button>
      </div>

    </div>
  );
}
