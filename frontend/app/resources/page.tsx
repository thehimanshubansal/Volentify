'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Hospital, Home, Phone, MapPin, Search, ExternalLink, ShieldAlert, Map } from 'lucide-react';

export default function ResourcesPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emergency/15 border border-emergency/40 font-mono text-xs text-emergency backdrop-blur-md">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>NATIONAL EMERGENCY RESOURCE DIRECTORY</span>
          </div>
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            Emergency Resources & Helplines
          </h1>
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Search nearby blood banks, ICU bed availability, relief shelter locations, and national emergency contacts.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/map"
            className="px-6 py-3.5 rounded-full bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs transition-all flex items-center space-x-2 shadow-lg"
          >
            <Map className="w-4 h-4" />
            <span>View All on GIS Canvas</span>
          </Link>
        </div>
      </div>

      {/* Resource Search */}
      <div className="p-4 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl backdrop-blur-xl">
        <div className="relative">
          <Search className="w-5 h-5 text-primary absolute left-4 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by city, hospital name, blood group, or shelter ID..."
            className="w-full pl-12 pr-4 py-3 rounded-full bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary font-sans transition-colors"
          />
        </div>
      </div>

      {/* Directory Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">
              SUPER SPECIALTY HOSPITAL
            </span>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-bold">
              ICU AVAILABLE
            </span>
          </div>
          
          <div className="space-y-1">
            <h3 className="font-serif text-2xl text-white font-normal">AIIMS Bhubaneswar</h3>
            <p className="text-xs text-slate-400 font-light flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Sijua, Patrapada, Bhubaneswar, Odisha 751019</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] font-mono text-xs text-slate-300">
            142 ICU Beds • Trauma Level 1 • 24x7 Emergency Ambulance
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
            <span className="font-mono text-xs text-primary font-bold">Emergency: +91 674 2476789</span>
            <Link
              href="/map"
              className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white font-semibold transition-colors"
            >
              Route on Map
            </Link>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-blue-400 uppercase tracking-wider">
              CYCLONE RELIEF SHELTER
            </span>
            <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full font-bold">
              OPEN & STOCKED
            </span>
          </div>
          
          <div className="space-y-1">
            <h3 className="font-serif text-2xl text-white font-normal">Paradip Port Shelter #4</h3>
            <p className="text-xs text-slate-400 font-light flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Near Port Authority Campus, Paradip, Odisha</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] font-mono text-xs text-slate-300">
            Capacity: 850 Beds • Occupancy: 320 (38%) • Solar Generator Backup
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
            <span className="font-mono text-xs text-primary font-bold">Incharge: Capt. Sharma</span>
            <Link
              href="/map"
              className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white font-semibold transition-colors"
            >
              Route on Map
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
