'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  Layers, 
  Maximize2, 
  Minimize2, 
  Search, 
  CloudRain,
  Flame,
  Users,
  Radio,
  RefreshCw,
  Sparkles,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import MapLayerSelector from './MapLayerSelector';
import MapTimelineSlider from './MapTimelineSlider';
import MapPopupPanel from './MapPopupPanel';
import { addRainViewerRadarLayer, generateHazardBufferGeoJSON } from './weatherLayers';

export interface MapFeatureNode {
  id: string;
  name: string;
  category: 'hazard' | 'hospital' | 'shelter' | 'volunteer' | 'agency';
  subType: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'INFO';
  lat: number;
  lng: number;
  details: string;
  contact?: string;
  status: string;
  updatedAt: string;
  location?: string;
  state?: string;
  skills?: string[];
  equipment?: string[];
  missionsDone?: number;
  totalHours?: number;
  responseRate?: number;
  windSpeed?: number;
  rainfallMm?: number;
  affectedPop?: string;
}

export default function DisasterGISMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [disasterNodes, setDisasterNodes] = useState<MapFeatureNode[]>([]);
  const [volunteerNodes, setVolunteerNodes] = useState<MapFeatureNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<MapFeatureNode | null>(null);
  const [loading, setLoading] = useState(true);

  // Volunteer availability filter: 'ALL' | 'AVAILABLE' | 'BUSY' | 'OFFLINE'
  const [volunteerFilter, setVolunteerFilter] = useState<'ALL' | 'AVAILABLE' | 'BUSY' | 'OFFLINE'>('ALL');
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Layer Visibility State
  const [activeLayers, setActiveLayers] = useState({
    severityHeatmap: true,
    disasters: true,
    volunteers: true,
    weatherRadar: true,
    bhuvanWms: false,
    cyclone: true,
    flood: true,
    hospitals: true,
    shelters: true,
  });

  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Disasters and Volunteers in Parallel
  const fetchData = async () => {
    setLoading(true);
    try {
      const [disastersRes, volunteersRes] = await Promise.all([
        fetch('/api/disasters').then(r => r.json()).catch(() => []),
        fetch('/api/volunteers').then(r => r.json()).catch(() => [])
      ]);

      // Map Disasters
      if (Array.isArray(disastersRes)) {
        const mappedDisasters: MapFeatureNode[] = disastersRes.map((d: any) => ({
          id: d.id,
          name: d.name || d.title || 'Disaster Incident',
          category: 'hazard',
          subType: d.subType || d.category || 'Disaster',
          severity: d.severity || 'HIGH',
          lat: Number(d.lat),
          lng: Number(d.lng),
          details: d.details || d.summary || 'Live incident monitored by Volentify OSINT.',
          status: d.status || 'Active Monitoring',
          updatedAt: d.updatedAt || 'Recently',
          location: d.location,
          state: d.state,
          windSpeed: d.wind_speed ?? d.windSpeedKmh ?? d.windSpeed,
          rainfallMm: d.rainfall_mm ?? d.rainfallMm,
          affectedPop: d.affected_pop ?? d.affectedPop,
        }));
        setDisasterNodes(mappedDisasters);
      }

      // Map Volunteers
      if (Array.isArray(volunteersRes)) {
        const mappedVolunteers: MapFeatureNode[] = volunteersRes.map((v: any) => ({
          id: v.id,
          name: v.name,
          category: 'volunteer',
          subType: (v.skills && v.skills[0]) || 'Field Responder',
          lat: Number(v.currentLat ?? v.lat),
          lng: Number(v.currentLng ?? v.lng),
          details: `Specialized in ${Array.isArray(v.skills) ? v.skills.join(', ') : 'Field Response'}. Stationed at ${v.locationName || 'Field Sector'}.`,
          status: v.availability || 'AVAILABLE',
          updatedAt: 'Live Telemetry',
          location: v.locationName,
          skills: v.skills || [],
          equipment: v.equipment || [],
          missionsDone: v.missionsDone ?? Math.floor(Math.random() * 15 + 3),
          totalHours: v.totalHours ?? Math.floor(Math.random() * 80 + 20),
          responseRate: v.responseRate ?? 98.0,
          contact: v.phone || '+91 98765 43210',
        }));
        setVolunteerNodes(mappedVolunteers);
      }
    } catch (err) {
      console.error('Error loading GIS dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update volunteer status callback
  const handleStatusChange = async (volunteerId: string, newStatus: string) => {
    try {
      await fetch('/api/volunteer/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volunteer_id: volunteerId, availability: newStatus }),
      });
    } catch (e) {
      console.warn('Status sync error:', e);
    }

    setVolunteerNodes(prev => prev.map(v => v.id === volunteerId ? { ...v, status: newStatus } : v));
    if (selectedNode && selectedNode.id === volunteerId) {
      setSelectedNode(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  // 2. Initialize MapLibre GL Canvas with Free ESRI Dark Canvas GIS
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          'dark-matter-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
              'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: '&copy; Esri & OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'dark-matter-layer',
            type: 'raster',
            source: 'dark-matter-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [78.9629, 20.5937], // Centered on India
      zoom: 4.8,
      pitch: 35,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', async () => {
      // Setup GeoJSON Source for Severity Heatmap
      map.addSource('disaster-heatmap-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Add MapLibre GPU-Accelerated Heatmap Layer
      map.addLayer({
        id: 'disaster-heatmap-layer',
        type: 'heatmap',
        source: 'disaster-heatmap-source',
        maxzoom: 15,
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            9, 3
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 0, 0)',
            0.2, 'rgba(56, 189, 248, 0.4)',
            0.4, 'rgba(34, 197, 94, 0.6)',
            0.6, 'rgba(234, 179, 8, 0.8)',
            0.8, 'rgba(249, 115, 22, 0.9)',
            1.0, 'rgba(239, 68, 68, 0.98)'
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 8,
            4, 20,
            8, 45,
            12, 70
          ],
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 0.85,
            9, 0.5,
            12, 0.2
          ],
        },
      });

      // Add Live Weather Radar Layer
      if (activeLayers.weatherRadar) {
        await addRainViewerRadarLayer(map);
      }

      // Add Tactical Hazard Zone Polygon
      const sampleBuffer = generateHazardBufferGeoJSON(85.8312, 19.8135, 45.0);
      map.addSource('hazard-zone-buffer', {
        type: 'geojson',
        data: sampleBuffer as any,
      });

      map.addLayer({
        id: 'hazard-zone-fill',
        type: 'fill',
        source: 'hazard-zone-buffer',
        paint: {
          'fill-color': '#ff675e',
          'fill-opacity': 0.15,
        },
      });

      map.addLayer({
        id: 'hazard-zone-line',
        type: 'line',
        source: 'hazard-zone-buffer',
        paint: {
          'line-color': '#ff675e',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });
    });

    return () => {
      map.remove();
    };
  }, []);

  // 3. Update Heatmap Data Source when Disasters Change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('disaster-heatmap-source') as maplibregl.GeoJSONSource;
    if (!source) return;

    const features = disasterNodes.map(d => {
      let weight = 0.4;
      if (d.severity === 'CRITICAL') weight = 1.0;
      else if (d.severity === 'HIGH') weight = 0.7;
      else if (d.severity === 'MODERATE') weight = 0.4;
      else if (d.severity === 'LOW') weight = 0.2;

      return {
        type: 'Feature' as const,
        properties: {
          id: d.id,
          name: d.name,
          severity: d.severity,
          weight: weight,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [d.lng, d.lat],
        },
      };
    });

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [disasterNodes]);

  // 4. Toggle Heatmap Layer Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('disaster-heatmap-layer')) return;
    map.setLayoutProperty(
      'disaster-heatmap-layer',
      'visibility',
      activeLayers.severityHeatmap ? 'visible' : 'none'
    );
  }, [activeLayers.severityHeatmap]);

  // 5. Toggle Weather Radar Layer Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('rainviewer-radar-layer')) return;
    map.setLayoutProperty(
      'rainviewer-radar-layer',
      'visibility',
      activeLayers.weatherRadar ? 'visible' : 'none'
    );
  }, [activeLayers.weatherRadar]);

  // 6. Helper to Generate Disaster Subtype Tactical Marker HTML
  const createDisasterMarkerElement = (node: MapFeatureNode) => {
    const el = document.createElement('div');
    el.className = 'custom-disaster-marker cursor-pointer transition-transform hover:scale-125 z-10';

    const sub = (node.subType || '').toLowerCase();
    const isCritical = node.severity === 'CRITICAL';
    const isHigh = node.severity === 'HIGH';

    let iconSvg = '';
    let bgColor = 'bg-primary';
    let ringColor = 'border-primary';
    let pingColor = 'bg-primary';

    if (sub.includes('cyclone') || sub.includes('storm')) {
      bgColor = isCritical ? 'bg-rose-600' : 'bg-violet-600';
      ringColor = 'border-violet-400';
      pingColor = 'bg-violet-500';
      iconSvg = `<svg class="w-4 h-4 text-white animate-spin" style="animation-duration: 4s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17.7 7.7a7.5 7.5 0 0 0-10.6 0M6.3 16.3a7.5 7.5 0 0 0 10.6 0M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>`;
    } else if (sub.includes('flood') || sub.includes('inundation')) {
      bgColor = isCritical ? 'bg-red-600' : 'bg-cyan-600';
      ringColor = 'border-cyan-400';
      pingColor = 'bg-cyan-500';
      iconSvg = `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`;
    } else if (sub.includes('wildfire') || sub.includes('fire')) {
      bgColor = isCritical ? 'bg-red-600' : 'bg-amber-600';
      ringColor = 'border-amber-400';
      pingColor = 'bg-amber-500';
      iconSvg = `<svg class="w-4 h-4 text-white animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
    } else if (sub.includes('landslide')) {
      bgColor = isCritical ? 'bg-red-600' : 'bg-orange-600';
      ringColor = 'border-orange-400';
      pingColor = 'bg-orange-500';
      iconSvg = `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else if (sub.includes('earthquake') || sub.includes('seismic')) {
      bgColor = isCritical ? 'bg-red-600' : 'bg-yellow-600';
      ringColor = 'border-yellow-400';
      pingColor = 'bg-yellow-500';
      iconSvg = `<svg class="w-4 h-4 text-white animate-bounce" style="animation-duration: 2s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
    } else {
      bgColor = isCritical ? 'bg-red-600' : 'bg-amber-600';
      ringColor = 'border-amber-400';
      pingColor = 'bg-amber-500';
      iconSvg = `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    }

    el.innerHTML = `
      <div class="relative flex items-center justify-center">
        ${isCritical || isHigh ? `<span class="absolute inline-flex h-9 w-9 rounded-full ${pingColor} opacity-50 animate-ping"></span>` : ''}
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full ${bgColor} shadow-2xl border-2 ${ringColor}">
          ${iconSvg}
        </div>
        <div class="absolute -bottom-4 px-1.5 py-0.2 rounded bg-surface-lowest/90 border border-surface-highest text-[9px] font-mono font-bold text-tactical-text shadow-md whitespace-nowrap pointer-events-none">
          ${node.subType}
        </div>
      </div>
    `;

    return el;
  };

  // 7. Helper to Generate Volunteer Tactical Marker HTML
  const createVolunteerMarkerElement = (node: MapFeatureNode) => {
    const el = document.createElement('div');
    el.className = 'custom-volunteer-marker cursor-pointer transition-transform hover:scale-125 z-20';

    const isAvail = node.status === 'AVAILABLE';
    const isBusy = node.status === 'BUSY';

    const dotColor = isAvail ? 'bg-emerald-400' : isBusy ? 'bg-amber-400' : 'bg-slate-400';
    const ringPulse = isAvail ? '<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-surface-lowest"></span></span>' : `<span class="absolute -top-1 -right-1 inline-flex rounded-full h-2.5 w-2.5 ${dotColor} border border-surface-lowest"></span>`;

    el.innerHTML = `
      <div class="relative flex flex-col items-center">
        <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-surface-low border-2 ${isAvail ? 'border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'border-surface-highest'} text-tactical-text shadow-lg">
          <svg class="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ${ringPulse}
        </div>
        <div class="mt-0.5 px-1 rounded bg-surface-low/90 border border-surface-highest/80 text-[8px] font-mono text-tactical-muted whitespace-nowrap pointer-events-none">
          ${node.name.split(' ')[0]}
        </div>
      </div>
    `;

    return el;
  };

  // 8. Render All Markers (Disasters + Volunteers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Filter disasters
    const visibleDisasters = activeLayers.disasters ? disasterNodes.filter(n =>
      searchQuery === '' ||
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.location && n.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (n.state && n.state.toLowerCase().includes(searchQuery.toLowerCase())) ||
      n.subType.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [];

    // Filter volunteers
    const visibleVolunteers = activeLayers.volunteers ? volunteerNodes.filter(v => {
      const matchesSearch = searchQuery === '' ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.location && v.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.skills && v.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())));
      
      const matchesFilter = volunteerFilter === 'ALL' || v.status === volunteerFilter;

      return matchesSearch && matchesFilter;
    }) : [];

    // Render Disaster Markers
    visibleDisasters.forEach((node) => {
      const el = createDisasterMarkerElement(node);
      el.addEventListener('click', () => {
        setSelectedNode(node);
        map.flyTo({ center: [node.lng, node.lat], zoom: 8.5, pitch: 45, duration: 1200 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([node.lng, node.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Render Volunteer Markers
    visibleVolunteers.forEach((node) => {
      const el = createVolunteerMarkerElement(node);
      el.addEventListener('click', () => {
        setSelectedNode(node);
        map.flyTo({ center: [node.lng, node.lat], zoom: 10, pitch: 40, duration: 1200 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([node.lng, node.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

  }, [disasterNodes, volunteerNodes, activeLayers.disasters, activeLayers.volunteers, volunteerFilter, searchQuery]);

  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Volunteer stats for filter bar
  const volunteerStats = useMemo(() => {
    const total = volunteerNodes.length;
    const available = volunteerNodes.filter(v => v.status === 'AVAILABLE').length;
    const busy = volunteerNodes.filter(v => v.status === 'BUSY').length;
    const offline = volunteerNodes.filter(v => v.status === 'OFFLINE').length;
    return { total, available, busy, offline };
  }, [volunteerNodes]);

  const activeLayersCount = Object.values(activeLayers).filter(Boolean).length;

  return (
    <div className="relative w-full h-[calc(100vh-5rem)] bg-surface-lowest overflow-hidden font-telemetry select-none">
      
      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Unified Sleek Top HUD Bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        
        {/* Left: Search & Metrics */}
        <div className="flex items-center space-x-2 bg-surface-low/95 backdrop-blur-xl p-1.5 rounded-2xl border border-surface-highest/80 shadow-2xl pointer-events-auto">
          <div className="flex items-center space-x-2 pl-2 pr-1 py-0.5">
            <Search className="w-4 h-4 text-primary shrink-0" />
            <input
              type="text"
              placeholder="Search Cyclone, Flood, State, or Paramedic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-44 sm:w-64 bg-transparent text-xs text-tactical-text focus:outline-none placeholder-tactical-muted font-sans"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-tactical-muted hover:text-tactical-text px-1"
              >
                ✕
              </button>
            )}
          </div>
          <div className="hidden sm:flex items-center space-x-1 pl-1 border-l border-surface-highest">
            <span className="px-2 py-0.5 rounded-lg bg-emergency/20 text-emergency text-[10px] font-bold border border-emergency/30">
              {disasterNodes.length} HAZARDS
            </span>
          </div>
        </div>

        {/* Center: Volunteer Status Filter Pills */}
        <div className="hidden lg:flex items-center space-x-1 bg-surface-low/95 backdrop-blur-xl p-1 rounded-2xl border border-surface-highest/80 shadow-2xl pointer-events-auto">
          <span className="text-[10px] text-tactical-muted uppercase font-bold px-2 flex items-center space-x-1">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>Volunteers:</span>
          </span>

          <button
            onClick={() => setVolunteerFilter('ALL')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
              volunteerFilter === 'ALL'
                ? 'bg-primary text-surface-lowest shadow-sm'
                : 'text-tactical-muted hover:text-tactical-text hover:bg-surface-high'
            }`}
          >
            All ({volunteerStats.total})
          </button>

          <button
            onClick={() => setVolunteerFilter('AVAILABLE')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center space-x-1.5 transition-all ${
              volunteerFilter === 'AVAILABLE'
                ? 'bg-emerald-500 text-surface-lowest shadow-sm'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Available ({volunteerStats.available})</span>
          </button>

          <button
            onClick={() => setVolunteerFilter('BUSY')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center space-x-1.5 transition-all ${
              volunteerFilter === 'BUSY'
                ? 'bg-amber-500 text-surface-lowest shadow-sm'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Deployed ({volunteerStats.busy})</span>
          </button>

          <button
            onClick={() => setVolunteerFilter('OFFLINE')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center space-x-1.5 transition-all ${
              volunteerFilter === 'OFFLINE'
                ? 'bg-slate-500 text-surface-lowest shadow-sm'
                : 'text-slate-400 hover:bg-slate-500/10'
            }`}
          >
            <span>Standby ({volunteerStats.offline})</span>
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center space-x-1.5 bg-surface-low/95 backdrop-blur-xl p-1 rounded-2xl border border-surface-highest/80 shadow-2xl pointer-events-auto text-tactical-text">
          
          {/* Heatmap Toggle */}
          <button
            onClick={() => setActiveLayers(prev => ({ ...prev, severityHeatmap: !prev.severityHeatmap }))}
            className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all ${
              activeLayers.severityHeatmap ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm' : 'hover:bg-surface-high text-tactical-muted'
            }`}
            title="Toggle GPU Disaster Severity Heatmap"
          >
            <Flame className={`w-3.5 h-3.5 ${activeLayers.severityHeatmap ? 'text-primary' : 'text-tactical-muted'}`} />
            <span className="hidden sm:inline text-[11px] font-bold">Heatmap</span>
          </button>

          {/* Rain Radar Toggle */}
          <button
            onClick={() => setActiveLayers(prev => ({ ...prev, weatherRadar: !prev.weatherRadar }))}
            className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all ${
              activeLayers.weatherRadar ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm' : 'hover:bg-surface-high text-tactical-muted'
            }`}
            title="Toggle Live RainViewer Radar"
          >
            <CloudRain className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline text-[11px] font-bold">Radar</span>
          </button>

          {/* GIS Layers Dropdown Trigger */}
          <button
            onClick={() => setIsLayersOpen(!isLayersOpen)}
            className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all ${
              isLayersOpen ? 'bg-primary text-surface-lowest font-bold' : 'hover:bg-surface-high text-tactical-text'
            }`}
            title="Toggle GIS Layers Menu"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">Layers ({activeLayersCount})</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-xl hover:bg-surface-high text-xs transition-colors text-tactical-muted hover:text-tactical-text"
            title="Refresh Live GIS Feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl hover:bg-surface-high text-xs transition-colors"
            title="Toggle Fullscreen GIS"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Layer Selector Dropdown Component */}
      <MapLayerSelector 
        activeLayers={activeLayers} 
        setActiveLayers={setActiveLayers} 
        isOpen={isLayersOpen} 
        onClose={() => setIsLayersOpen(false)} 
      />

      {/* Slide-In Inspector Drawer (Appears Only When Marker is Clicked) */}
      {selectedNode && (
        <MapPopupPanel 
          node={selectedNode} 
          onClose={() => setSelectedNode(null)} 
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Collapsible Minimal Bottom HUD Toolbar (Timeline & Legend) */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-end justify-between pointer-events-none">
        
        {/* Compact Legend Pill */}
        <div className="bg-surface-low/95 backdrop-blur-xl p-2 rounded-2xl border border-surface-highest shadow-2xl pointer-events-auto">
          <button 
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="flex items-center space-x-2 text-xs font-bold text-tactical-text px-1"
          >
            <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-[11px]">Legend</span>
            {isLegendOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {isLegendOpen && (
            <div className="mt-2 pt-2 border-t border-surface-highest/80 space-y-1.5 text-[10px] animate-in fade-in-50 duration-150">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                  <span>Cyclone 🌀</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  <span>Flood 🌊</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Wildfire 🔥</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span>Landslide ⛰️</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 pt-1 border-t border-surface-highest/50">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-emerald-400 font-bold">Active Responder</span>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Slider Center Bar */}
        <div className="pointer-events-auto w-full max-w-lg mx-auto">
          {isTimelineOpen ? (
            <div className="relative">
              <button 
                onClick={() => setIsTimelineOpen(false)}
                className="absolute -top-7 right-0 text-[10px] text-tactical-muted hover:text-tactical-text bg-surface-low/90 px-2 py-0.5 rounded-lg border border-surface-highest"
              >
                Hide Timeline ✕
              </button>
              <MapTimelineSlider />
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => setIsTimelineOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-surface-low/90 backdrop-blur-xl border border-surface-highest/80 text-[11px] font-bold text-tactical-text hover:text-primary shadow-tactical flex items-center space-x-1.5 transition-all"
              >
                <Radio className="w-3.5 h-3.5 text-primary" />
                <span>Simulation Timeline (48h)</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Empty placeholder for balance */}
        <div className="w-20 hidden md:block"></div>
      </div>

    </div>
  );
}
