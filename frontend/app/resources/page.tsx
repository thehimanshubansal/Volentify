'use client';

import React from 'react';
import { Hospital, Home, Phone, MapPin, Search, ExternalLink, ShieldAlert } from 'lucide-react';

export default function ResourcesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emergency/20 border border-emergency/40 text-emergency text-xs font-telemetry font-bold">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>NATIONAL EMERGENCY RESOURCE DIRECTORY</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          Emergency Resources & Helplines
        </h1>
        <p className="text-xs sm:text-sm text-tactical-muted">
          Search nearby blood banks, ICU bed availability, relief shelter locations, and national emergency contacts.
        </p>
      </div>

      {/* Grid: Search & Resource List */}
      <div className="space-y-6 font-telemetry">
        
        {/* Resource Search */}
        <div className="p-4 rounded-xl bg-surface-low border border-surface-highest flex items-center space-x-3">
          <Search className="w-5 h-5 text-primary ml-2" />
          <input
            type="text"
            placeholder="Filter by City, Hospital, Blood Group or Shelter Name..."
            className="w-full bg-transparent text-xs text-tactical-text focus:outline-none"
          />
        </div>

        {/* Directory Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="p-6 rounded-2xl glass-panel space-y-3 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">SUPER SPECIALTY HOSPITAL</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">ICU AVAILABLE</span>
            </div>
            <h3 className="text-base font-bold text-tactical-text">AIIMS Bhubaneswar</h3>
            <p className="text-xs text-tactical-muted">Sijua, Patrapada, Bhubaneswar, Odisha 751019</p>
            <div className="text-xs text-tactical-text">142 ICU Beds | Trauma Level 1 | 24x7 Ambulance</div>
            <div className="pt-2 flex items-center justify-between border-t border-surface-highest">
              <span className="text-xs text-primary font-bold">Emergency: +91 674 2476789</span>
              <button
                onClick={() => alert('Routing to hospital via MapLibre GL...')}
                className="px-3 py-1 rounded bg-surface-high hover:bg-surface-highest text-xs text-tactical-text"
              >
                Route Map
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl glass-panel space-y-3 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400">CYCLONE RELIEF SHELTER</span>
              <span className="text-[10px] text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">OPEN & STOCKED</span>
            </div>
            <h3 className="text-base font-bold text-tactical-text">Paradip Port Shelter #4</h3>
            <p className="text-xs text-tactical-muted">Near Port Authority Campus, Paradip, Odisha</p>
            <div className="text-xs text-tactical-text">Capacity: 850 | Current Occupancy: 320 | Solar Backup</div>
            <div className="pt-2 flex items-center justify-between border-t border-surface-highest">
              <span className="text-xs text-primary font-bold">Incharge: Capt. Sharma</span>
              <button
                onClick={() => alert('Routing to shelter via MapLibre GL...')}
                className="px-3 py-1 rounded bg-surface-high hover:bg-surface-highest text-xs text-tactical-text"
              >
                Route Map
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
