'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  Layers, 
  Maximize2, 
  Minimize2, 
  Compass, 
  Search, 
  Ruler, 
  PenTool, 
  Download, 
  Play, 
  Pause, 
  RotateCcw,
  ShieldAlert,
  Hospital,
  Home,
  Users,
  Navigation,
  CloudRain,
  Flame,
  Wind,
  Waves
} from 'lucide-react';
import MapLayerSelector from './MapLayerSelector';
import MapTimelineSlider from './MapTimelineSlider';
import MapPopupPanel from './MapPopupPanel';

export interface MapFeatureNode {
  id: string;
  name: string;
  category: 'hazard' | 'hospital' | 'shelter' | 'volunteer' | 'agency';
  subType: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'INFO';
  lat: number;
  lng: number;
  details: string;
  contact?: string;
  status: string;
  updatedAt: string;
}

const MOCK_MAP_NODES: MapFeatureNode[] = [
  {
    id: 'node-1',
    name: 'Cyclone Remal Center',
    category: 'hazard',
    subType: 'Cyclone',
    severity: 'CRITICAL',
    lat: 19.8135,
    lng: 85.8312,
    details: 'Category 3 Hurricane force winds (140 km/h) approaching Puri & Paradip coast.',
    status: 'Active Warning',
    updatedAt: '10 mins ago',
  },
  {
    id: 'node-2',
    name: 'Guwahati Brahmaputra Inundation Zone',
    category: 'hazard',
    subType: 'Flood',
    severity: 'CRITICAL',
    lat: 26.1445,
    lng: 91.7362,
    details: 'River level 1.8m above danger mark. Evacuation order in 12 villages.',
    status: 'Evacuation in Progress',
    updatedAt: '5 mins ago',
  },
  {
    id: 'node-3',
    name: 'AIIMS Bhubaneswar Emergency Hub',
    category: 'hospital',
    subType: 'Super Specialty Hospital',
    lat: 20.2285,
    lng: 85.8189,
    details: 'Level 1 Trauma Center equipped with ICU & emergency trauma unit.',
    contact: '+91 674 2476789',
    status: 'Operational',
    updatedAt: '2 mins ago',
  },
  {
    id: 'node-4',
    name: 'Paradip Port Relief Shelter #4',
    category: 'shelter',
    subType: 'Cyclone Shelter',
    lat: 20.2644,
    lng: 86.6705,
    details: 'Reinforced concrete shelter with solar power backup and medical supplies.',
    contact: 'Shelter Incharge: Capt. Sharma',
    status: 'Open',
    updatedAt: '15 mins ago',
  },
  {
    id: 'node-5',
    name: 'NDRF Battalion 03 Dispatch',
    category: 'agency',
    subType: 'NDRF Unit',
    lat: 20.2961,
    lng: 85.8245,
    details: '4 Teams deployed with motorboats, inflatable rafts, and search drones.',
    contact: 'Cmdr. R. K. Singh',
    status: 'Deployed',
    updatedAt: 'Just now',
  },
  {
    id: 'node-6',
    name: 'Wayanad Search & Rescue Base',
    category: 'volunteer',
    subType: 'Volentify Rapid Team',
    lat: 11.6854,
    lng: 76.132,
    details: 'Certified Volunteers assisting local SDRF in clearing landslide debris.',
    status: 'Active Field Duty',
    updatedAt: '8 mins ago',
  },
  {
    id: 'node-7',
    name: 'Delhi NCR Heatwave Core',
    category: 'hazard',
    subType: 'Heatwave',
    severity: 'HIGH',
    lat: 28.6139,
    lng: 77.2090,
    details: 'Temperatures peaking at 47°C. IMD Red Alert issued for consecutive days.',
    status: 'Active Alert',
    updatedAt: '30 mins ago',
  },
  {
    id: 'node-8',
    name: 'Uttarakhand Forest Fire',
    category: 'hazard',
    subType: 'Wildfire',
    severity: 'CRITICAL',
    lat: 30.0668,
    lng: 79.0193,
    details: 'Massive fire line spanning 5km in Garhwal hills. Choppers deployed.',
    status: 'Uncontrolled',
    updatedAt: '12 mins ago',
  },
  {
    id: 'node-9',
    name: 'Kangra Valley Seismic Event',
    category: 'hazard',
    subType: 'Earthquake',
    severity: 'HIGH',
    lat: 32.0998,
    lng: 76.2691,
    details: '6.2 Magnitude earthquake struck at 10km depth. Aftershocks ongoing.',
    status: 'Post-Event Assessment',
    updatedAt: '1 hr ago',
  }
];

