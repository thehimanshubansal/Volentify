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
  Sparkles,
  Bed,
  HeartPulse,
  Package,
  Layers,
  Check
} from 'lucide-react';
import { MapFeatureNode } from './mockGisData';
import Link from 'next/link';

interface MapPopupPanelProps {
  node: MapFeatureNode;
  onClose: () => void;
  onStatusChange?: (volunteerId: string, newStatus: string) => void;
}

export default function MapPopupPanel({ node, onClose, onStatusChange }: MapPopupPanelProps) {
  const isVolunteer = node.category === 'volunteer';
  const isHospital = node.category === 'hospital';
  const isShelter = node.category === 'shelter';
  const isHazard = node.category === 'hazard';

  const getCategoryIcon = () => {
    if (isVolunteer) {
      return <Users className="w-5 h-5 text-emerald-400" />;
    }
    if (isHospital) {
      return <Hospital className="w-5 h-5 text-cyan-400" />;
    }
    if (isShelter) {
      return <Home className="w-5 h-5 text-violet-400" />;
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

  const occupancyRate = (isShelter && node.capacity && node.currentOccupancy)
    ? Math.round((node.currentOccupancy / node.capacity) * 100)
    : 0;

  return (
    <div className="absolute top-20 left-4 z-40 w-84 sm:w-96 bg-surface-card/95 backdrop-blur-2xl p-6 rounded-3xl border border-white/[0.12] shadow-2xl space-y-4 font-sans animate-in slide-in-from-left duration-300">
      
      {/* Header & Close */}
      <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-inner">
            {getCategoryIcon()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${
                isVolunteer ? 'text-emerald-400' :
                isHospital ? 'text-cyan-400' :
                isShelter ? 'text-violet-400' : 'text-primary'
              }`}>
                {node.category.toUpperCase()}
              </span>
              {node.subType && (
                <span className="text-[9px] bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full text-slate-400 font-mono font-semibold">
                  {node.subType}
                </span>
              )}
            </div>
            <h3 className="font-serif text-xl text-white font-normal leading-snug mt-0.5">
              {node.name}
            </h3>
            {node.location && (
              <span className="text-[11px] text-slate-400 font-light block">
                {node.location} {node.state ? `• ${node.state}` : ''}
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
              node.severity === 'CRITICAL' ? 'bg-emergency animate-ping' :
              isHospital ? 'bg-cyan-400' :
              isShelter ? 'bg-violet-400' : 'bg-primary'
            }`}></span>
            <div>
              <span className="text-[9px] text-tactical-muted uppercase font-bold block">OPERATIONAL STATUS</span>
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

        {/* 1. Volunteer Specific Stats */}
        {isVolunteer && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-surface-high/60 border border-surface-highest/50 flex items-center space-x-2">
                <Award className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="text-[9px] text-tactical-muted block">MISSIONS COMPLETED</span>
                  <span className="font-bold text-tactical-text">{node.missionsDone ?? 12} Operations</span>
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

            {node.skills && node.skills.length > 0 && (
              <div>
                <span className="text-[10px] text-tactical-muted uppercase font-bold block mb-1.5">
                  CERTIFIED SPECIALIZATION
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

            {node.equipment && node.equipment.length > 0 && (
              <div>
                <span className="text-[10px] text-tactical-muted uppercase font-bold block mb-1">
                  DEPLOYED EQUIPMENT & GEAR
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
          </>
        )}

        {/* 2. Hospital Specific Stats */}
        {isHospital && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 flex items-center space-x-2">
                <Bed className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-tactical-muted uppercase block">AVAILABLE BEDS</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs">
                    {node.bedsAvailable} / {node.bedsTotal} Total
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center space-x-2">
                <HeartPulse className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-tactical-muted uppercase block">ICU VENTILATORS</span>
                  <span className="font-mono font-bold text-emerald-300 text-xs">
                    {node.icuAvailable} Ready
                  </span>
                </div>
              </div>
            </div>

            {node.medicalOfficer && (
              <div className="p-2 rounded-lg bg-surface-high border border-surface-highest text-[11px]">
                <span className="text-[9px] text-tactical-muted uppercase font-bold block">CHIEF MEDICAL OFFICER</span>
                <span className="font-bold text-tactical-text">{node.medicalOfficer}</span>
              </div>
            )}
          </>
        )}

        {/* 3. Shelter Specific Stats */}
        {isShelter && (
          <>
            <div className="space-y-1.5 p-2.5 rounded-xl bg-violet-950/20 border border-violet-500/30">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-tactical-muted">Shelter Occupancy</span>
                <span className="font-mono font-bold text-violet-300">
                  {node.currentOccupancy} / {node.capacity} ({occupancyRate}%)
                </span>
              </div>
              <div className="w-full bg-surface-highest h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    occupancyRate > 90 ? 'bg-emergency' : occupancyRate > 75 ? 'bg-amber-400' : 'bg-violet-400'
                  }`}
                  style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-surface-high border border-surface-highest flex items-center space-x-2">
                <Package className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="text-[9px] text-tactical-muted block">RATION RESERVES</span>
                  <span className="font-bold text-tactical-text font-mono">{node.rationDays ?? 14} Days Supply</span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-surface-high border border-surface-highest flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-tactical-muted block">DRINKING WATER</span>
                  <span className="font-bold text-emerald-400 text-[11px]">RO Purified</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 4. Hazard Specific Telemetry Metrics */}
        {isHazard && (
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
                <span className="text-[9px] text-tactical-muted block">AFFECTED POP</span>
                <span className="font-bold text-amber-400 font-mono text-xs">{node.affectedPop}</span>
              </div>
            )}
          </div>
        )}

        {/* Tactical Situation Brief */}
        <div>
          <span className="text-[10px] text-tactical-muted uppercase font-bold block mb-1">
            {isVolunteer ? 'RESPONDER PROFILE' : isHospital ? 'MEDICAL FACILITY TELEMETRY' : isShelter ? 'RELIEF CAMP SPECIFICATION' : 'OSINT SITUATION REPORT'}
          </span>
          <p className="text-tactical-text leading-relaxed bg-surface-high/40 p-2.5 rounded-lg border border-surface-highest/40 font-sans text-xs">
            {node.details}
          </p>
        </div>

        {/* Contact Hotline */}
        {node.contact && (
          <div className="flex items-center space-x-2 text-tactical-muted bg-surface-lowest p-2 rounded-lg border border-surface-highest/50">
            <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
            <a 
              href={`tel:${node.contact.replace(/[^0-9+]/g, '')}`} 
              className="font-mono text-xs text-tactical-text hover:text-primary transition-colors underline"
            >
              {node.contact}
            </a>
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
              className="w-full py-3 rounded-full bg-primary text-slate-950 font-semibold text-xs flex items-center justify-center space-x-1.5 hover:bg-primary-hover transition-all shadow-md active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>DISPATCH TASK</span>
            </Link>

            <button
              onClick={() => onStatusChange && onStatusChange(node.id, node.status === 'AVAILABLE' ? 'BUSY' : 'AVAILABLE')}
              className={`w-full py-3 rounded-full border text-xs font-semibold flex items-center justify-center space-x-1 transition-all active:scale-95 ${
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
            {isHazard ? (
              <Link
                href={`/disasters/${node.id}`}
                className="w-full py-3 rounded-full bg-primary text-slate-950 font-semibold text-xs flex items-center justify-center space-x-1 hover:bg-primary-hover transition-all shadow-md active:scale-95"
              >
                <span>TACTICAL BRIEF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <a
                href={node.contact ? `tel:${node.contact.replace(/[^0-9+]/g, '')}` : '#'}
                className="w-full py-3 rounded-full bg-primary text-slate-950 font-semibold text-xs flex items-center justify-center space-x-1 hover:bg-primary-hover transition-all shadow-md active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>CALL DISPATCH</span>
              </a>
            )}

            <button
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${node.lat},${node.lng}`;
                window.open(url, '_blank');
              }}
              className="w-full py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.10] text-white text-xs font-semibold flex items-center justify-center space-x-1 transition-all active:scale-95"
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
