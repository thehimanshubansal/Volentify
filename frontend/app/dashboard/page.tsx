'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, ShieldCheck, MapPin, Award, Radio, Clock, CheckCircle2, ArrowRight, Map, Activity, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const [userName, setUserName] = useState('Rahul Sharma');
  const [userRole, setUserRole] = useState('VOLUNTEER');
  const [userLocation, setUserLocation] = useState('Puri, Odisha');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.name) setUserName(u.name);
        if (u.role) setUserRole(u.role);
        if (u.state_district) setUserLocation(u.state_district);
      } catch (e) {}
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Profile Header Card */}
      <div className="p-8 sm:p-10 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 backdrop-blur-xl">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary border border-primary/40 flex items-center justify-center font-serif text-3xl font-normal shadow-lg">
            {userName ? userName[0].toUpperCase() : 'V'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="heading-editorial text-3xl sm:text-4xl text-white">
                {userName}
              </h1>
              <span className="px-3 py-1 rounded-full font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                VERIFIED {userRole}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-sans">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>Location: {userLocation} • ID: VOL-IND-84920</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/volunteer"
            className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors backdrop-blur-md"
          >
            Volunteer Hub
          </Link>
          <Link
            href="/map"
            className="px-6 py-3.5 rounded-full bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs transition-all flex items-center space-x-2 shadow-lg"
          >
            <Map className="w-4 h-4" />
            <span>Open Tactical GIS</span>
          </Link>
        </div>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-7 rounded-3xl bg-surface-card border border-white/[0.08] space-y-2 shadow-xl">
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest block">
            COMPLETED MISSIONS
          </span>
          <span className="font-serif text-4xl sm:text-5xl text-primary block">
            14
          </span>
          <span className="text-xs text-slate-500 font-light block">
            Assigned across coastal districts
          </span>
        </div>

        <div className="p-7 rounded-3xl bg-surface-card border border-white/[0.08] space-y-2 shadow-xl">
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest block">
            TOTAL SERVICE HOURS
          </span>
          <span className="font-serif text-4xl sm:text-5xl text-emerald-400 block">
            128 hrs
          </span>
          <span className="text-xs text-slate-500 font-light block">
            Certified humanitarian deployment time
          </span>
        </div>

        <div className="p-7 rounded-3xl bg-surface-card border border-white/[0.08] space-y-2 shadow-xl">
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest block">
            DISPATCH RESPONSE SPEED
          </span>
          <span className="font-serif text-4xl sm:text-5xl text-white block">
            98.4%
          </span>
          <span className="text-xs text-slate-500 font-light block">
            Average response time under 15 minutes
          </span>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] space-y-6">
        <h3 className="heading-editorial text-2xl sm:text-3xl text-white">
          Active Directives & Direct Dispatch
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-primary uppercase tracking-wider block">MISSION ACTIVE</span>
              <h4 className="font-serif text-xl text-white">Puri Coastal Evacuation</h4>
              <p className="text-xs text-slate-400 font-light">Deploying inflatable boat transport along Marine Drive.</p>
            </div>
            <Link
              href="/volunteer"
              className="px-4 py-2 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-slate-950 font-semibold text-xs transition-all font-mono"
            >
              View Mission
            </Link>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider block">TRAINING</span>
              <h4 className="font-serif text-xl text-white">NDMA Medical Triage Certification</h4>
              <p className="text-xs text-slate-400 font-light">Level 2 Emergency Trauma response modules completed.</p>
            </div>
            <Link
              href="/resources"
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all font-mono"
            >
              Guidelines
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
