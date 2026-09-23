'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  Layers, 
  Maximize2, 
  Minimize2, 
  Search, 
  Ruler, 
  CloudRain,
  Flame,
  Wind,
  Waves,
  ShieldAlert,
  Hospital,
  Home,
  Users,
  Radio,
  Zap,
  Sun,
  Filter,
  RefreshCw,
  Sparkles,
  Navigation
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
  const [measurementActive, setMeasurementActive] = useState(false);

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
          name: d.name,
          category: 'hazard',
          subType: d.subType || 'Disaster',
          severity: d.severity || 'HIGH',
          lat: Number(d.lat),
          lng: Number(d.lng),
          details: d.details || d.summary || 'Live incident monitored by Volentify OSINT.',
          status: d.status || 'Active Monitoring',
          updatedAt: d.updatedAt || 'Recently',
          location: d.location,
          state: d.state,
          windSpeed: d.wind_speed,
          rainfallMm: d.rainfall_mm,
          affectedPop: d.affected_pop,
        }));
        setDisasterNodes(mappedDisasters);
        if (mappedDisasters.length > 0 && !selectedNode) {
          setSelectedNode(mappedDisasters[0]);
        }
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

    // Optimistically update local state
    setVolunteerNodes(prev => prev.map(v => v.id === volunteerId ? { ...v, status: newStatus } : v));
    if (selectedNode && selectedNode.id === volunteerId) {
      setSelectedNode(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  // 2. Initialize MapLibre GL Canvas
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap & CartoDB',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
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
          // Increase heatmap weight based on disaster severity
          'heatmap-weight': ['get', 'weight'],
          // Increase intensity as user zooms in
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            9, 3
          ],
          // Radiant Dark-Theme Heatmap Gradient
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 0, 0)',
            0.2, 'rgba(56, 189, 248, 0.4)',  // Sky blue
            0.4, 'rgba(34, 197, 94, 0.6)',   // Emerald
            0.6, 'rgba(234, 179, 8, 0.8)',   // Amber
            0.8, 'rgba(249, 115, 22, 0.9)',  // Vibrant Orange
            1.0, 'rgba(239, 68, 68, 0.98)'   // Glowing Crimson
          ],
          // Adjust radius by zoom level
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 8,
            4, 20,
            8, 45,
            12, 70
          ],
          // Smoothly fade heatmap as user zooms in to inspect exact ground units
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

      // Add Sample Tactical Flood/Cyclone Hazard Buffer Polygon
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

    // Clear previous markers
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

  return (
    <div className="relative w-full h-[calc(100vh-5rem)] bg-surface-lowest overflow-hidden font-telemetry select-none">
      
      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Tactical Header Bar (Search & Quick Action Tools) */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-none">
        
        {/* Search Bar with Node Counts */}
        <div className="w-full md:w-[420px] bg-surface-low/95 backdrop-blur-xl p-2 rounded-xl border border-surface-highest shadow-tactical flex items-center space-x-2 pointer-events-auto">
          <Search className="w-4 h-4 text-primary ml-2 shrink-0" />
          <input
            type="text"
            placeholder="Search Cyclone, Flood, State, or Paramedic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-tactical-text focus:outline-none placeholder-tactical-muted font-sans"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-tactical-muted hover:text-tactical-text px-1"
            >
              Clear
            </button>
          )}
          <div className="flex items-center space-x-1 shrink-0">
            <span className="px-2 py-0.5 rounded bg-emergency/20 text-emergency text-[10px] font-bold border border-emergency/30">
              {disasterNodes.length} HAZARDS
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
              {volunteerStats.available} VOLUNTEERS
            </span>
          </div>
        </div>

        {/* Tactical Action Tools & Heatmap Toggle */}
        <div className="flex items-center space-x-2 bg-surface-low/95 backdrop-blur-xl p-1.5 rounded-xl border border-surface-highest shadow-tactical pointer-events-auto text-tactical-text">
          
          {/* Heatmap Quick Toggle */}
          <button
            onClick={() => setActiveLayers(prev => ({ ...prev, severityHeatmap: !prev.severityHeatmap }))}
            className={`p-2 rounded-lg text-xs flex items-center space-x-1.5 transition-all ${
              activeLayers.severityHeatmap ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm' : 'hover:bg-surface-high text-tactical-muted'
            }`}
            title="Toggle GPU Disaster Severity Heatmap"
          >
            <Flame className={`w-4 h-4 ${activeLayers.severityHeatmap ? 'text-primary' : 'text-tactical-muted'}`} />
            <span className="hidden sm:inline text-[11px] font-bold">Heatmap</span>
          </button>

          {/* Rain Radar Toggle */}
          <button
            onClick={() => setActiveLayers(prev => ({ ...prev, weatherRadar: !prev.weatherRadar }))}
            className={`p-2 rounded-lg text-xs flex items-center space-x-1.5 transition-all ${
              activeLayers.weatherRadar ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm' : 'hover:bg-surface-high text-tactical-muted'
            }`}
            title="Toggle Live RainViewer Radar"
          >
            <CloudRain className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline text-[11px] font-bold">Rain Radar</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-surface-high text-xs transition-colors text-tactical-muted hover:text-tactical-text"
            title="Refresh Live GIS Feeds"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-surface-high text-xs transition-colors"
            title="Toggle Fullscreen GIS"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating Volunteer Status Filter Bar (Top Center) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center space-x-1 bg-surface-low/90 backdrop-blur-xl p-1 rounded-xl border border-surface-highest shadow-tactical">
        <span className="text-[10px] text-tactical-muted uppercase font-bold px-2 flex items-center space-x-1">
          <Users className="w-3 h-3 text-primary" />
          <span>Volunteers:</span>
        </span>

        <button
          onClick={() => setVolunteerFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
            volunteerFilter === 'ALL'
              ? 'bg-primary text-surface-lowest shadow-sm'
              : 'text-tactical-muted hover:text-tactical-text hover:bg-surface-high'
          }`}
        >
          All ({volunteerStats.total})
        </button>

        <button
          onClick={() => setVolunteerFilter('AVAILABLE')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 transition-all ${
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
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 transition-all ${
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
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 transition-all ${
            volunteerFilter === 'OFFLINE'
              ? 'bg-slate-500 text-surface-lowest shadow-sm'
              : 'text-slate-400 hover:bg-slate-500/10'
          }`}
        >
          <span>Standby ({volunteerStats.offline})</span>
        </button>
      </div>

      {/* Floating Layer Controls (Top Right) */}
      <MapLayerSelector activeLayers={activeLayers} setActiveLayers={setActiveLayers} />

      {/* Slide-Out Detail Panel for Selected Marker */}
      {selectedNode && (
        <MapPopupPanel 
          node={selectedNode} 
          onClose={() => setSelectedNode(null)} 
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Timeline Playback Slider (Bottom Center) */}
      <MapTimelineSlider />

      {/* Live Tactical Map Legend (Bottom Left) */}
      <div className="absolute bottom-16 left-4 z-20 bg-surface-low/95 backdrop-blur-xl p-3.5 rounded-xl border border-surface-highest text-xs font-telemetry space-y-2 shadow-2xl hidden sm:block max-w-xs">
        <div className="text-[10px] text-tactical-muted uppercase font-bold tracking-wider border-b border-surface-highest pb-1.5 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Radio className="w-3 h-3 text-primary animate-pulse" />
            <span>DISASTER TELEMETRY LEGEND</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        </div>

        {/* Hazard Types */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
            <span className="text-tactical-text">Cyclone 🌀</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
            <span className="text-tactical-text">Flood 🌊</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-tactical-text">Wildfire 🔥</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span className="text-tactical-text">Landslide ⛰️</span>
          </div>
        </div>

        <div className="border-t border-surface-highest/60 pt-1.5 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-tactical-muted">SEVERITY HEATMAP:</span>
            <div className="flex items-center space-x-0.5">
              <span className="w-3 h-2 rounded-l bg-sky-400" title="Low"></span>
              <span className="w-3 h-2 bg-emerald-500" title="Moderate"></span>
              <span className="w-3 h-2 bg-amber-400" title="High"></span>
              <span className="w-3 h-2 rounded-r bg-red-500" title="Critical"></span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-tactical-text">Active Available Responder</span>
          </div>
        </div>
      </div>

    </div>
  );
}
