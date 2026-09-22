'use client';

import React from 'react';
import Link from 'next/link';
import { User, ShieldCheck, MapPin, Award, Radio, Clock, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-telemetry">
      
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-primary">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-xl bg-primary/20 text-primary border border-primary flex items-center justify-center text-xl font-bold">
            RS
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-tactical-text">Rahul Sharma</h1>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                VERIFIED VOLUNTEER
              </span>
            </div>
            <p className="text-xs text-tactical-muted">ID: VOL-IND-84920 | Location: Puri, Odisha</p>
          </div>
        </div>

        <Link
          href="/map"
          className="px-4 py-2 rounded bg-primary text-surface-lowest text-xs font-bold hover:bg-primary-tint transition-colors"
        >
          OPEN FIELD GIS MAP
        </Link>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-surface-low border border-surface-highest">
          <span className="text-[10px] text-tactical-muted uppercase block">COMPLETED MISSIONS</span>
          <span className="text-2xl font-bold text-primary">14</span>
        </div>
        <div className="p-5 rounded-xl bg-surface-low border border-surface-highest">
          <span className="text-[10px] text-tactical-muted uppercase block">SERVICE HOURS</span>
          <span className="text-2xl font-bold text-emerald-400">128 Hours</span>
        </div>
        <div className="p-5 rounded-xl bg-surface-low border border-surface-highest">
          <span className="text-[10px] text-tactical-muted uppercase block">DISPATCH RESPONSE RATE</span>
          <span className="text-2xl font-bold text-blue-400">98.4%</span>
        </div>
      </div>

    </div>
  );
}
