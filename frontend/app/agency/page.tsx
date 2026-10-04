'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, ShieldCheck, Radio, Home, Users, Plus, Send, ArrowRight } from 'lucide-react';

export default function AgencyPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
            <Building2 className="w-3.5 h-3.5" />
            <span>INSTITUTIONAL AGENCY & NGO COORDINATION HUB</span>
          </div>
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            Agency Command Portal
          </h1>
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Designated operations console for NDRF, SDRF, District Disaster Management Authorities (DDMA), and registered NGOs.
          </p>
        </div>
      </div>

      {/* Agency Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-5 shadow-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="font-serif text-2xl text-white font-normal leading-snug">
              Broadcast District Alert
            </h3>
            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Issue official geofenced warning bulletins directly to citizen apps and SMS gateways in your district jurisdiction.
            </p>
          </div>
          <Link
            href="/alerts"
            className="w-full py-3.5 rounded-full bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs text-center transition-all shadow-md block"
          >
            Issue Broadcast Bulletin
          </Link>
        </div>

        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-5 shadow-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Home className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl text-white font-normal leading-snug">
              Manage Relief Shelters
            </h3>
            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Update live bed occupancy, food supply status, and medical equipment at government and school evacuation shelters.
            </p>
          </div>
          <Link
            href="/resources"
            className="w-full py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs text-center transition-all shadow-md block"
          >
            Manage Shelter Inventories
          </Link>
        </div>

        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-5 shadow-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl text-white font-normal leading-snug">
              Request Volunteer Force
            </h3>
            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Requisition certified Volentify first-responders for boat rescue, medical triage, or food packing logistics.
            </p>
          </div>
          <Link
            href="/volunteer"
            className="w-full py-3.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs text-center transition-all shadow-md block border border-white/[0.08]"
          >
            Requisition Volunteers
          </Link>
        </div>

      </div>

    </div>
  );
}
