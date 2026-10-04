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
  ChevronDown,
  Eye,
  Compass,
  Hospital,
  Home,
  ShieldAlert,
  Boxes
} from 'lucide-react';
import MapLayerSelector from './MapLayerSelector';
import MapTimelineSlider from './MapTimelineSlider';
import MapPopupPanel from './MapPopupPanel';
import GodsEyeHud from './GodsEyeHud';
import { addRainViewerRadarLayer, generateHazardBufferGeoJSON } from './weatherLayers';
import { 
  MapFeatureNode, 
  TacticalSector, 
  TACTICAL_SECTORS, 
  MOCK_DISASTERS, 
  MOCK_VOLUNTEERS, 
  MOCK_HOSPITALS, 
  MOCK_SHELTERS 
} from './mockGisData';

export default function DisasterGISMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [disasterNodes, setDisasterNodes] = useState<MapFeatureNode[]>(MOCK_DISASTERS);
  const [volunteerNodes, setVolunteerNodes] = useState<MapFeatureNode[]>(MOCK_VOLUNTEERS);
  const [hospitalNodes, setHospitalNodes] = useState<MapFeatureNode[]>(MOCK_HOSPITALS);
  const [shelterNodes, setShelterNodes] = useState<MapFeatureNode[]>(MOCK_SHELTERS);
  const [selectedNode, setSelectedNode] = useState<MapFeatureNode | null>(null);
  const [loading, setLoading] = useState(false);

  // Perspective Mode: 2D vs 3D
  const [is3D, setIs3D] = useState(false);

  // God's Eye Mode
  const [isGodsEye, setIsGodsEye] = useState(false);
  const [activeSector, setActiveSector] = useState<string>('pan-india');

  // Category Filter: 'ALL' | 'HAZARDS' | 'VOLUNTEERS' | 'HOSPITALS' | 'SHELTERS'
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'HAZARDS' | 'VOLUNTEERS' | 'HOSPITALS' | 'SHELTERS'>('ALL');

  // Volunteer availability filter: 'ALL' | 'AVAILABLE' | 'BUSY' | 'OFFLINE'
  const [volunteerFilter, setVolunteerFilter] = useState<'ALL' | 'AVAILABLE' | 'BUSY' | 'OFFLINE'>('ALL');

  // Basemap style options (100% Free, Zero API Keys, Zero Watermarks)
  const BASEMAPS = {
    voyager: {
      name: '🗺️ Real Map',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      ],
      attribution: '&copy; Esri World Street Map',
    },
    satellite: {
      name: '🛰️ Satellite HD',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      attribution: '&copy; Esri World Imagery',
    },
    dark: {
      name: '🌑 Dark Tactical',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      attribution: '&copy; Esri Dark Canvas & OpenStreetMap',
    },
    topo: {
      name: '⛰️ Topographic',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      ],
      attribution: '&copy; Esri Topo',
    },
  };

  const [selectedBasemap, setSelectedBasemap] = useState<keyof typeof BASEMAPS>('voyager');

  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Layer Visibility State
  const [activeLayers, setActiveLayers] = useState({
    severityHeatmap: true,
    disasters: true,
    volunteers: true,
    hospitals: true,
    shelters: true,
    weatherRadar: false,
    hazardZones: true,
    buildings3D: true,
  });

  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Disasters and Volunteers with Resilient Offline Fallback
  const fetchData = async () => {
    setLoading(true);
    try {
      const [disastersRes, volunteersRes] = await Promise.all([
        fetch('/api/disasters').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/volunteers').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      // Map Disasters if available from API; otherwise keep rich fallback
      if (Array.isArray(disastersRes) && disastersRes.length > 0) {
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
      } else {
        setDisasterNodes(MOCK_DISASTERS);
      }

      // Map Volunteers if available from API; otherwise keep rich fallback
      if (Array.isArray(volunteersRes) && volunteersRes.length > 0) {
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
      } else {
        setVolunteerNodes(MOCK_VOLUNTEERS);
      }

      setHospitalNodes(MOCK_HOSPITALS);
      setShelterNodes(MOCK_SHELTERS);
    } catch (err) {
      console.warn('GIS API connection offline, utilizing high-precision tactical fallback:', err);
      setDisasterNodes(MOCK_DISASTERS);
      setVolunteerNodes(MOCK_VOLUNTEERS);
      setHospitalNodes(MOCK_HOSPITALS);
      setShelterNodes(MOCK_SHELTERS);
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
      console.warn('Status sync notice:', e);
    }

    setVolunteerNodes(prev => prev.map(v => v.id === volunteerId ? { ...v, status: newStatus } : v));
    if (selectedNode && selectedNode.id === volunteerId) {
      setSelectedNode(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  // 2. Initialize MapLibre GL Canvas (Once)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialBase = BASEMAPS[selectedBasemap] || BASEMAPS.voyager;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          'basemap-tiles': {
            type: 'raster',
            tiles: initialBase.tiles,
            tileSize: 256,
            attribution: initialBase.attribution,
          },
          'basemap-ref-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
          },
          'basemap-places-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
          },
          'basemap-transport-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'basemap-layer',
            type: 'raster',
            source: 'basemap-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
          {
            id: 'basemap-ref-layer',
            type: 'raster',
            source: 'basemap-ref-tiles',
            minzoom: 0,
            maxzoom: 19,
            layout: {
              visibility: selectedBasemap === 'dark' ? 'visible' : 'none',
            },
          },
          {
            id: 'basemap-transport-layer',
            type: 'raster',
            source: 'basemap-transport-tiles',
            minzoom: 0,
            maxzoom: 19,
            layout: {
              visibility: (selectedBasemap === 'dark' || selectedBasemap === 'satellite') ? 'visible' : 'none',
            },
          },
          {
            id: 'basemap-places-layer',
            type: 'raster',
            source: 'basemap-places-tiles',
            minzoom: 0,
            maxzoom: 19,
            layout: {
              visibility: (selectedBasemap === 'dark' || selectedBasemap === 'satellite') ? 'visible' : 'none',
            },
          },
        ],
      },
      center: [78.9629, 20.5937], // Centered on India
      zoom: 4.8,
      pitch: is3D ? 60 : 0,
      bearing: is3D ? -15 : 0,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', async () => {
      // GeoJSON Source for Severity Heatmap
      map.addSource('disaster-heatmap-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Heatmap Layer
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
            0, 1.8,
            5, 3.5,
            9, 5.0
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 0, 0)',
            0.1, 'rgba(14, 165, 233, 0.5)',   // Sky blue
            0.3, 'rgba(34, 197, 94, 0.75)',   // Radiant green
            0.55, 'rgba(234, 179, 8, 0.85)',  // Vivid amber
            0.75, 'rgba(249, 115, 22, 0.95)', // Burning orange
            1.0, 'rgba(239, 68, 68, 1.0)'     // Critical red
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 25,
            4, 45,
            8, 80,
            12, 130
          ],
          'heatmap-opacity': 0.85,
        },
      });

      // Tactical Hazard Zone Buffer Source
      map.addSource('hazard-zone-buffer', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.addLayer({
        id: 'hazard-zone-fill',
        type: 'fill',
        source: 'hazard-zone-buffer',
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': 0.18,
        },
      });

      map.addLayer({
        id: 'hazard-zone-line',
        type: 'line',
        source: 'hazard-zone-buffer',
        paint: {
          'line-color': '#ef4444',
          'line-width': 2,
          'line-dasharray': [3, 2],
        },
      });

      // Live Weather Radar Layer if active
      if (activeLayers.weatherRadar) {
        await addRainViewerRadarLayer(map);
      }
    });

    // ResizeObserver to ensure canvas resizing on window changes or panel toggles
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, []);

  // 3. Basemap Dynamic Switcher without Tearing Down Canvas
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const currentBase = BASEMAPS[selectedBasemap] || BASEMAPS.voyager;
    const tileSource = map.getSource('basemap-tiles') as maplibregl.RasterTileSource;
    if (tileSource && typeof tileSource.setTiles === 'function') {
      tileSource.setTiles(currentBase.tiles);
    }

    // Dynamic visibility for tactical dark and satellite boundary, road, & label overlays
    const isDark = selectedBasemap === 'dark';
    const isSatellite = selectedBasemap === 'satellite';

    if (map.getLayer('basemap-ref-layer')) {
      map.setLayoutProperty('basemap-ref-layer', 'visibility', isDark ? 'visible' : 'none');
    }
    if (map.getLayer('basemap-transport-layer')) {
      map.setLayoutProperty('basemap-transport-layer', 'visibility', (isDark || isSatellite) ? 'visible' : 'none');
    }
    if (map.getLayer('basemap-places-layer')) {
      map.setLayoutProperty('basemap-places-layer', 'visibility', (isDark || isSatellite) ? 'visible' : 'none');
    }
  }, [selectedBasemap]);

  // 4. Toggle 2D vs 3D Perspective Animation ("map mai 2d-3d")
  const toggle3D = () => {
    const map = mapRef.current;
    const nextState = !is3D;
    setIs3D(nextState);

    if (!map) return;

    if (nextState) {
      // Transition to 3D Tactical Perspective
      map.easeTo({
        pitch: 60,
        bearing: -15,
        duration: 1200,
      });
    } else {
      // Transition to 2D Top-Down Orthographic
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000,
      });
    }
  };

  // 5. God's Eye Mode Toggle ("god'seyeview")
  const toggleGodsEye = () => {
    const map = mapRef.current;
    const nextState = !isGodsEye;
    setIsGodsEye(nextState);

    if (!map) return;

    if (nextState) {
      setActiveSector('pan-india');
      setIs3D(true);
      // Zoom out to full panoramic India command altitude
      map.flyTo({
        center: [78.9629, 21.5937],
        zoom: 4.8,
        pitch: 52,
        bearing: -10,
        duration: 2000,
      });
    } else {
      map.easeTo({
        pitch: is3D ? 45 : 0,
        bearing: 0,
        duration: 1200,
      });
    }
  };

  // Teleport to Tactical Sector in God's Eye Mode
  const handleSelectSector = (sector: TacticalSector) => {
    setActiveSector(sector.id);
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: sector.center,
      zoom: sector.zoom,
      pitch: sector.pitch,
      bearing: sector.bearing,
      duration: 2200,
    });
  };

  // 6. Update Heatmap & Hazard Zone Data Sources when Disasters Change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Update Heatmap Points
    const heatSource = map.getSource('disaster-heatmap-source') as maplibregl.GeoJSONSource;
    if (heatSource) {
      const features = disasterNodes.map(d => {
        let weight = 0.5;
        if (d.severity === 'CRITICAL') weight = 1.0;
        else if (d.severity === 'HIGH') weight = 0.8;
        else if (d.severity === 'MODERATE') weight = 0.5;
        else if (d.severity === 'LOW') weight = 0.25;

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

      heatSource.setData({
        type: 'FeatureCollection',
        features,
      });
    }

    // Update Hazard Zone Buffers
    const hazardSource = map.getSource('hazard-zone-buffer') as maplibregl.GeoJSONSource;
    if (hazardSource) {
      const bufferFeatures = disasterNodes.map(d => {
        const radiusKm = d.subType.toLowerCase().includes('cyclone') ? 70 : d.subType.toLowerCase().includes('flood') ? 40 : 25;
        return generateHazardBufferGeoJSON(d.lng, d.lat, radiusKm);
      });

      hazardSource.setData({
        type: 'FeatureCollection',
        features: bufferFeatures,
      });
    }
  }, [disasterNodes]);

  // 7. Toggle Heatmap & Hazard Zone Layer Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.getLayer('disaster-heatmap-layer')) {
      map.setLayoutProperty('disaster-heatmap-layer', 'visibility', activeLayers.severityHeatmap ? 'visible' : 'none');
    }
    if (map.getLayer('hazard-zone-fill')) {
      map.setLayoutProperty('hazard-zone-fill', 'visibility', activeLayers.hazardZones ? 'visible' : 'none');
    }
    if (map.getLayer('hazard-zone-line')) {
      map.setLayoutProperty('hazard-zone-line', 'visibility', activeLayers.hazardZones ? 'visible' : 'none');
    }
    if (map.getLayer('rainviewer-radar-layer')) {
      map.setLayoutProperty('rainviewer-radar-layer', 'visibility', activeLayers.weatherRadar ? 'visible' : 'none');
    }
  }, [activeLayers]);

  // 8. Custom Marker Element Creators with 3D Stalk Shadowing Support

  // 8a. Disaster Marker
  const createDisasterMarkerElement = (node: MapFeatureNode) => {
    const el = document.createElement('div');
    el.className = `custom-disaster-marker cursor-pointer transition-transform hover:scale-125 z-20 ${is3D ? 'marker-3d-elevated' : ''}`;

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
      <div class="relative flex flex-col items-center justify-center">
        ${isCritical || isHigh ? `<span class="absolute inline-flex h-10 w-10 rounded-full ${pingColor} opacity-50 animate-ping"></span>` : ''}
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full ${bgColor} shadow-2xl border-2 ${ringColor}">
          ${iconSvg}
        </div>
        <div class="mt-1 px-1.5 py-0.5 rounded bg-surface-lowest/95 border border-surface-highest text-[9px] font-mono font-bold text-tactical-text shadow-md whitespace-nowrap pointer-events-none">
          ${node.subType}
        </div>
        ${is3D ? '<div class="w-2.5 h-1 bg-black/60 rounded-full filter blur-[1px] mt-0.5"></div>' : ''}
      </div>
    `;

    return el;
  };

  // 8b. Volunteer Marker
  const createVolunteerMarkerElement = (node: MapFeatureNode) => {
    const el = document.createElement('div');
    el.className = `custom-volunteer-marker cursor-pointer transition-transform hover:scale-125 z-20 ${is3D ? 'marker-3d-elevated' : ''}`;

    const isAvail = node.status === 'AVAILABLE';
    const isBusy = node.status === 'BUSY';

    const dotColor = isAvail ? 'bg-emerald-400' : isBusy ? 'bg-amber-400' : 'bg-slate-400';
    const ringPulse = isAvail 
      ? '<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-surface-lowest"></span></span>' 
      : `<span class="absolute -top-1 -right-1 inline-flex rounded-full h-2.5 w-2.5 ${dotColor} border border-surface-lowest"></span>`;

    el.innerHTML = `
      <div class="relative flex flex-col items-center">
        <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-surface-low border-2 ${isAvail ? 'border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'border-surface-highest'} text-tactical-text shadow-lg">
          <svg class="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ${ringPulse}
        </div>
        <div class="mt-0.5 px-1.5 py-0.5 rounded bg-surface-low/95 border border-surface-highest/80 text-[8px] font-mono text-tactical-muted whitespace-nowrap pointer-events-none">
          ${node.name.split(' ')[0]}
        </div>
        ${is3D ? '<div class="w-2 h-0.5 bg-black/60 rounded-full filter blur-[1px] mt-0.5"></div>' : ''}
      </div>
    `;

    return el;
  };

  // 8c. Hospital Marker
  const createHospitalMarkerElement = (node: MapFeatureNode) => {
    const el = document.createElement('div');
    el.className = `custom-hospital-marker cursor-pointer transition-transform hover:scale-125 z-10 ${is3D ? 'marker-3d-elevated' : ''}`;

    el.innerHTML = `
      <div class="relative flex flex-col items-center">
        <div class="relative flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 6v12M6 12h12"/></svg>
        </div>
        <div class="mt-0.5 px-1.5 py-0.5 rounded bg-surface-low/95 border border-cyan-500/40 text-[8px] font-mono text-cyan-300 whitespace-nowrap pointer-events-none">
          ${node.bedsAvailable ?? 80} BEDS
        </div>
        ${is3D ? '<div class="w-2 h-0.5 bg-black/60 rounded-full filter blur-[1px] mt-0.5"></div>' : ''}
      </div>
    `;

    return el;
  };

  // 8d. Shelter Marker
  const createShelterMarkerElement = (node: MapFeatureNode) => {
    const el = document.createElement('div');
    el.className = `custom-shelter-marker cursor-pointer transition-transform hover:scale-125 z-10 ${is3D ? 'marker-3d-elevated' : ''}`;

    const occupancyRate = (node.capacity && node.currentOccupancy)
      ? Math.round((node.currentOccupancy / node.capacity) * 100)
      : 70;

    el.innerHTML = `
      <div class="relative flex flex-col items-center">
        <div class="relative flex items-center justify-center w-7 h-7 rounded-lg bg-violet-950 border-2 border-violet-400 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.4)]">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div class="mt-0.5 px-1.5 py-0.5 rounded bg-surface-low/95 border border-violet-500/40 text-[8px] font-mono text-violet-300 whitespace-nowrap pointer-events-none">
          ${occupancyRate}% OCC
        </div>
        ${is3D ? '<div class="w-2 h-0.5 bg-black/60 rounded-full filter blur-[1px] mt-0.5"></div>' : ''}
      </div>
    `;

    return el;
  };

  // 9. Render All Active Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Filter disasters
    const visibleDisasters = (activeLayers.disasters && (categoryFilter === 'ALL' || categoryFilter === 'HAZARDS')) 
      ? disasterNodes.filter(n =>
          searchQuery === '' ||
          n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (n.location && n.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (n.state && n.state.toLowerCase().includes(searchQuery.toLowerCase())) ||
          n.subType.toLowerCase().includes(searchQuery.toLowerCase())
        ) 
      : [];

    // Filter volunteers
    const visibleVolunteers = (activeLayers.volunteers && (categoryFilter === 'ALL' || categoryFilter === 'VOLUNTEERS'))
      ? volunteerNodes.filter(v => {
          const matchesSearch = searchQuery === '' ||
            v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.location && v.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (v.skills && v.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())));
          
          const matchesStatus = volunteerFilter === 'ALL' || v.status === volunteerFilter;
          return matchesSearch && matchesStatus;
        })
      : [];

    // Filter hospitals
    const visibleHospitals = (activeLayers.hospitals && (categoryFilter === 'ALL' || categoryFilter === 'HOSPITALS'))
      ? hospitalNodes.filter(h =>
          searchQuery === '' ||
          h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (h.location && h.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (h.state && h.state.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : [];

    // Filter shelters
    const visibleShelters = (activeLayers.shelters && (categoryFilter === 'ALL' || categoryFilter === 'SHELTERS'))
      ? shelterNodes.filter(s =>
          searchQuery === '' ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.location && s.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (s.state && s.state.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : [];

    // Render Disaster Markers
    visibleDisasters.forEach((node) => {
      const el = createDisasterMarkerElement(node);
      el.addEventListener('click', () => {
        setSelectedNode(node);
        map.flyTo({ center: [node.lng, node.lat], zoom: 8.5, pitch: is3D ? 55 : 0, duration: 1200 });
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
        map.flyTo({ center: [node.lng, node.lat], zoom: 10, pitch: is3D ? 50 : 0, duration: 1200 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([node.lng, node.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Render Hospital Markers
    visibleHospitals.forEach((node) => {
      const el = createHospitalMarkerElement(node);
      el.addEventListener('click', () => {
        setSelectedNode(node);
        map.flyTo({ center: [node.lng, node.lat], zoom: 10, pitch: is3D ? 45 : 0, duration: 1200 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([node.lng, node.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Render Shelter Markers
    visibleShelters.forEach((node) => {
      const el = createShelterMarkerElement(node);
      el.addEventListener('click', () => {
        setSelectedNode(node);
        map.flyTo({ center: [node.lng, node.lat], zoom: 10, pitch: is3D ? 45 : 0, duration: 1200 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([node.lng, node.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

  }, [
    disasterNodes, 
    volunteerNodes, 
    hospitalNodes, 
    shelterNodes, 
    activeLayers, 
    categoryFilter, 
    volunteerFilter, 
    searchQuery, 
    is3D
  ]);

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

      {/* God's Eye View HUD Overlay (When Activated) */}
      {isGodsEye ? (
        <GodsEyeHud
          activeSector={activeSector}
          onSelectSector={handleSelectSector}
          onExit={toggleGodsEye}
          disasters={disasterNodes}
          volunteers={volunteerNodes}
          hospitals={hospitalNodes}
          shelters={shelterNodes}
          is3D={is3D}
          onToggle3D={toggle3D}
        />
      ) : (
        /* Standard Command HUD Bar */
        <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
          
          {/* Left: Search & Category Filter Pills */}
          <div className="flex items-center space-x-2 bg-surface-low/95 backdrop-blur-xl p-1.5 rounded-2xl border border-surface-highest/80 shadow-2xl pointer-events-auto">
            <div className="flex items-center space-x-2 pl-2 pr-1 py-0.5">
              <Search className="w-4 h-4 text-primary shrink-0" />
              <input
                type="text"
                placeholder="Search Cyclone, Flood, Hospital, Paramedic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 sm:w-60 bg-transparent text-xs text-tactical-text focus:outline-none placeholder-tactical-muted font-sans"
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

            {/* Quick Category Switcher */}
            <div className="hidden md:flex items-center space-x-1 pl-1 border-l border-surface-highest">
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  categoryFilter === 'ALL' ? 'bg-primary text-surface-lowest' : 'text-tactical-muted hover:text-tactical-text'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setCategoryFilter('HAZARDS')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  categoryFilter === 'HAZARDS' ? 'bg-emergency text-white' : 'text-emergency/80 hover:text-emergency'
                }`}
              >
                Hazards ({disasterNodes.length})
              </button>
              <button
                onClick={() => setCategoryFilter('VOLUNTEERS')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  categoryFilter === 'VOLUNTEERS' ? 'bg-emerald-500 text-surface-lowest' : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Units ({volunteerNodes.length})
              </button>
              <button
                onClick={() => setCategoryFilter('HOSPITALS')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  categoryFilter === 'HOSPITALS' ? 'bg-cyan-500 text-surface-lowest' : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                Trauma ({hospitalNodes.length})
              </button>
            </div>
          </div>

          {/* Center: God's Eye Trigger & 2D/3D Perspective Switcher */}
          <div className="flex items-center space-x-2 pointer-events-auto">
            
            {/* Master GOD'S EYE VIEW Button */}
            <button
              onClick={toggleGodsEye}
              className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-primary to-orange-600 text-surface-lowest font-black text-xs flex items-center space-x-2 shadow-[0_0_20px_rgba(255,107,0,0.5)] border border-primary/50 hover:brightness-110 active:scale-95 transition-all"
              title="Activate Panoramic Satellite Surveillance God's Eye Mode"
            >
              <Eye className="w-4 h-4 stroke-[3] animate-pulse" />
              <span className="tracking-wider">GOD'S EYE VIEW</span>
            </button>

            {/* 2D vs 3D Perspective Toggle Button */}
            <div className="flex items-center bg-surface-low/95 backdrop-blur-xl p-1 rounded-2xl border border-surface-highest/80 shadow-2xl">
              <button
                onClick={toggle3D}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  is3D
                    ? 'bg-primary text-surface-lowest shadow-sm'
                    : 'text-tactical-muted hover:text-tactical-text hover:bg-surface-high'
                }`}
                title="Toggle 2D Top-Down / 3D Tactical Perspective"
              >
                <Compass className={`w-3.5 h-3.5 ${is3D ? 'text-surface-lowest' : 'text-primary'}`} />
                <span>{is3D ? '3D VIEW' : '2D FLAT'}</span>
              </button>
            </div>

          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center space-x-1.5 bg-surface-low/95 backdrop-blur-xl p-1 rounded-2xl border border-surface-highest/80 shadow-2xl pointer-events-auto text-tactical-text">
            
            {/* Basemap Switcher Pill */}
            <div className="hidden lg:flex items-center bg-surface-high/60 p-0.5 rounded-xl border border-surface-highest">
              <button
                onClick={() => setSelectedBasemap('voyager')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  selectedBasemap === 'voyager' ? 'bg-primary text-surface-lowest shadow-sm' : 'text-tactical-muted hover:text-tactical-text'
                }`}
                title="Detailed Streets & Topography Map"
              >
                🗺️ Map
              </button>
              <button
                onClick={() => setSelectedBasemap('satellite')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  selectedBasemap === 'satellite' ? 'bg-primary text-surface-lowest shadow-sm' : 'text-tactical-muted hover:text-tactical-text'
                }`}
                title="Real High-Resolution Esri Satellite Imagery"
              >
                🛰️ Sat
              </button>
              <button
                onClick={() => setSelectedBasemap('dark')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  selectedBasemap === 'dark' ? 'bg-primary text-surface-lowest shadow-sm' : 'text-tactical-muted hover:text-tactical-text'
                }`}
                title="Dark Tactical Night Operations"
              >
                🌑 Dark
              </button>
              <button
                onClick={() => setSelectedBasemap('topo')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  selectedBasemap === 'topo' ? 'bg-primary text-surface-lowest shadow-sm' : 'text-tactical-muted hover:text-tactical-text'
                }`}
                title="Topographic Elevation Map"
              >
                ⛰️ Topo
              </button>
            </div>

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
              title="Toggle Live RainViewer Doppler Radar"
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
      )}

      {/* Layer Selector Dropdown Component */}
      <MapLayerSelector 
        activeLayers={activeLayers} 
        setActiveLayers={setActiveLayers} 
        selectedBasemap={selectedBasemap}
        setSelectedBasemap={setSelectedBasemap}
        isOpen={isLayersOpen} 
        onClose={() => setIsLayersOpen(false)}
        is3D={is3D}
        onToggle3D={toggle3D}
      />

      {/* Slide-In Inspector Drawer (Appears When Marker is Clicked) */}
      {selectedNode && (
        <MapPopupPanel 
          node={selectedNode} 
          onClose={() => setSelectedNode(null)} 
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Collapsible Minimal Bottom HUD Toolbar (Timeline & Legend) */}
      {!isGodsEye && (
        <div className="absolute bottom-4 left-4 right-4 z-20 flex items-end justify-between pointer-events-none">
          
          {/* Compact Legend Pill */}
          <div className="bg-surface-low/95 backdrop-blur-xl p-2 rounded-2xl border border-surface-highest shadow-2xl pointer-events-auto">
            <button 
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className="flex items-center space-x-2 text-xs font-bold text-tactical-text px-1"
            >
              <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span className="text-[11px]">GIS Legend</span>
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
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 border-t border-surface-highest/50">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-emerald-400 font-semibold">Volunteer Unit</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span className="text-cyan-400 font-semibold">Trauma Hospital</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                  <span className="text-violet-400 font-semibold">Relief Shelter Camp</span>
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

          {/* Perspective Quick Pill */}
          <div className="hidden md:flex items-center space-x-1.5 pointer-events-auto bg-surface-low/90 backdrop-blur-xl p-1.5 px-3 rounded-2xl border border-surface-highest text-[10px] font-mono text-tactical-muted">
            <Compass className="w-3 h-3 text-primary" />
            <span>PITCH: {is3D ? '60° 3D' : '0° 2D'}</span>
          </div>
        </div>
      )}

    </div>
  );
}
