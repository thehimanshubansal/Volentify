'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-background text-slate-400 font-sans">
      
      {/* Pinned Helpline Bar */}
      <div className="border-b border-white/[0.04] py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Emergency Helplines: National (112) | NDRF (011-24363260) | Medical (108)</span>
          </div>
          <Link
            href="/resources"
            className="hover:text-white transition-colors flex items-center space-x-1"
          >
            <span>Emergency Resource Directory</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-12 text-xs">
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-white font-semibold">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="font-serif text-lg">Volentify</span>
          </div>
          <p className="text-slate-500 leading-relaxed max-w-xs">
            India's disaster intelligence and volunteer response platform. Real-time satellite GIS telemetry and machine learning forecasting.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-slate-200 mb-4 tracking-tight">Platform</h4>
          <ul className="space-y-2.5 text-slate-500">
            <li><Link href="/map" className="hover:text-slate-300 transition-colors">Live GIS Map</Link></li>
            <li><Link href="/alerts" className="hover:text-slate-300 transition-colors">Active Alerts</Link></li>
            <li><Link href="/predictions" className="hover:text-slate-300 transition-colors">ML Hazard Risk Forecasts</Link></li>
            <li><Link href="/disaster-intelligence" className="hover:text-slate-300 transition-colors">Disaster Intelligence</Link></li>
            <li><Link href="/analytics" className="hover:text-slate-300 transition-colors">Analytics</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-slate-200 mb-4 tracking-tight">Response Network</h4>
          <ul className="space-y-2.5 text-slate-500">
            <li><Link href="/volunteer" className="hover:text-slate-300 transition-colors">Volunteer Corps</Link></li>
            <li><Link href="/agency" className="hover:text-slate-300 transition-colors">Agency Operations</Link></li>
            <li><Link href="/ngo-partners" className="hover:text-slate-300 transition-colors">NGO Directory</Link></li>
            <li><Link href="/government" className="hover:text-slate-300 transition-colors">NDMA & SDRF Integrations</Link></li>
            <li><Link href="/resources" className="hover:text-slate-300 transition-colors">Relief Shelters</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-slate-200 mb-4 tracking-tight">Organization</h4>
          <ul className="space-y-2.5 text-slate-500">
            <li><Link href="/about" className="hover:text-slate-300 transition-colors">About Project</Link></li>
            <li><Link href="/research" className="hover:text-slate-300 transition-colors">Research Papers</Link></li>
            <li><Link href="/knowledge" className="hover:text-slate-300 transition-colors">Preparedness Protocols</Link></li>
            <li><Link href="/contact" className="hover:text-slate-300 transition-colors">Contact Command</Link></li>
            <li><Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>

      </div>

    </footer>
  );
}
