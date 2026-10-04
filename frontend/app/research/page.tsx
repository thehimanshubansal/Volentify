'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Download, BrainCircuit, ArrowUpRight } from 'lucide-react';

export default function ResearchPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs backdrop-blur-md">
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>OPEN SCIENCE & MACHINE LEARNING BENCHMARKS</span>
          </div>
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            Research & Publications
          </h1>
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Peer-reviewed open science methodologies in spatial hazard probability estimation, multilingual NLP situation extraction, and low-latency GIS dispatch.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-8 sm:p-10 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.20] transition-all duration-300 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
            <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
              IEEE DISASTER GIS 2026 • PEER-REVIEWED
            </span>
            <button
              onClick={() => alert('Downloading publication preprint PDF...')}
              className="px-5 py-2.5 rounded-full bg-primary text-slate-950 font-semibold text-xs hover:bg-primary-hover transition-all flex items-center space-x-2 self-start sm:self-auto shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Publication PDF</span>
            </button>
          </div>

          <h3 className="font-serif text-2xl sm:text-3xl text-white font-normal leading-snug">
            Spatial Hazard Probability Estimation via XGBoost & High-Resolution Infrared Telemetry in Coastal India
          </h3>

          <p className="text-sm text-slate-400 font-light leading-relaxed max-w-4xl">
            This paper demonstrates 94.8% accuracy in coastal storm surge and flood boundary modeling using sparse volunteer crowdsourced ground-truth observations coupled with INSAT-3DR multi-spectral satellite rasters. Evaluated across 14 historical cyclone landfall events in Odisha and West Bengal.
          </p>

          <div className="flex flex-wrap gap-2 pt-2 font-mono text-xs text-slate-400">
            <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">Keywords: Spatial GIS, XGBoost, Remote Sensing</span>
            <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">DOI: 10.1109/TGRS.2026.884102</span>
          </div>
        </div>
      </div>

    </div>
  );
}
