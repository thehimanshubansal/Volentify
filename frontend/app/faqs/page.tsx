'use client';

import React from 'react';
import Link from 'next/link';
import { HelpCircle, ArrowRight } from 'lucide-react';

export default function FaqsPage() {
  const faqs = [
    {
      q: 'How does Volentify 2.0 dispatch volunteers to active emergencies?',
      a: 'Volentify uses geo-fenced spatial indexing with Haversine distance decay to match nearby registered volunteers with approved NDRF, SDRF, and NGO relief requisitions based on specialized capabilities (Paramedic, Boat Operator, Drone Recon, Logistics).'
    },
    {
      q: 'Is the satellite GIS map live or simulated?',
      a: 'The platform ingests real-time multi-spectral satellite telemetry from ISRO Bhuvan (OGC WMS rasters) and INSAT-3DR rapid scan thermal infrared feeds. Weather anomalies and hazard pins stream in real-time.'
    },
    {
      q: 'Are external API keys required to use the GIS map or basemaps?',
      a: 'No! Volentify is engineered to run completely out-of-the-box with zero paid API keys. All satellite, terrain, street, and dark canvas GIS tiles are provided via open high-resolution Esri ArcGIS servers without watermarks or rate-limit paywalls.'
    },
    {
      q: 'How can district authorities or NGOs submit volunteer requisitions?',
      a: 'Authorized incident commanders can register as an "Agency / EOC" or "NGO Partner", granting direct access to issue task broadcasts with required volunteer headcounts and skill requirements.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>KNOWLEDGE BASE & GUIDELINES</span>
          </div>
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Essential operational details regarding volunteer mobilization, GIS telemetry, and coordination protocols.
          </p>
        </div>
      </div>

      <div className="space-y-6 max-w-4xl">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] hover:border-white/[0.18] transition-all duration-300 space-y-3 shadow-xl"
          >
            <h3 className="font-serif text-2xl text-white font-normal leading-snug">
              {faq.q}
            </h3>
            <p className="text-sm text-slate-400 font-light leading-relaxed">
              {faq.a}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
