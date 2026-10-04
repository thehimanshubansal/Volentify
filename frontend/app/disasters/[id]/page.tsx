'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ShieldAlert, 
  Map, 
  Clock, 
  Download, 
  Share2, 
  Hospital, 
  Home, 
  Users, 
  FileText, 
  AlertTriangle,
  ArrowLeft,
  Navigation,
  Wind,
  Waves,
  CheckCircle2,
  XCircle,
  Copy,
  Radio,
  Sparkles,
  RefreshCw,
  MapPin
} from 'lucide-react';

interface InfraFacility {
  name: string;
  type: string;
  lat: number;
  lng: number;
  distance_km: number;
  status: string;
  osm_id?: number;
  data_mode?: string;
}

interface SituationBriefing {
  event_id: string;
  event_label: string;
  severity: string;
  confidence: number;
  supporting_count: number;
  conflicting_count: number;
  duplicate_count: number;
  needs: string[];
  brief: string;
}

const DISASTER_DATA: Record<string, any> = {
  'ALT-101': {
    title: 'Cyclone Remal (Odisha & WB Coast)',
    levelText: 'CRITICAL EMERGENCY — CATEGORY 3',
    stats: 'LOCATION: 19.8135° N, 85.8312° E | LANDFALL ESTIMATE: 12 HOURS | MAX WIND: 145 KM/H',
    score: '9.4',
    impactLevel: 'HIGH IMPACT ZONE',
    lat: 19.8135,
    lng: 85.8312,
    location: 'Puri & Paradip Coast, Odisha',
    report: 'Severe Cyclonic Storm "Remal" over the Northwest Bay of Bengal has moved north-northwestwards with a speed of 16 kmph during past 6 hours. Heavy to extremely heavy rainfall forecast across Puri, Jagatsinghpur, Kendrapara, and Bhadrak districts. High tidal waves of 3-4 meters above astronomical tide are likely to inundate low-lying coastal regions.',
    timeline: [
      { color: 'bg-emergency', time: 'TODAY, 14:30 IST', event: 'NDRF Deploys 14 Battalions with Inflatable Boats' },
      { color: 'bg-primary', time: 'TODAY, 11:15 IST', event: 'Coastal Evacuation Order Issued for 45 Coastal Villages' },
      { color: 'bg-surface-highest', time: 'YESTERDAY, 22:00 IST', event: 'IMD Upgrades Deep Depression to Cyclone Remal' },
    ],
    districts: [
      { name: 'PURI', pop: '1.7M' },
      { name: 'PARADIP', pop: '890K' },
      { name: 'BHADRAK', pop: '1.5M' },
      { name: 'BALASORE', pop: '2.3M' },
    ],
    evidenceList: [
      { source: 'IMD Coastal Bulletin', type: 'OFFICIAL', text: 'Category 3 cyclone landfall expected near Dhamra port with 140 km/h wind gusts.', relation: 'SUPPORTING' },
      { source: 'NDRF Command Odisha', type: 'OFFICIAL', text: '14 rescue battalions deployed with satellite comms across Balasore and Puri.', relation: 'SUPPORTING' },
      { source: 'Local News Wire Odia', type: 'NEWS', text: 'Tidal waves over 3.5m breach embankment in 2 coastal villages near Paradip.', relation: 'SUPPORTING' },
      { source: 'Social Media Feed (X)', type: 'SOCIAL', text: 'No casualties reported in Paradip sector; relief shelters fully stocked.', relation: 'CONFLICTING' },
    ]
  },
  'ALT-102': {
    title: 'Brahmaputra River Inundation (Assam)',
    levelText: 'CRITICAL EMERGENCY — FLOOD LEVEL 4',
    stats: 'LOCATION: 26.1445° N, 91.7362° E | RIVER LEVEL: 1.8M OVER DANGER | AFFECTED AREA: 50 SQ KM',
    score: '8.8',
    impactLevel: 'SEVERE INUNDATION',
    lat: 26.1445,
    lng: 91.7362,
    location: 'Guwahati & Kamrup, Assam',
    report: 'Brahmaputra river water level has surpassed the danger mark by 1.8 meters. Continuous heavy rainfall in the catchment areas is exacerbating the situation. Currently, 12 villages in Kamrup and Barpeta districts are completely submerged. Immediate evacuation to higher ground is underway.',
    timeline: [
      { color: 'bg-emergency', time: 'TODAY, 10:00 IST', event: 'SDRF Commences Motorboat Rescue Operations' },
      { color: 'bg-primary', time: 'TODAY, 06:30 IST', event: 'River Breaches Primary Embankment at Majuli' },
      { color: 'bg-surface-highest', time: 'YESTERDAY, 18:00 IST', event: 'Flood Warning Issued for Lower Assam' },
    ],
    districts: [
      { name: 'KAMRUP', pop: '1.2M' },
      { name: 'BARPETA', pop: '1.6M' },
      { name: 'DHUBRI', pop: '1.9M' },
      { name: 'MAJULI', pop: '167K' },
    ],
    evidenceList: [
      { source: 'CWC Hydrology Bulletin', type: 'OFFICIAL', text: 'Brahmaputra at Guwahati flowing 1.82 meters above highest danger mark.', relation: 'SUPPORTING' },
      { source: 'Assam State Disaster Authority', type: 'OFFICIAL', text: 'Red alert sounded for 12 districts; 45,000 residents moved to elevated relief shelters.', relation: 'SUPPORTING' },
      { source: 'Local Media Northeast', type: 'NEWS', text: 'Motorboat rescue units active in submerged lowlands of Barpeta.', relation: 'SUPPORTING' },
    ]
  },
  'ALT-103': {
    title: 'Uttarakhand High-Altitude Forest Fires',
    levelText: 'HIGH ALERT — WILDFIRE OUTBREAK',
    stats: 'LOCATION: 30.0668° N, 79.0193° E | SPREAD RATE: 1.2 KM/H | AFFECTED: 45 HECTARES',
    score: '8.1',
    impactLevel: 'ECOLOGICAL EMERGENCY',
    lat: 30.0668,
    lng: 79.0193,
    location: 'Chamoli & Almora, Uttarakhand',
    report: 'Dry atmospheric conditions and high-velocity winds have triggered massive forest fires in the Garhwal and Kumaon regions. The fire line currently spans 5 kilometers near Chamoli. Air Force helicopters have been deployed for Bambi bucket water-drop operations to protect nearby settlements.',
    timeline: [
      { color: 'bg-emergency', time: 'TODAY, 13:45 IST', event: 'IAF Mi-17 Helicopters Begin Water Drops' },
      { color: 'bg-primary', time: 'TODAY, 09:00 IST', event: 'Highway 58 Traffic Rerouted due to Smoke' },
      { color: 'bg-surface-highest', time: 'YESTERDAY, 15:30 IST', event: 'Initial Fire Spotted by Satellite Thermal Imaging' },
    ],
    districts: [
      { name: 'CHAMOLI', pop: '390K' },
      { name: 'ALMORA', pop: '622K' },
      { name: 'PAURI', pop: '687K' },
      { name: 'NAINITAL', pop: '954K' },
    ],
    evidenceList: [
      { source: 'Forest Survey of India', type: 'OFFICIAL', text: 'Sentinel-2 thermal infrared sensors detect 14 active fire spots in Chamoli division.', relation: 'SUPPORTING' },
      { source: 'Uttarakhand Fire Corps', type: 'OFFICIAL', text: 'Fire buffer trenches dug around Gopeshwar settlement.', relation: 'SUPPORTING' },
    ]
  },
  'ALT-104': {
    title: 'Wayanad Slope Instability Warning',
    levelText: 'CRITICAL EMERGENCY — LANDSLIDE RISK',
    stats: 'LOCATION: 11.6854° N, 76.132° E | RAINFALL: 280MM / 24H | SLOPE GRADIENT: >35°',
    score: '9.2',
    impactLevel: 'EXTREME VULNERABILITY',
    lat: 11.6854,
    lng: 76.1320,
    location: 'Meppadi & Chooralmala, Wayanad',
    report: 'Unprecedented continuous rainfall of 280mm over the last 24 hours has saturated the soil along the tea estate slopes of Meppadi and Chooralmala. Geotechnical sensors indicate imminent slope failure. All traffic along the ghat roads has been suspended.',
    timeline: [
      { color: 'bg-emergency', time: 'TODAY, 08:30 IST', event: 'Soil Displacement Sensors Trigger Red Alarm' },
      { color: 'bg-primary', time: 'TODAY, 06:00 IST', event: 'Mandatory Evacuation of Estate Worker Lines' },
      { color: 'bg-surface-highest', time: 'YESTERDAY, 23:00 IST', event: 'Orange Alert Upgraded to Red Alert for Rainfall' },
    ],
    districts: [
      { name: 'WAYANAD', pop: '817K' },
      { name: 'KOZHIKODE', pop: '3.0M' },
      { name: 'MALAPPURAM', pop: '4.1M' },
    ],
    evidenceList: [
      { source: 'GSI Kerala Unit', type: 'OFFICIAL', text: 'Pore-water pressure in Chooralmala slope exceeded critical threshold of 45 kPa.', relation: 'SUPPORTING' },
      { source: 'Kerala SDRF', type: 'OFFICIAL', text: 'Evacuation corridors established; heavy machinery standing by at Kalpetta.', relation: 'SUPPORTING' },
    ]
  },
  'ALT-105': {
    title: 'Extreme Heatwave Advisory (Delhi NCR)',
    levelText: 'HIGH ALERT — SEVERE HEATWAVE',
    stats: 'LOCATION: 28.6139° N, 77.2090° E | PEAK TEMP: 47.2°C | HUMIDITY: 18%',
    score: '9.7',
    impactLevel: 'CRITICAL HEALTH RISK',
    lat: 28.6139,
    lng: 77.2090,
    location: 'Delhi National Capital Region',
    report: 'A severe and prolonged heatwave is gripping Northern India, with temperatures in Delhi NCR peaking at 47.2°C. The IMD has issued a Red Alert for the next 5 consecutive days. High risk of heatstroke and dehydration, particularly for outdoor workers and vulnerable populations. Power grid stress is extremely high.',
    timeline: [
      { color: 'bg-emergency', time: 'TODAY, 14:00 IST', event: 'Temperature Breaches 47°C Mark' },
      { color: 'bg-primary', time: 'TODAY, 10:00 IST', event: 'Advisory: Halt All Outdoor Construction Work' },
      { color: 'bg-surface-highest', time: 'YESTERDAY, 17:00 IST', event: 'IMD Issues Red Alert for Consecutive 5 Days' },
    ],
    districts: [
      { name: 'NEW DELHI', pop: '252K' },
      { name: 'GURUGRAM', pop: '1.5M' },
      { name: 'FARIDABAD', pop: '1.8M' },
      { name: 'NOIDA', pop: '642K' },
    ],
    evidenceList: [
      { source: 'IMD Regional Meteorological Centre', type: 'OFFICIAL', text: 'Safdarjung observatory records 47.2°C with dry westerly winds from Thar desert.', relation: 'SUPPORTING' },
      { source: 'Delhi Disaster Management Authority', type: 'OFFICIAL', text: 'Cooling centers and water distribution booths activated across 11 revenue districts.', relation: 'SUPPORTING' },
    ]
  }
};

