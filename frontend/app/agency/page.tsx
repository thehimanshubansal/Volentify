'use client';

import React from 'react';
import { Building2, ShieldCheck, Radio, Home, Users, Plus, Send } from 'lucide-react';

export default function AgencyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-secondary/30 border border-secondary-bright/40 text-secondary-bright text-xs font-telemetry font-bold">
          <Building2 className="w-3.5 h-3.5" />
          <span>INSTITUTIONAL AGENCY & NGO COORDINATION HUB</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          Agency Command Portal
        </h1>
        <p className="text-xs sm:text-sm text-tactical-muted">
          Designated dashboard for NDRF, SDRF, District Disaster Management Authorities (DDMA), Indian Red Cross, and registered NGOs.
        </p>
      </div>

      {/* Agency Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-telemetry">
        
        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <div className="w-10 h-10 rounded bg-primary/20 text-primary flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-tactical-text">Broadcast District Alert</h3>
          <p className="text-xs text-tactical-muted">
            Issue official warning bulletins directly to citizen apps and SMS networks in your jurisdiction.
          </p>
          <button
            onClick={() => alert('Opening District Broadcast Console...')}
            className="w-full py-2 rounded bg-primary text-surface-lowest font-bold text-xs"
          >
            ISSUE BROADCAST
          </button>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <div className="w-10 h-10 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Home className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-tactical-text">Manage Relief Shelters</h3>
          <p className="text-xs text-tactical-muted">
            Update live bed occupancy, food supply status, and medical equipment at government shelters.
          </p>
          <button
            onClick={() => alert('Opening Shelter Capacity Manager...')}
            className="w-full py-2 rounded bg-emerald-500 text-white font-bold text-xs"
          >
            MANAGE SHELTERS
          </button>
        </div>

        <div className="p-6 rounded-2xl glass-panel space-y-3">
          <div className="w-10 h-10 rounded bg-secondary/30 text-secondary-bright flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-tactical-text">Request Volunteer Force</h3>
          <p className="text-xs text-tactical-muted">
            Requisition trained Volentify first-responders for food packing, search operations, or debris clearing.
          </p>
          <button
            onClick={() => alert('Opening Volunteer Requisition Form...')}
            className="w-full py-2 rounded bg-secondary-bright text-surface-lowest font-bold text-xs"
          >
            REQUISITION VOLUNTEERS
          </button>
        </div>

      </div>

    </div>
  );
}
