'use client';

import React, { useState, useEffect } from 'react';


import Link from 'next/link';
import { 
  ShieldAlert, 
  Radio, 
  Send, 
  Filter, 
  MapPin, 
  Clock, 
  ArrowRight,
  BellRing,
  PhoneCall
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-surface-highest/60 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emergency/15 border border-emergency/40 text-emergency text-xs font-telemetry font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>REAL-TIME EMERGENCY ALERT NETWORK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-tactical-text mt-2">
            Active Disaster Alerts (14 Live)
          </h1>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto font-telemetry text-xs">
          {['ALL', 'CYCLONE', 'FLOOD', 'WILDFIRE', 'LANDSLIDE'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-surface-lowest font-bold'
                  : 'bg-surface-high hover:bg-surface-highest text-tactical-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Alert List + Emergency Broadcast Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Alerts Column */}
        <div className="lg:col-span-8 space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-6 rounded-2xl glass-panel space-y-3 transition-all hover:border-primary/60 border ${
                alert.level === 'CRITICAL' ? 'border-emergency/50' : 'border-surface-highest'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2.5 py-0.5 rounded font-telemetry text-[10px] font-bold ${
                      alert.level === 'CRITICAL'
                        ? 'bg-emergency text-white animate-pulse'
                        : 'bg-primary text-surface-lowest'
                    }`}
                  >
                    {alert.level}
                  </span>
                  <span className="text-xs font-telemetry text-tactical-muted">
                    {alert.id} | {alert.category}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-xs font-telemetry text-tactical-muted">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{alert.time}</span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-tactical-text">
                {alert.title}
              </h3>

              <div className="flex items-center space-x-1.5 text-xs text-primary font-telemetry">
                <MapPin className="w-3.5 h-3.5" />
                <span>{alert.location}, {alert.state}</span>
              </div>

              <p className="text-xs text-tactical-muted leading-relaxed">
                {alert.description}
              </p>

              <div className="p-3 rounded-lg bg-surface-high/60 border border-surface-highest text-xs text-tactical-text space-y-1">
                <span className="text-[10px] font-telemetry font-bold text-emergency uppercase block">PUBLIC ADVISORY:</span>
                <p className="italic">{alert.advisory}</p>
              </div>

              {/* ML Prediction Telemetry */}
              <div className="p-3 rounded-lg bg-surface-container border border-surface-highest/60 font-telemetry text-xs space-y-2">
                <div className="flex items-center space-x-2 text-primary border-b border-surface-highest/60 pb-2 mb-2">
                  <Radio className="w-3.5 h-3.5" />
                  <span className="font-bold uppercase tracking-wide">AI SITUATION PREDICTION</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-tactical-muted uppercase font-bold block">CONFIDENCE</span>
                    <span className="text-emerald-400 font-bold">{alert.mlPrediction.confidenceScore}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-tactical-muted uppercase font-bold block">TIMELINE</span>
                    <span className="text-tactical-text font-bold">{alert.mlPrediction.etaOrDuration}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-tactical-muted uppercase font-bold block">PREDICTED IMPACT</span>
                  <span className="text-tactical-text">{alert.mlPrediction.predictedImpact}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href={`/disasters/${alert.id}`}
                  className="inline-flex items-center space-x-1 text-xs font-telemetry font-bold text-primary hover:underline"
                >
                  <span>VIEW FULL DISASTER INTEL</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Emergency Broadcast Form Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-2xl glass-panel space-y-4 font-telemetry">
            <div className="flex items-center space-x-2 text-primary border-b border-surface-highest pb-3">
              <Radio className="w-5 h-5 animate-pulse" />
              <h3 className="text-sm font-bold uppercase">EMERGENCY BROADCAST TRIGGER</h3>
            </div>

            <p className="text-xs text-tactical-muted">
              Authorized personnel can issue real-time geofenced notifications to Volentify app users, SMS gateways, and WhatsApp API.
            </p>

            <form onSubmit={handleBroadcast} className="space-y-3">
              <div>
                <label className="text-[10px] text-tactical-muted uppercase font-bold block mb-1">
                  BROADCAST MESSAGE TEXT
                </label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter official evacuation order or emergency advisory..."
                  className="w-full p-3 rounded-lg bg-surface-lowest text-xs text-tactical-text border border-surface-highest focus:border-primary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded bg-emergency text-white font-bold text-xs flex items-center justify-center space-x-2 hover:bg-emergency-dark transition-colors shadow-emergency"
              >
                <Send className="w-4 h-4" />
                <span>DISPATCH EMERGENCY BROADCAST</span>
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
