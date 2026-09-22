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
  RefreshCw
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

  // Fetch Live OSM Infrastructure and Briefing on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchLiveIntelligence() {
      setLoadingInfra(true);

      // 1. Fetch OSM Infrastructure Proximity via API
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

      // 2. Fetch or compute Situation Briefing
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

  // Fallback infrastructure if API returns empty
  const displayedInfra = infraFacilities.length > 0 ? infraFacilities : [
    { name: 'AIIMS Regional Hospital', type: 'Hospital', lat: data.lat + 0.05, lng: data.lng + 0.02, distance_km: 4.8, status: 'Potentially Affected', data_mode: 'DEMO' },
    { name: 'National Highway Overpass Bridge', type: 'Bridge', lat: data.lat + 0.02, lng: data.lng - 0.03, distance_km: 3.2, status: 'In Proximity — Status Unknown', data_mode: 'DEMO' },
    { name: 'Central Secondary School Relief Center', type: 'School / College', lat: data.lat - 0.04, lng: data.lng + 0.01, distance_km: 5.6, status: 'Operational Evacuation Camp', data_mode: 'DEMO' },
    { name: 'District Fire & Rescue Station', type: 'Fire Station', lat: data.lat - 0.01, lng: data.lng - 0.02, distance_km: 2.1, status: 'Active Dispatch Unit', data_mode: 'DEMO' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Back Button & Top Action Controls */}
      <div className="flex items-center justify-between border-b border-surface-highest/60 pb-4">
        <Link
          href="/alerts"
          className="inline-flex items-center space-x-2 text-xs font-telemetry font-bold text-tactical-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO ALERTS</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => alert('Generating official NDMA situation report PDF...')}
            className="px-4 py-2 rounded bg-surface-high hover:bg-surface-highest border border-surface-highest text-tactical-text text-xs font-bold font-telemetry flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>EXPORT PDF SITREP</span>
          </button>
          <Link
            href={`/volunteer?event=${disasterId}`}
            className="px-4 py-2 rounded bg-primary text-surface-lowest text-xs font-bold font-telemetry flex items-center space-x-1.5 hover:bg-primary-tint transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>DISPATCH VOLUNTEERS</span>
          </Link>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-surface-low border border-emergency/50 relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded text-white font-telemetry text-xs font-bold ${data.levelText.includes('CRITICAL') ? 'bg-emergency animate-pulse' : 'bg-primary'}`}>
                {data.levelText}
              </span>
              <span className="text-xs font-telemetry text-tactical-muted">
                EVENT ID: {disasterId.toUpperCase()}
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-telemetry font-bold">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                <span>EVIDENCE SYNTHESIS ACTIVE</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
              {data.title}
            </h1>
            <p className="text-xs sm:text-sm text-tactical-muted font-telemetry">
              {data.stats}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-lowest border border-surface-highest text-center font-telemetry min-w-48">
            <span className="text-[10px] text-tactical-muted uppercase font-bold block">DYNAMIC SEVERITY SCORE</span>
            <span className="text-3xl font-extrabold text-emergency">{data.score} / 10</span>
            <span className="text-[10px] text-emerald-400 block mt-1">{data.impactLevel}</span>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Intelligence, Evidence Synthesis, Timeline */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Situation Briefing (NLP Synthesized) */}
          <div className="p-6 rounded-2xl glass-panel space-y-3 font-telemetry border-l-4 border-primary">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>INTEGRATED SITUATION BRIEFING (EVIDENCE-AWARE SYNTHESIS)</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                CONFIDENCE: {briefing ? `${Math.round(briefing.confidence * 100)}%` : '94.8%'}
              </span>
            </div>
            <p className="text-xs text-tactical-text leading-relaxed font-sans">
              {briefing?.brief || data.report}
            </p>
            <div className="flex flex-wrap gap-2 pt-2 text-[10px]">
              <span className="px-2 py-1 rounded bg-surface-high border border-surface-highest text-tactical-muted">
                Supporting Sources: <strong className="text-emerald-400">{briefing?.supporting_count || data.evidenceList?.length || 3}</strong>
              </span>
              <span className="px-2 py-1 rounded bg-surface-high border border-surface-highest text-tactical-muted">
                Conflicting Claims: <strong className="text-amber-400">{briefing?.conflicting_count || 1}</strong>
              </span>
              <span className="px-2 py-1 rounded bg-surface-high border border-surface-highest text-tactical-muted">
                Primary Needs: <strong className="text-primary">Rescue, Medical & Shelter</strong>
              </span>
            </div>
          </div>

          {/* Multi-Source Evidence & Confidence Breakdown */}
          <div className="p-6 rounded-2xl glass-panel space-y-4 font-telemetry">
            <h3 className="text-sm font-bold uppercase tracking-wider text-tactical-text flex items-center space-x-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>MULTI-SOURCE EVIDENCE VERIFICATION MATRIX</span>
            </h3>

            <div className="space-y-2.5">
              {(data.evidenceList || []).map((ev: any, idx: number) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                    ev.relation === 'CONFLICTING' 
                      ? 'bg-amber-500/5 border-amber-500/30' 
                      : 'bg-surface-high/60 border-surface-highest'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-tactical-text">{ev.source}</span>
                      <span className="text-[10px] text-tactical-muted px-1.5 py-0.2 rounded bg-surface-lowest border border-surface-highest">
                        {ev.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-tactical-muted font-sans">{ev.text}</p>
                  </div>

                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${
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
          <div className="p-6 rounded-2xl glass-panel space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary font-telemetry flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>CHRONOLOGICAL INCIDENT TIMELINE</span>
            </h3>
            
            <div className="space-y-3 border-l-2 border-primary/40 pl-4 text-xs font-telemetry">
              {data.timeline.map((item: any, idx: number) => (
                <div className="relative" key={idx}>
                  <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                  <div className="text-tactical-muted text-[10px]">{item.time}</div>
                  <div className="font-bold text-tactical-text">{item.event}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Affected Districts */}
          <div className="p-6 rounded-2xl glass-panel space-y-3 font-telemetry">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
              AFFECTED DISTRICTS & POPULATION AT RISK
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {data.districts.map((district: any, idx: number) => (
                <div className="p-3 rounded bg-surface-high border border-surface-highest" key={idx}>
                  <div className="font-bold text-tactical-text">{district.name}</div>
                  <div className="text-[10px] text-tactical-muted">Est. Pop: {district.pop}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Live OSM Infrastructure & Requisition */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Critical Infrastructure Proximity (OpenStreetMap Overpass Engine) */}
          <div className="p-6 rounded-2xl glass-panel space-y-4 font-telemetry">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2">
                <Hospital className="w-4 h-4" />
                <span>CRITICAL INFRASTRUCTURE (OSM)</span>
              </h3>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                infraDataMode === 'LIVE' 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-primary/20 text-primary border-primary/40'
              }`}>
                {infraDataMode === 'LIVE' ? 'LIVE OSM OVERPASS' : 'GAZETTEER DEMO'}
              </span>
            </div>

            {loadingInfra ? (
              <div className="p-6 text-center text-xs text-tactical-muted space-y-2">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-primary" />
                <p>Querying OpenStreetMap Overpass API for nearby facilities...</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {displayedInfra.map((facility: InfraFacility, idx: number) => (
                  <div className="p-3 rounded bg-surface-container border border-surface-highest space-y-1" key={idx}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-tactical-text truncate max-w-[180px]">{facility.name}</span>
                      <span className="text-[10px] font-bold text-emerald-400 font-telemetry">
                        {facility.distance_km.toFixed(1)} km
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-tactical-muted">
                      <span>{facility.type}</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold ${
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

          {/* Rapid Volunteer Request Button */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-surface-low border border-primary/40 text-center space-y-3">
            <h4 className="text-sm font-bold text-tactical-text">
              Mobilize Responders to this Incident Zone
            </h4>
            <p className="text-xs text-tactical-muted">
              Auto-match specialized volunteers (Paramedics, Boat Operators) based on proximity and task urgency.
            </p>
            <Link
              href={`/volunteer?event=${disasterId}`}
              className="w-full py-2.5 rounded bg-primary text-surface-lowest font-bold text-xs block hover:bg-primary-tint transition-colors"
            >
              LAUNCH SKILL-AWARE REQUISITION
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}
