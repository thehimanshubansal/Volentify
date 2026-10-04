'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Building2, 
  BrainCircuit, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Radio, 
  FileText,
  Server,
  Database
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'models' | 'logs'>('approvals');

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emergency/15 border border-emergency/40 text-emergency font-mono text-xs backdrop-blur-md">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>NATIONAL COMMAND ADMIN PANEL</span>
          </div>
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            System Administration & Control
          </h1>
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Agency verification queues, machine learning performance inference latencies, and real-time WebSocket telemetry status.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-2 bg-white/[0.03] p-1.5 rounded-full border border-white/[0.08]">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-5 py-2 rounded-full font-mono text-xs transition-all ${
              activeTab === 'approvals' ? 'bg-primary text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Approvals (8)
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-5 py-2 rounded-full font-mono text-xs transition-all ${
              activeTab === 'models' ? 'bg-primary text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            ML Models
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-5 py-2 rounded-full font-mono text-xs transition-all ${
              activeTab === 'logs' ? 'bg-primary text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            API Logs
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <h3 className="font-mono text-xs text-primary uppercase tracking-widest font-semibold">
            PENDING AGENCY & NGO VERIFICATION QUEUE
          </h3>
          
          <div className="p-7 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-serif text-2xl text-white font-normal">Oxfam India Response Unit</h4>
              <div className="font-mono text-xs text-slate-400">Reg No: NGO-IND-8491 • Requested Role: NGO Partner • Sector: Odisha Coastal Relief</div>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={() => alert('Agency Approved!')}
                className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md transition-all"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve Credentials</span>
              </button>
              <button
                onClick={() => alert('Agency Rejected')}
                className="px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white text-xs font-semibold transition-all"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'models' && (
        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-6">
          <h3 className="font-mono text-xs text-primary uppercase tracking-widest font-semibold">
            ML MODEL INFERENCE PERFORMANCE METRICS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest block">MODEL 1: XGBOOST SURGE PREDICTOR</span>
              <span className="font-serif text-4xl text-emerald-400 block">94.8% Accuracy</span>
              <span className="font-mono text-xs text-slate-400 block">Inference Latency: 42ms • K-Fold CV (k=5)</span>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest block">MODEL 2: DISTILBERT SITREP NLP</span>
              <span className="font-serif text-4xl text-emerald-400 block">98.1% F1 Score</span>
              <span className="font-mono text-xs text-slate-400 block">Inference Latency: 110ms • Multilingual Transformer</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-3 font-mono text-xs">
          <div className="text-emerald-400">[2026-10-04 18:36:12] POST /api/v2/alerts 200 OK — 12ms — Client 192.168.1.1</div>
          <div className="text-emerald-400">[2026-10-04 18:36:15] GET /api/v2/disasters/live 200 OK — 8ms — GIS Map Cache Hit</div>
          <div className="text-primary">[2026-10-04 18:36:18] WS /ws/telemetry CONNECTED — Client ID #849 (God's Eye Mode)</div>
          <div className="text-slate-400">[2026-10-04 18:36:22] GET /api/infrastructure/nearby 200 OK — 14ms (OSM Overpass Ingestion)</div>
        </div>
      )}

    </div>
  );
}