export default function DisasterDetailsPage() {
  const params = useParams();
  const disasterId = (params?.id || 'ALT-101').toString();
  const data = DISASTER_DATA[disasterId] || DISASTER_DATA['ALT-101'];

  const [infraFacilities, setInfraFacilities] = useState<InfraFacility[]>([]);
  const [infraDataMode, setInfraDataMode] = useState<'LIVE' | 'DEMO'>('DEMO');
  const [loadingInfra, setLoadingInfra] = useState(false);
  const [briefing, setBriefing] = useState<SituationBriefing | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchLiveIntelligence() {
      setLoadingInfra(true);

      try {
        const res = await fetch('/api/infrastructure/nearby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: data.lat,
            lng: data.lng,
            radius_km: 15.0
          })
        });

        if (res.ok) {
          const result = await res.json();
          if (isMounted && result.facilities?.length > 0) {
            setInfraFacilities(result.facilities);
            setInfraDataMode(result.data_mode || 'LIVE');
          }
        }
      } catch (err) {
        console.warn('Overpass API fallback active', err);
      }

      try {
        const bRes = await fetch('/api/briefing/demo');
        if (bRes.ok) {
          const bData = await bRes.json();
          if (isMounted) setBriefing(bData);
        }
      } catch (err) {
        console.warn('Briefing API fallback active', err);
      }

      if (isMounted) setLoadingInfra(false);
    }

    fetchLiveIntelligence();

    return () => {
      isMounted = false;
    };
  }, [data.lat, data.lng]);

  const displayedInfra = infraFacilities.length > 0 ? infraFacilities : [
    { name: 'AIIMS Regional Hospital', type: 'Hospital', lat: data.lat + 0.05, lng: data.lng + 0.02, distance_km: 4.8, status: 'Potentially Affected', data_mode: 'DEMO' },
    { name: 'National Highway Overpass Bridge', type: 'Bridge', lat: data.lat + 0.02, lng: data.lng - 0.03, distance_km: 3.2, status: 'In Proximity — Status Unknown', data_mode: 'DEMO' },
    { name: 'Central Secondary School Relief Center', type: 'School / College', lat: data.lat - 0.04, lng: data.lng + 0.01, distance_km: 5.6, status: 'Operational Evacuation Camp', data_mode: 'DEMO' },
    { name: 'District Fire & Rescue Station', type: 'Fire Station', lat: data.lat - 0.01, lng: data.lng - 0.02, distance_km: 2.1, status: 'Active Dispatch Unit', data_mode: 'DEMO' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      
      {/* Back Button & Top Action Controls */}
      <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
        <Link
          href="/alerts"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Alerts</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => alert('Generating official NDMA situation report PDF...')}
            className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors border border-white/[0.08] flex items-center space-x-2"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Export SitRep PDF</span>
          </button>
          <Link
            href={`/volunteer?event=${disasterId}`}
            className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs transition-all flex items-center space-x-2 shadow-lg"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Dispatch Volunteers</span>
          </Link>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="p-8 sm:p-10 rounded-3xl bg-surface-card border border-emergency/40 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider ${data.levelText.includes('CRITICAL') ? 'bg-emergency text-white animate-pulse' : 'bg-primary text-slate-950'}`}>
                {data.levelText}
              </span>
              <span className="font-mono text-xs text-slate-400">
                EVENT ID: {disasterId.toUpperCase()}
              </span>
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] font-bold">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                <span>SYNTHESIS ACTIVE</span>
              </span>
            </div>
            <h1 className="heading-editorial text-4xl sm:text-5xl text-white">
              {data.title}
            </h1>
            <div className="flex items-center space-x-2 text-xs text-primary font-sans">
              <MapPin className="w-3.5 h-3.5" />
              <span>{data.location}</span>
            </div>
            <p className="font-mono text-xs text-slate-400">
              {data.stats}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center min-w-56 shrink-0">
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest block font-medium">
              DYNAMIC SEVERITY SCORE
            </span>
            <span className="font-serif text-5xl text-emergency block mt-1">
              {data.score} <span className="text-xl text-slate-500 font-sans">/ 10</span>
            </span>
            <span className="font-mono text-xs text-emerald-400 block mt-1 font-semibold">{data.impactLevel}</span>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Intelligence, Evidence Synthesis, Timeline */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Situation Briefing (NLP Synthesized) */}
          <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="font-mono text-xs uppercase tracking-widest text-primary flex items-center space-x-2 font-semibold">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>INTEGRATED SITUATION BRIEFING (EVIDENCE-AWARE SYNTHESIS)</span>
              </h3>
              <span className="px-3 py-1 rounded-full font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                CONFIDENCE: {briefing ? `${Math.round(briefing.confidence * 100)}%` : '94.8%'}
              </span>
            </div>
            <p className="text-sm text-slate-300 font-light leading-relaxed">
              {briefing?.brief || data.report}
            </p>
            <div className="flex flex-wrap gap-2 pt-2 font-mono text-xs">
              <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-slate-400">
                Supporting Sources: <strong className="text-emerald-400">{briefing?.supporting_count || data.evidenceList?.length || 3}</strong>
              </span>
              <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-slate-400">
                Conflicting Claims: <strong className="text-amber-400">{briefing?.conflicting_count || 1}</strong>
              </span>
              <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-slate-400">
                Priority: <strong className="text-primary font-bold">Rescue & Shelter</strong>
              </span>
            </div>
          </div>

          {/* Multi-Source Evidence & Confidence Breakdown */}
          <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-5">
            <h3 className="font-mono text-xs uppercase tracking-widest text-slate-400 flex items-center space-x-2 font-semibold">
              <FileText className="w-4 h-4 text-primary" />
              <span>MULTI-SOURCE EVIDENCE VERIFICATION MATRIX</span>
            </h3>

            <div className="space-y-3">
              {(data.evidenceList || []).map((ev: any, idx: number) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
                    ev.relation === 'CONFLICTING' 
                      ? 'bg-amber-500/5 border-amber-500/30' 
                      : 'bg-white/[0.02] border-white/[0.06]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 font-mono">
                      <span className="font-bold text-white text-xs">{ev.source}</span>
                      <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-white/[0.05]">
                        {ev.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-light leading-relaxed">{ev.text}</p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full font-mono text-[9px] font-bold whitespace-nowrap ${
                    ev.relation === 'CONFLICTING'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}>
                    {ev.relation}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Incident Timeline */}
          <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-5">
            <h3 className="font-mono text-xs uppercase tracking-widest text-primary flex items-center space-x-2 font-semibold">
              <Clock className="w-4 h-4" />
              <span>CHRONOLOGICAL INCIDENT TIMELINE</span>
            </h3>
            
            <div className="space-y-4 border-l-2 border-primary/40 pl-6 text-xs">
              {data.timeline.map((item: any, idx: number) => (
                <div className="relative space-y-1" key={idx}>
                  <span className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full ${item.color}`}></span>
                  <div className="font-mono text-[10px] text-slate-500">{item.time}</div>
                  <div className="font-serif text-lg text-white font-normal">{item.event}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Affected Districts */}
          <div className="p-8 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-slate-400 font-semibold">
              AFFECTED DISTRICTS & POPULATION AT RISK
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {data.districts.map((district: any, idx: number) => (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]" key={idx}>
                  <div className="font-serif text-xl text-white">{district.name}</div>
                  <div className="font-mono text-[10px] text-slate-500 mt-1">Est. Pop: {district.pop}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Live OSM Infrastructure & Requisition */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Critical Infrastructure Proximity */}
          <div className="p-7 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-5 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="font-mono text-xs uppercase tracking-widest text-emerald-400 flex items-center space-x-2 font-semibold">
                <Hospital className="w-4 h-4" />
                <span>CRITICAL INFRASTRUCTURE</span>
              </h3>
              <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                infraDataMode === 'LIVE' 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-primary/20 text-primary border-primary/40'
              }`}>
                {infraDataMode === 'LIVE' ? 'LIVE OSM' : 'GAZETTEER'}
              </span>
            </div>

            {loadingInfra ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-primary" />
                <p>Querying OpenStreetMap Overpass API...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedInfra.map((facility: InfraFacility, idx: number) => (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1.5" key={idx}>
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-base text-white truncate max-w-[180px]">{facility.name}</span>
                      <span className="font-mono text-[10px] font-bold text-emerald-400">
                        {facility.distance_km.toFixed(1)} km
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                      <span>{facility.type}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        facility.status.includes('Affected') 
                          ? 'bg-emergency/20 text-emergency' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {facility.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rapid Volunteer Request Card */}
          <div className="p-8 rounded-3xl bg-surface-card border border-primary/30 shadow-2xl text-center space-y-4">
            <h4 className="font-serif text-2xl text-white font-normal">
              Mobilize Responders to Incident Zone
            </h4>
            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Auto-match certified first responders based on proximity and task urgency.
            </p>
            <Link
              href={`/volunteer?event=${disasterId}`}
              className="w-full py-3.5 rounded-full bg-primary hover:bg-primary-hover text-slate-950 font-semibold text-xs block transition-all shadow-lg active:scale-95"
            >
              Launch Volunteer Dispatch
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}
