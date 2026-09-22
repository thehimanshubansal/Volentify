'use client';

import React from 'react';
import { ShieldCheck, Sparkles, Code2, Heart, Award } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-telemetry">
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>MAJOR PROJECT MAJOR REBUILD</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          About VOLENTIFY 2.0
        </h1>
      </div>

      <div className="p-8 rounded-2xl glass-panel space-y-4 text-xs leading-relaxed">
        <h3 className="text-lg font-bold text-primary">India's Disaster Intelligence & Volunteer Response Platform</h3>
        <p className="text-tactical-muted">
          VOLENTIFY 2.0 transforms traditional static disaster reporting into an interactive, national-scale GIS intelligence platform. Combining Next.js 15, MapLibre GL, Three.js 3D satellite visualization, and FastAPI machine learning, Volentify empowers first responders and citizens to act swiftly during extreme weather crises.
        </p>
      </div>
    </div>
  );
}
