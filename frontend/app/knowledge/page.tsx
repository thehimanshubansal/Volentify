'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, ShieldAlert, Waves, Wind, Flame, CheckCircle, ArrowRight } from 'lucide-react';

export default function KnowledgePage() {
  const protocols = [
    {
      title: 'Cyclone Safety Protocol',
      icon: Wind,
      color: 'text-primary',
      desc: 'Secure loose structural roof sheets, charge mobile power banks, store 72 hours of sealed drinking water, and switch off main electricity grids during the eyewall landfall.'
    },
    {
      title: 'Flood Evacuation Guidelines',
      icon: Waves,
      color: 'text-blue-400',
      desc: 'Move immediately to upper concrete floors or designated elevated multi-purpose cyclone shelters. Never attempt to drive or wade through fast-moving flood waters.'
    },
    {
      title: 'Wildfire Defense Protocol',
      icon: Flame,
      color: 'text-emergency',
      desc: 'Maintain a 30-meter non-combustible defensible space around structures, clear dry pine needle leaf beds, and report smoke anomalies immediately to forest range officers.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
            <BookOpen className="w-3.5 h-3.5" />
            <span>NATIONAL DISASTER PREPAREDNESS KNOWLEDGE BASE</span>
          </div>
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            Safety Protocols & Directives
          </h1>
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Standard operating procedures validated by NDMA and international humanitarian frameworks for public protection.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {protocols.map((p, idx) => {
          const Icon = p.icon;
          return (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-4 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <Icon className={`w-8 h-8 ${p.color}`} />
                <h3 className="font-serif text-2xl text-white font-normal leading-snug">
                  {p.title}
                </h3>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  {p.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">NDMA Standard</span>
                <span className="text-primary font-semibold">Active SOP</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
