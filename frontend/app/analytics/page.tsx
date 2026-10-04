'use client';

import React from 'react';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { LineChart as LineIcon, Activity, Calendar, Download, TrendingUp, Users, ShieldAlert, HeartHandshake, Map } from 'lucide-react';

const DISASTER_YEARLY_DATA = [
  { year: '2020', Cyclones: 4, Floods: 12, Wildfires: 8, Others: 5 },
  { year: '2021', Cyclones: 6, Floods: 15, Wildfires: 10, Others: 4 },
  { year: '2022', Cyclones: 5, Floods: 18, Wildfires: 14, Others: 7 },
  { year: '2023', Cyclones: 7, Floods: 22, Wildfires: 11, Others: 8 },
  { year: '2024', Cyclones: 8, Floods: 25, Wildfires: 16, Others: 10 },
  { year: '2025', Cyclones: 9, Floods: 28, Wildfires: 19, Others: 12 },
];

const RESPONSE_TIME_DATA = [
  { month: 'Jan', avgMinutes: 45 },
  { month: 'Feb', avgMinutes: 42 },
  { month: 'Mar', avgMinutes: 38 },
  { month: 'Apr', avgMinutes: 35 },
  { month: 'May', avgMinutes: 28 },
  { month: 'Jun', avgMinutes: 22 },
];

const POPULATION_IMPACT_DATA = [
  { year: '2020', Affected: 1200000, Rescued: 950000 },
  { year: '2021', Affected: 1500000, Rescued: 1200000 },
  { year: '2022', Affected: 1300000, Rescued: 1100000 },
  { year: '2023', Affected: 1800000, Rescued: 1600000 },
  { year: '2024', Affected: 2200000, Rescued: 2050000 },
  { year: '2025', Affected: 2500000, Rescued: 2400000 },
];

const CATEGORY_PIE_DATA = [
  { name: 'Floods', value: 40, color: '#3b82f6' },
  { name: 'Cyclones', value: 20, color: '#ff6b00' },
  { name: 'Landslides', value: 15, color: '#a855f7' },
  { name: 'Wildfires', value: 15, color: '#ff675e' },
  { name: 'Others', value: 10, color: '#10b981' },
];

export default function AnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-primary backdrop-blur-md">
            <LineIcon className="w-3.5 h-3.5" />
            <span>HISTORICAL DISASTER & RESPONSE ANALYTICS</span>
          </div>
          <h1 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            National Analytics Dashboard
          </h1>
          <p className="text-base text-slate-400 font-light leading-relaxed">
            Multi-year historical crisis indicators, dispatch response velocity acceleration, and population impact assessments across India.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => alert('Exporting CSV analytics data...')}
            className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors backdrop-blur-md border border-white/[0.08] flex items-center space-x-2"
          >
            <Download className="w-4 h-4 text-primary" />
            <span>Export CSV Dataset</span>
          </button>
        </div>
      </div>

      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] space-y-3 shadow-xl">
          <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-primary"/>
            <span>TOTAL CITIZENS RESCUED</span>
          </div>
          <div className="font-serif text-5xl text-white">9.3M</div>
          <div className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
            <TrendingUp className="w-3.5 h-3.5"/> +12% Efficiency YoY Average
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] space-y-3 shadow-xl">
          <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-400"/>
            <span>CRITICAL INCIDENTS MANAGED</span>
          </div>
          <div className="font-serif text-5xl text-white">4,812</div>
          <div className="text-xs text-blue-400 flex items-center gap-1 font-mono">
            <Activity className="w-3.5 h-3.5"/> 28 Active Response Corridors
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] space-y-3 shadow-xl">
          <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-purple-400"/>
            <span>VOLUNTEER HOURS LOGGED</span>
          </div>
          <div className="font-serif text-5xl text-white">1.2M+</div>
          <div className="text-xs text-purple-400 flex items-center gap-1 font-mono">
            <Calendar className="w-3.5 h-3.5"/> Across 720 Indian Districts
          </div>
        </div>
      </div>

      {/* Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Disaster Frequency Bar Chart */}
        <div className="lg:col-span-8 p-8 rounded-3xl bg-surface-card border border-white/[0.08] space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <h3 className="font-serif text-2xl text-white">Annual Disaster Incidences in India (2020 - 2025)</h3>
            <span className="font-mono text-[10px] text-slate-500">SOURCE: NDMA ANNUAL REPORTS</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DISASTER_YEARLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#14171d', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="Floods" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="Cyclones" fill="#ff6b00" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="Wildfires" fill="#ff675e" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="Others" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="lg:col-span-4 p-8 rounded-3xl bg-surface-card border border-white/[0.08] space-y-6 shadow-2xl">
          <h3 className="font-serif text-2xl text-white">Hazard Distribution</h3>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={CATEGORY_PIE_DATA} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                  {CATEGORY_PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#14171d', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {CATEGORY_PIE_DATA.map((item) => (
              <div key={item.name} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-300">{item.name}: {item.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Grid: Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Population Impact Area Chart */}
        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="font-serif text-2xl text-white">Affected vs. Rescued Citizens</h3>
            <span className="font-mono text-[10px] text-slate-500">IN MILLIONS</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={POPULATION_IMPACT_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={{ backgroundColor: '#14171d', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="Affected" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                <Area type="monotone" dataKey="Rescued" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Response Speed Line Chart */}
        <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="font-serif text-2xl text-white">Average Dispatch Speed</h3>
            <span className="font-mono text-xs text-emerald-400 font-bold flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>51% FASTER</span>
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={RESPONSE_TIME_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#14171d', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="avgMinutes" stroke="#ff6b00" strokeWidth={3} dot={{ fill: '#ff6b00', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