export default function DisasterGISMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<MapFeatureNode | null>(MOCK_MAP_NODES[0]);
  const [activeLayers, setActiveLayers] = useState({
    satellite: true,
    cyclone: true,
    flood: true,
    hospitals: true,
    shelters: true,
    volunteers: true,
    weatherRadar: true,
    districtBoundaries: true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [measurementActive, setMeasurementActive] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize MapLibre GL Canvas
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
      center: [78.9629, 20.5937], // Center on India
      zoom: 4.8,
      pitch: 35,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', () => {
      // Add Disaster Polygon Source & Layer (Mock Cyclone Buffer)
      map.addSource('cyclone-zone', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [84.5, 18.5],
                [87.5, 19.2],
                [88.2, 21.5],
                [85.5, 21.0],
                [84.5, 18.5],
              ],
            ],
          },
          properties: {},
        },
      });

      map.addLayer({
        id: 'cyclone-fill',
        type: 'fill',
        source: 'cyclone-zone',
        paint: {
          'fill-color': '#ff675e',
          'fill-opacity': 0.25,
        },
      });

      map.addLayer({
        id: 'cyclone-border',
        type: 'line',
        source: 'cyclone-zone',
        paint: {
          'line-color': '#ff675e',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

      // Add HTML Custom Animated Markers for each Node
      MOCK_MAP_NODES.forEach((node) => {
        const el = document.createElement('div');
        el.className = 'custom-map-marker cursor-pointer transition-transform hover:scale-125';

        let badgeColor = 'bg-primary';
        if (node.category === 'hazard') badgeColor = 'bg-emergency animate-pulse';
        if (node.category === 'hospital') badgeColor = 'bg-emerald-500';
        if (node.category === 'shelter') badgeColor = 'bg-blue-500';
        if (node.category === 'volunteer') badgeColor = 'bg-purple-500';

        el.innerHTML = `
          <div className="relative flex items-center justify-center">
            <span class="absolute inline-flex h-8 w-8 rounded-full ${badgeColor} opacity-40 animate-ping"></span>
            <div class="relative flex items-center justify-center w-7 h-7 rounded-full ${badgeColor} text-white font-bold text-xs shadow-lg border-2 border-white">
              ${node.subType[0]}
            </div>
          </div>
        `;

        el.addEventListener('click', () => {
          setSelectedNode(node);
          map.flyTo({ center: [node.lng, node.lat], zoom: 8, pitch: 45, duration: 1500 });
        });

        new maplibregl.Marker({ element: el })
          .setLngLat([node.lng, node.lat])
          .addTo(map);
      });
    });

    return () => {
      map.remove();
    };
  }, []);

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

  const exportMapImage = () => {
    alert('Exporting high-resolution GIS map frame to PNG...');
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-surface-lowest overflow-hidden">
      
      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Tactical Search & Header Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-none">
        
        {/* Search Bar */}
        <div className="w-full md:w-96 bg-surface-low/90 backdrop-blur-md p-2 rounded-xl border border-surface-highest/80 shadow-tactical flex items-center space-x-2 pointer-events-auto">
          <Search className="w-4 h-4 text-primary ml-2" />
          <input
            type="text"
            placeholder="Search District, Hospital, Shelter or Hazard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-tactical-text focus:outline-none placeholder-tactical-muted"
          />
          <button className="px-2.5 py-1 rounded bg-primary text-surface-lowest font-telemetry font-bold text-[10px]">
            SEARCH GIS
          </button>
        </div>

        {/* Tactical Map Action Tools */}
        <div className="flex items-center space-x-2 bg-surface-low/90 backdrop-blur-md p-1.5 rounded-xl border border-surface-highest/80 shadow-tactical pointer-events-auto">
          <button
            onClick={() => setMeasurementActive(!measurementActive)}
            className={`p-2 rounded text-xs flex items-center space-x-1 transition-colors ${
              measurementActive ? 'bg-primary text-surface-lowest font-bold' : 'text-tactical-text hover:bg-surface-high'
            }`}
            title="Distance Measurement Tool"
          >
            <Ruler className="w-4 h-4" />
            <span className="hidden sm:inline">Measure</span>
          </button>

          <button
            onClick={exportMapImage}
            className="p-2 rounded text-tactical-text hover:bg-surface-high text-xs flex items-center space-x-1 transition-colors"
            title="Export GIS Frame"
          >
            <Download className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Export PDF/PNG</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded text-tactical-text hover:bg-surface-high text-xs transition-colors"
            title="Toggle Fullscreen GIS"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating Layer Controls (Top Right) */}
      <MapLayerSelector activeLayers={activeLayers} setActiveLayers={setActiveLayers} />

      {/* Slide-Out Detail Panel for Selected Marker */}
      {selectedNode && (
        <MapPopupPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}

      {/* Timeline Playback Slider (Bottom Center) */}
      <MapTimelineSlider />

      {/* Live Map Legend (Bottom Left) */}
      <div className="absolute bottom-16 left-4 z-20 bg-surface-low/90 backdrop-blur-md p-3 rounded-lg border border-surface-highest/80 text-xs font-telemetry space-y-1.5 shadow-lg hidden sm:block">
        <div className="text-[10px] text-tactical-muted uppercase font-bold tracking-wider border-b border-surface-highest pb-1 mb-1">
          GIS LAYEND LEGEND
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emergency animate-pulse"></span>
          <span>Critical Hazard Zone</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span>Emergency Hospital</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span>Cyclone Relief Shelter</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
          <span>Volentify Rapid Response Unit</span>
        </div>
      </div>

    </div>
  );
}
