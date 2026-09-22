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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-telemetry">
      
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-surface-highest/60 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emergency/20 border border-emergency/40 text-emergency text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>NATIONAL COMMAND ADMIN PANEL</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text mt-2">
            System Administration & Control
          </h1>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-1.5 rounded font-bold transition-colors ${
              activeTab === 'approvals' ? 'bg-primary text-surface-lowest' : 'bg-surface-high text-tactical-text'
            }`}
          >
            PENDING APPROVALS (8)
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-3 py-1.5 rounded font-bold transition-colors ${
              activeTab === 'models' ? 'bg-primary text-surface-lowest' : 'bg-surface-high text-tactical-text'
            }`}
          >
            ML MODELS (XGBOOST)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded font-bold transition-colors ${
              activeTab === 'logs' ? 'bg-primary text-surface-lowest' : 'bg-surface-high text-tactical-text'
            }`}
          >
            API LOGS
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-primary uppercase">PENDING AGENCY & NGO VERIFICATION QUEUE</h3>
          
          <div className="p-4 rounded-xl glass-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-primary">
            <div>
              <div className="font-bold text-tactical-text text-sm">Oxfam India Response Unit</div>
              <div className="text-xs text-tactical-muted">Reg No: NGO-IND-8491 | Requested Role: NGO Partner</div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => alert('Agency Approved!')}
                className="px-3 py-1.5 rounded bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>APPROVE</span>
              </button>
              <button
                onClick={() => alert('Agency Rejected')}
                className="px-3 py-1.5 rounded bg-surface-high hover:bg-surface-highest text-tactical-muted text-xs font-bold"
              >
                REJECT
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'models' && (
        <div className="p-6 rounded-2xl glass-panel space-y-4">
          <h3 className="text-xs font-bold text-primary uppercase">ML MODEL PERFORMANCE MONITORING</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded bg-surface-high border border-surface-highest">
              <span className="text-tactical-muted block">XGBoost Surge Predictor</span>
              <span className="text-xl font-bold text-emerald-400">94.8% Accuracy</span>
              <span className="text-[10px] text-tactical-muted block">Latency: 42ms</span>
            </div>
            <div className="p-4 rounded bg-surface-high border border-surface-highest">
              <span className="text-tactical-muted block">DistilBERT SitRep NLP</span>
              <span className="text-xl font-bold text-emerald-400">98.1% F1 Score</span>
              <span className="text-[10px] text-tactical-muted block">Latency: 110ms</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="p-6 rounded-2xl bg-surface-lowest border border-surface-highest space-y-2 text-xs font-mono">
          <div className="text-emerald-400">[2026-08-06 18:36:12] POST /api/v2/alerts 200 OK - 12ms</div>
          <div className="text-emerald-400">[2026-08-06 18:36:15] GET /api/v2/disasters/live 200 OK - 8ms</div>
          <div className="text-primary">[2026-08-06 18:36:18] WS /ws/telemetry CONNECTED - Client ID #849</div>
        </div>
      )}

    </div>
  );
}
