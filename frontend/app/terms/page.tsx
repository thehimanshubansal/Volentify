'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Header */}
      <div className="space-y-4 pb-8 border-b border-white/[0.08]">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
          <FileText className="w-3.5 h-3.5" />
          <span>STATUTORY TERMS & USAGE AGREEMENT</span>
        </div>
        <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
          Terms of Service
        </h1>
        <p className="text-base text-slate-400 font-light leading-relaxed">
          Standard operational usage terms under the National Disaster Management Act, 2005.
        </p>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-surface-card border border-white/[0.08] space-y-6 shadow-2xl">
        <div className="space-y-3">
          <h2 className="font-serif text-2xl text-white">Public Safety & Verified Broadcast Integrity</h2>
          <p className="text-sm text-slate-400 font-light leading-relaxed">
            By accessing Volentify, users agree that information broadcasted through emergency channels must represent authentic, verified emergency needs. Falsification of distress calls or fraudulent volunteer credential claims is strictly prohibited under Indian law (Disaster Management Act, Section 54).
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-white/[0.06]">
          <h2 className="font-serif text-2xl text-white">Volunteer Deployment Immunity & Good Samaritan Protections</h2>
          <p className="text-sm text-slate-400 font-light leading-relaxed">
            Registered volunteers operating under NDRF or certified NGO task assignments are protected under the Good Samaritan guidelines established by the Supreme Court of India, shielding responders acting in good faith from liability during life-saving emergency rescue actions.
          </p>
        </div>
      </div>

    </div>
  );
}
