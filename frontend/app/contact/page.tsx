'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PhoneCall, Mail, MapPin, Send, ShieldCheck, Check } from 'lucide-react';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>24X7 NATIONAL OPERATIONS COMMAND</span>
          </div>
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            Contact Command Center
          </h1>
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Reach our 24x7 National Incident Operations Team for emergency support, NGO onboarding, or agency integration.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Contact Info Card */}
        <div className="lg:col-span-5 p-8 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-6">
          <h3 className="font-serif text-2xl text-white">Emergency Channels</h3>
          
          <div className="space-y-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-slate-500 uppercase tracking-widest text-[10px] block">NATIONAL EMERGENCY HOTLINE</span>
              <span className="text-xl font-bold text-white font-serif">Dial 112 (Toll Free)</span>
              <span className="text-slate-400 block font-sans text-xs">Direct routing to nearest police, fire, or ambulance unit</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-slate-500 uppercase tracking-widest text-[10px] block">NDRF HQ CONTROL ROOM</span>
              <span className="text-lg font-bold text-primary font-serif">011-24363260</span>
              <span className="text-slate-400 block font-sans text-xs">National Disaster Response Force Duty Officer</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-slate-500 uppercase tracking-widest text-[10px] block">VOLENTIFY TECH INTEGRATION</span>
              <span className="text-sm font-bold text-slate-200">ops@volentify.org</span>
              <span className="text-slate-400 block font-sans text-xs">API credentials, GIS WMS feeds, and NGO partnership desk</span>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="lg:col-span-7 p-8 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-6">
          <h3 className="font-serif text-2xl text-white">Direct Dispatch Inquiry</h3>
          
          {sent && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Inquiry received! Our incident duty officer will respond shortly.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
                YOUR NAME / ORGANIZATION
              </label>
              <input
                required
                placeholder="e.g. Dr. Sunita Rao, Red Cross Coordinator"
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary font-sans transition-colors"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
                OFFICIAL EMAIL OR PHONE
              </label>
              <input
                required
                placeholder="sunita@redcross.org / +91 98765 43210"
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary font-sans transition-colors"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block mb-1.5 font-medium">
                INCIDENT QUERY OR SUPPORT REQUEST
              </label>
              <textarea
                rows={4}
                required
                placeholder="Describe your district requisition, technical issue, or coordination need..."
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary font-sans transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-full bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs transition-all flex items-center justify-center space-x-2 shadow-lg active:scale-95 mt-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Direct Dispatch Inquiry</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
