'use client';

import React from 'react';
import { FileText, Download, BrainCircuit } from 'lucide-react';

export default function ResearchPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-telemetry">
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>RESEARCH PUBLICATIONS & MACHINE LEARNING BENCHMARKS</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          Research & Publications
        </h1>
      </div>

      <div className="space-y-4 text-xs">
        <div className="p-6 rounded-2xl glass-panel space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-primary">PAPER #1 (IEEE DISASTER GIS 2026)</span>
            <button className="px-3 py-1 rounded bg-primary text-surface-lowest text-xs font-bold">DOWNLOAD PDF</button>
          </div>
          <h3 className="text-base font-bold text-tactical-text">
            XGBoost & DistilBERT Ensemble Framework for Real-Time Spatial Hazard Forecasting in Coastal India
          </h3>
          <p className="text-tactical-muted">
            Demonstrating 94.8% accuracy in cyclone storm surge boundary estimation using INSAT-3DR telemetry and sparse volunteer crowdsourced inputs.
          </p>
        </div>
      </div>
    </div>
  );
}
