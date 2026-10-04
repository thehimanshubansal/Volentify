'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Radio, 
  Send, 
  MapPin, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

interface AlertItem {
  id: string;
  title: string;
  category: 'Cyclone' | 'Flood' | 'Wildfire' | 'Landslide' | 'Heatwave';
  level: 'CRITICAL' | 'HIGH' | 'MODERATE';
  location: string;
  state: string;
  time: string;
  description: string;
  advisory: string;
  mlPrediction: {
    confidenceScore: string;
    predictedImpact: string;
    etaOrDuration: string;
  };
}

export default function AlertsPage() {
  const [alertsList, setAlertsList] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  useEffect(() => {
    fetch('/api/alerts')
      .then(res => res.json())
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: AlertItem[] = data.map((a: any) => ({
            id: a.id,
            title: a.title,
            category: a.category || 'Cyclone',
            level: a.level || 'HIGH',
            location: a.location || 'India',
            state: a.state || '',
            time: a.time || 'Recently',
            description: a.description || 'Emergency alert broadcast.',
            advisory: a.advisory || 'Follow local authorities evacuation orders.',
            mlPrediction: {
              confidenceScore: a.confidenceScore || '95%',
              predictedImpact: a.predictedImpact || 'High risk of damage and power grid disruption.',
              etaOrDuration: a.etaOrDuration || 'Active Warning',
            }
          }));
          setAlertsList(mapped);
        }
      })
      .catch(err => console.error('Error fetching alerts:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredAlerts = alertsList.filter(
    (a) => selectedCategory === 'ALL' || a.category.toUpperCase() === selectedCategory
  );

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage) return;
    alert(`EMERGENCY BROADCAST SENT TO VOLENTIFY APPS, SMS & WHATSAPP: "${broadcastMessage}"`);
    setBroadcastMessage('');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emergency/15 border border-emergency/40 font-mono text-xs text-emergency backdrop-blur-md">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>REAL-TIME EMERGENCY ALERT NETWORK</span>
          </div>

          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            National Crisis Alerts
          </h1>

          <p className="text-base text-slate-400 font-light leading-relaxed">
            Geofenced early warnings, automated cell broadcasts, and ML situation predictions across affected disaster corridors.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'CYCLONE', 'FLOOD', 'WILDFIRE', 'LANDSLIDE'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-slate-950 font-semibold shadow-md'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.08]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Alert List + Emergency Broadcast Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Alerts Column */}
        <div className="lg:col-span-8 space-y-6">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-7 rounded-3xl bg-surface-card border space-y-4 transition-all duration-300 hover:border-white/[0.22] hover:shadow-2xl ${
                alert.level === 'CRITICAL' ? 'border-emergency/50' : 'border-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider ${
                      alert.level === 'CRITICAL'
                        ? 'bg-emergency text-white animate-pulse'
                        : 'bg-primary text-slate-950'
                    }`}
                  >
                    {alert.level}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {alert.id} • {alert.category}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 font-mono text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{alert.time}</span>
                </div>
              </div>

              <h3 className="font-serif text-2xl text-white font-normal leading-snug">
                {alert.title}
              </h3>

              <div className="flex items-center space-x-1.5 text-xs text-primary font-sans">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{alert.location}, {alert.state}</span>
              </div>

              <p className="text-sm text-slate-400 font-light leading-relaxed">
                {alert.description}
              </p>

              {/* Advisory Box */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 space-y-1">
                <span className="font-mono text-[10px] font-bold text-emergency uppercase tracking-wider block">
                  PUBLIC ADVISORY:
                </span>
                <p className="italic font-light text-slate-400">{alert.advisory}</p>
              </div>

              {/* ML Prediction Telemetry */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] font-mono text-xs space-y-3">
                <div className="flex items-center space-x-2 text-primary border-b border-white/[0.06] pb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="font-bold uppercase tracking-wider text-[11px]">AI SITUATION PREDICTION</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">CONFIDENCE</span>
                    <span className="text-emerald-400 font-bold">{alert.mlPrediction.confidenceScore}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">TIMELINE</span>
                    <span className="text-slate-200 font-bold">{alert.mlPrediction.etaOrDuration}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block">PREDICTED IMPACT</span>
                  <span className="text-slate-300 font-sans text-xs">{alert.mlPrediction.predictedImpact}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href={`/disasters/${alert.id}`}
                  className="inline-flex items-center space-x-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  <span>View Full Tactical Intel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Emergency Broadcast Form Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-7 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-5 backdrop-blur-xl">
            <div className="flex items-center space-x-2.5 text-primary border-b border-white/[0.08] pb-3">
              <Radio className="w-5 h-5 animate-pulse text-emergency" />
              <h3 className="font-serif text-xl text-white font-normal">Emergency Broadcast</h3>
            </div>

            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Authorized personnel can issue real-time geofenced notifications to Volentify app users, SMS gateways, and WhatsApp emergency network.
            </p>

            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
                  BROADCAST MESSAGE TEXT
                </label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter official evacuation order or emergency advisory..."
                  className="w-full p-3.5 rounded-2xl bg-white/[0.03] text-xs text-white border border-white/[0.08] focus:border-primary focus:outline-none placeholder-slate-500 font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-emergency hover:brightness-110 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Emergency Broadcast</span>
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
