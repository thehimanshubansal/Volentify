'use client';

import React from 'react';
import { 
  X, 
  ShieldAlert, 
  Hospital, 
  Home, 
  Users, 
  Navigation, 
  Phone, 
  Activity, 
  ExternalLink, 
  CheckCircle2, 
  Send,
  Flame,
  Waves,
  Wind,
  Award,
  Clock,
  Briefcase,
  Radio,
  Zap,
  Sparkles
} from 'lucide-react';
import { MapFeatureNode } from './DisasterGISMap';
import Link from 'next/link';

interface MapPopupPanelProps {
  node: MapFeatureNode;
  onClose: () => void;
  onStatusChange?: (volunteerId: string, newStatus: string) => void;
}

export default function MapPopupPanel({ node, onClose, onStatusChange }: MapPopupPanelProps) {
  const isVolunteer = node.category === 'volunteer';

  const getCategoryIcon = () => {
    if (node.category === 'volunteer') {
      return <Users className="w-5 h-5 text-emerald-400" />;
    }
    if (node.category === 'hospital') {
      return <Hospital className="w-5 h-5 text-emerald-400" />;
    }
    if (node.category === 'shelter') {
      return <Home className="w-5 h-5 text-blue-400" />;
    }

    // Hazard Subtypes
    const sub = (node.subType || '').toLowerCase();
    if (sub.includes('cyclone') || sub.includes('storm')) {
      return <Wind className="w-5 h-5 text-violet-400 animate-spin" style={{ animationDuration: '6s' }} />;
    }
    if (sub.includes('flood') || sub.includes('inundation')) {
      return <Waves className="w-5 h-5 text-cyan-400" />;
    }
    if (sub.includes('wildfire') || sub.includes('fire')) {
      return <Flame className="w-5 h-5 text-amber-500 animate-pulse" />;
    }
    if (sub.includes('landslide')) {
      return <ShieldAlert className="w-5 h-5 text-orange-500" />;
    }
    if (sub.includes('earthquake') || sub.includes('seismic')) {
      return <Zap className="w-5 h-5 text-yellow-400" />;
    }

    return <ShieldAlert className="w-5 h-5 text-emergency" />;
  };

  return (
    <div className="absolute top-20 left-4 z-30 w-84 sm:w-96 bg-surface-low/95 backdrop-blur-xl p-5 rounded-2xl border border-surface-highest shadow-2xl space-y-4 font-telemetry animate-in slide-in-from-left duration-300">
      
      {/* Header & Close */}
      <div className="flex items-start justify-between border-b border-surface-highest pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-surface-high border border-surface-highest shadow-inner">
            {getCategoryIcon()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-primary uppercase font-bold tracking-wider">
                {node.category.toUpperCase()}
              </span>
              {node.subType && (
                <span className="text-[9px] bg-surface-high px-1.5 py-0.5 rounded text-tactical-muted font-mono font-semibold">
                  {node.subType}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-tactical-text leading-snug">
              {node.name}
            </h3>
            {node.location && (
              <span className="text-[11px] text-tactical-muted block">
                {node.location}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-tactical-muted hover:text-tactical-text hover:bg-surface-high transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Telemetry Details */}
      <div className="space-y-3 text-xs">
        
        {/* Status Strip */}
        <div className="p-3 rounded-xl bg-surface-container border border-surface-highest/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              node.status === 'AVAILABLE' ? 'bg-emerald-400 animate-pulse' :
              node.status === 'BUSY' ? 'bg-amber-400' :
              node.status === 'OFFLINE' ? 'bg-slate-500' :
              node.severity === 'CRITICAL' ? 'bg-emergency animate-ping' : 'bg-primary'
            }`}></span>
            <div>
              <span className="text-[9px] text-tactical-muted uppercase font-bold block">STATUS</span>
              <span className="text-tactical-text font-bold text-xs">{node.status}</span>
            </div>
          </div>

          {node.severity && (
            <div className="text-right">
              <span className="text-[9px] text-tactical-muted uppercase font-bold block">SEVERITY</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  node.severity === 'CRITICAL' ? 'bg-emergency/20 text-emergency border border-emergency/40 animate-pulse' : 
                  node.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                  'bg-primary/20 text-primary border border-primary/40'
                }`}
              >
                {node.severity}
              </span>
            </div>
          )}

          {isVolunteer && node.responseRate !== undefined && (
            <div className="text-right">
              <span className="text-[9px] text-tactical-muted uppercase font-bold block">RESPONSE RATE</span>
              <span className="text-[11px] font-mono font-bold text-emerald-400">{node.responseRate}%</span>
            </div>
          )}
        </div>

        {/* Volunteer Specific Stats */}
        {isVolunteer && (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-surface-high/60 border border-surface-highest/50 flex items-center space-x-2">
              <Award className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] text-tactical-muted block">MISSIONS</span>
                <span className="font-bold text-tactical-text">{node.missionsDone ?? 12} Completed</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-surface-high/60 border border-surface-highest/50 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[9px] text-tactical-muted block">FIELD HOURS</span>
                <span className="font-bold text-tactical-text">{node.totalHours ?? 48.5} hrs</span>
              </div>
            </div>
          </div>
        )}

        {/* Volunteer Skills Tags */}
        {isVolunteer && node.skills && node.skills.length > 0 && (
          <div>
            <span className="text-[10px] text-tactical-muted uppercase font-bold block mb-1.5">
              CERTIFIED SKILLS & CAPABILITIES
            </span>
            <div className="flex flex-wrap gap-1.5">
              {node.skills.map((s, idx) => (
                <span 
                  key={idx} 
                  className="px-2 py-0.5 rounded-md bg-primary/15 border border-primary/30 text-primary text-[10px] font-semibold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Volunteer Equipment */}
        {isVolunteer && node.equipment && node.equipment.length > 0 && (
          <div>
            <span className="text-[10px] text-tactical-muted uppercase font-bold block mb-1">
              DEPLOYED GEAR / EQUIPMENT
            </span>
            <div className="flex flex-wrap gap-1">
              {node.equipment.map((eq, idx) => (
                <span 
                  key={idx} 
                  className="px-1.5 py-0.5 rounded bg-surface-high text-tactical-text text-[10px] border border-surface-highest"
                >
                  {eq}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Hazard Specific Telemetry Metrics */}
        {!isVolunteer && node.category === 'hazard' && (
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {node.windSpeed != null && !isNaN(Number(node.windSpeed)) && (
              <div className="p-1.5 rounded-lg bg-surface-high border border-surface-highest">
                <span className="text-[9px] text-tactical-muted block">WIND SPEED</span>
                <span className="font-bold text-primary font-mono text-xs">{node.windSpeed} km/h</span>
              </div>
            )}
            {node.rainfallMm != null && !isNaN(Number(node.rainfallMm)) && (
              <div className="p-1.5 rounded-lg bg-surface-high border border-surface-highest">
                <span className="text-[9px] text-tactical-muted block">RAINFALL</span>
                <span className="font-bold text-cyan-400 font-mono text-xs">{node.rainfallMm} mm</span>
              </div>
            )}
            {node.affectedPop && (
              <div className="p-1.5 rounded-lg bg-surface-high border border-surface-highest">
                <span className="text-[9px] text-tactical-muted block">AFFECTED</span>
                <span className="font-bold text-amber-400 font-mono text-xs">{node.affectedPop}</span>
              </div>
            )}
          </div>
        )}


        {/* Field Details / Brief */}
        <div>
          <span className="text-[10px] text-tactical-muted uppercase font-bold block mb-1">
            {isVolunteer ? 'RESPONDER PROFILE' : 'OSINT SITUATION REPORT'}
          </span>
          <p className="text-tactical-text leading-relaxed bg-surface-high/40 p-2.5 rounded-lg border border-surface-highest/40 font-sans text-xs">
            {node.details}
          </p>
        </div>

        {/* Contact info */}
        {node.contact && (
          <div className="flex items-center space-x-2 text-tactical-muted bg-surface-lowest p-2 rounded-lg border border-surface-highest/50">
            <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-mono text-xs text-tactical-text">{node.contact}</span>
          </div>
        )}

        {/* GPS Coordinates & Timestamp */}
        <div className="text-[10px] text-tactical-muted flex items-center justify-between border-t border-surface-highest pt-2">
          <span>GPS: {node.lat.toFixed(4)}° N, {node.lng.toFixed(4)}° E</span>
          <span>UPDATED: {node.updatedAt}</span>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {isVolunteer ? (
          <>
            <Link
              href="/volunteer"
              className="w-full py-2.5 rounded-xl bg-primary text-surface-lowest font-bold text-xs flex items-center justify-center space-x-1.5 hover:bg-primary-tint transition-all shadow-md active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>DISPATCH TASK</span>
            </Link>

            <button
              onClick={() => onStatusChange && onStatusChange(node.id, node.status === 'AVAILABLE' ? 'BUSY' : 'AVAILABLE')}
              className={`w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1 transition-all active:scale-95 ${
                node.status === 'AVAILABLE' 
                  ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                  : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{node.status === 'AVAILABLE' ? 'SET BUSY' : 'SET AVAILABLE'}</span>
            </button>
          </>
        ) : (
          <>
            <Link
              href={`/disasters/${node.id}`}
              className="w-full py-2.5 rounded-xl bg-primary text-surface-lowest font-bold text-xs flex items-center justify-center space-x-1 hover:bg-primary-tint transition-all shadow-md active:scale-95"
            >
              <span>TACTICAL BRIEF</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${node.lat},${node.lng}`;
                window.open(url, '_blank');
              }}
              className="w-full py-2.5 rounded-xl bg-surface-high border border-surface-highest text-tactical-text hover:text-white text-xs font-bold flex items-center justify-center space-x-1 transition-all active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>NAVIGATE</span>
            </button>
          </>
        )}
      </div>

    </div>
  );
}

