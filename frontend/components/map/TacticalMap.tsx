'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MLMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Box, Camera, Crosshair, Download, Eye, Layers, Maximize2, Minimize2, Ruler, Satellite, Search, SlidersHorizontal, X,
} from 'lucide-react';
import { CATEGORY_HEX, MESH_PRIORITY_HEX, MESH_TYPE_LABEL, SEVERITY_META } from '@/lib/constants';
import type { Disaster, MeshEvent, MeshEventType, MeshPriority } from '@/lib/types';
import { circlePolygon, cn, haversineKm } from '@/lib/utils';
import { SourceTag } from '@/components/ui/DataState';
import { DetailDrawer, type Selection } from './DetailDrawer';
import { GodsEyeHUD } from './GodsEyeHUD';
import { DARK_STYLE_URL, DEM_ATTRIBUTION, DEM_TILES, INDIA_VIEW, RAINVIEWER_INDEX, RASTER_FALLBACK, defaultImagery, firstSymbolLayer } from './mapStyle';
import { useMapData } from './useMapData';

type LayerKey = 'incidents' | 'mesh' | 'nodes' | 'volunteers' | 'missions' | 'hospitals' | 'shelters' | 'radar';
const LAYER_LABEL: Record<LayerKey, string> = {
  incidents: 'Incident zones', mesh: 'Mesh field reports', nodes: 'Mesh nodes & gateways', volunteers: 'Volunteers',
  missions: 'Open missions', hospitals: 'Hospitals', shelters: 'Relief shelters', radar: 'Precipitation radar',
};
const AGE_OPTIONS = [
  { value: 60, label: '1 h' }, { value: 360, label: '6 h' }, { value: 1440, label: '24 h' },
  { value: 10080, label: '7 d' }, { value: 0, label: 'All' },
];

export interface TacticalMapProps {
  variant?: 'full' | 'embed';
  focusDisasterId?: string;
  className?: string;
  /** Base map to start on: 'dark' (cartographic) or an imagery layer id such as 'esri-imagery' or 'modis-terra'. */
  initialBasemap?: string;
  /** Controlled base map (the Intelligence page's imagery list drives the map through this). */
  basemap?: string;
  onBasemapChange?: (id: string) => void;
  /** Controlled precipitation-radar overlay. */
  radar?: boolean;
  /** A responder's way to a mission: road geometry when routing succeeded, otherwise a straight dashed line. */
  route?: MissionRoute | null;
}

export interface MissionRoute {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  line: GeoJSON.LineString | null;
}

const BASEMAP_DARK = 'dark';

function featureCollection(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features };
}
function point(lng: number, lat: number, props: Record<string, unknown>): GeoJSON.Feature {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: props };
}

function incidentMarker(d: Disaster, selected: boolean): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.setAttribute('aria-label', `${d.title}, ${SEVERITY_META[d.severity].label} severity`);
  const color = SEVERITY_META[d.severity].hex;
  el.className = 'group relative flex h-6 w-6 items-center justify-center';
  el.innerHTML = `
    ${d.severity === 'CRITICAL' ? `<span class="absolute inset-0 rotate-45 rounded-[3px] animate-pulse-ring" style="background:${color}55"></span>` : ''}
    <span class="relative h-3.5 w-3.5 rotate-45 rounded-[2px] ring-2 ${selected ? 'ring-white' : 'ring-black/60'}" style="background:${color}"></span>`;
  return el;
}

function meshMarker(e: MeshEvent, selected: boolean): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.setAttribute('aria-label', `${MESH_TYPE_LABEL[e.type]}, ${e.priority.toLowerCase()} priority, ${e.review_status.toLowerCase()}`);
  const color = MESH_PRIORITY_HEX[e.priority];
  // OD-07: unreviewed reports carry a dashed ring until command reviews or promotes them.
  const ring = e.review_status === 'UNREVIEWED' ? `2px dashed ${color}` : e.review_status === 'PROMOTED' ? '2px solid #d4b483' : `2px solid ${color}`;
  el.className = 'relative flex h-5 w-5 items-center justify-center rounded-full';
  el.style.border = ring;
  el.innerHTML = `<span class="h-2.5 w-2.5 rounded-full ${selected ? 'ring-2 ring-white' : ''}" style="background:${color}"></span>`;
  return el;
}

export default function TacticalMap({
  variant = 'full', focusDisasterId, className, initialBasemap, basemap: basemapProp, onBasemapChange, radar, route,
}: TacticalMapProps) {
  const full = variant === 'full';
  const data = useMapData();
  const containerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const orbitRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    incidents: true, mesh: true, nodes: full, volunteers: full, missions: full, hospitals: full, shelters: full, radar: false,
  });
  const [basemapState, setBasemapState] = useState<string>(initialBasemap ?? BASEMAP_DARK);
  const basemap = basemapProp ?? basemapState;
  const setBasemap = useCallback((id: string) => { setBasemapState(id); onBasemapChange?.(id); }, [onBasemapChange]);
  const [imageryOpacity, setImageryOpacity] = useState(0.95);
  const imagery = useMemo(() => (data.imagery.length ? data.imagery : defaultImagery()), [data.imagery]);
  const baseImagery = useMemo(() => imagery.filter((l) => l.tiles.length), [imagery]);
  const activeImagery = baseImagery.find((l) => l.id === basemap);
  const lastImagery = useRef<string>(initialBasemap && initialBasemap !== BASEMAP_DARK ? initialBasemap : 'esri-imagery');
  if (activeImagery) lastImagery.current = activeImagery.id;
  const toggleSatellite = () => setBasemap(basemap === BASEMAP_DARK ? lastImagery.current : BASEMAP_DARK);
  const [terrain3d, setTerrain3d] = useState(false);
  const [godsEye, setGodsEye] = useState(false);
  const [panel, setPanel] = useState<'layers' | 'filters' | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [filters, setFilters] = useState<{ disaster: string; type: MeshEventType | ''; priority: MeshPriority | ''; ageMin: number }>(
    { disaster: focusDisasterId ?? '', type: '', priority: '', ageMin: 0 });
  const [query, setQuery] = useState('');
  const [measure, setMeasure] = useState<{ active: boolean; points: [number, number][] }>({ active: false, points: [] });
  const [fullscreen, setFullscreen] = useState(false);

  // ─── Derived, filtered data ───────────────────────────────────────────────
  const meshVisible = useMemo(() => {
    const cutoff = filters.ageMin ? Date.now() - filters.ageMin * 60_000 : 0;
    return data.mesh.filter((e) => e.lat != null && e.lng != null
      && (!filters.disaster || e.disaster_id === filters.disaster)
      && (!filters.type || e.type === filters.type)
      && (!filters.priority || e.priority === filters.priority)
      && (!cutoff || Date.parse(e.observed_at) >= cutoff));
  }, [data.mesh, filters]);
  const disastersVisible = useMemo(
    () => data.disasters.filter((d) => !filters.disaster || d.id === filters.disaster), [data.disasters, filters.disaster]);
  const missionsVisible = useMemo(
    () => data.tasks.filter((t) => !filters.disaster || t.disaster_id === filters.disaster), [data.tasks, filters.disaster]);

  // ─── Map lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let map: MLMap | null = null;

    (async () => {
      let style: maplibregl.StyleSpecification | string = DARK_STYLE_URL;
      try {
        const res = await fetch(DARK_STYLE_URL);
        if (!res.ok) throw new Error('style');
        style = await res.json();
      } catch {
        style = RASTER_FALLBACK;
      }
      if (cancelled || !containerRef.current) return;
      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: INDIA_VIEW.center,
        zoom: full ? INDIA_VIEW.zoom : 3.6,
        attributionControl: { compact: true, customAttribution: DEM_ATTRIBUTION },
        maxPitch: 75,
        canvasContextAttributes: { preserveDrawingBuffer: true },
        cooperativeGestures: !full,
      } as maplibregl.MapOptions);
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
      if (full) map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

      map.on('load', () => {
        if (!map) return;
        const before = firstSymbolLayer(map.getStyle());
        map.addSource('dem', { type: 'raster-dem', tiles: DEM_TILES, encoding: 'terrarium', tileSize: 256, maxzoom: 14 });
        map.addSource('dem-shade', { type: 'raster-dem', tiles: DEM_TILES, encoding: 'terrarium', tileSize: 256, maxzoom: 14 });
        map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'dem-shade', layout: { visibility: 'none' },
          paint: { 'hillshade-shadow-color': '#000000', 'hillshade-highlight-color': '#3a3530', 'hillshade-exaggeration': 0.45 } }, before);

        const empty = featureCollection([]);
        for (const id of ['zones', 'volunteers', 'missions', 'hospitals', 'shelters', 'nodes', 'measure']) {
          map.addSource(`v-${id}`, { type: 'geojson', data: empty });
        }
        map.addLayer({ id: 'zones-fill', type: 'fill', source: 'v-zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['get', 'focus'], 0.22, 0.12] } }, before);
        map.addLayer({ id: 'zones-line', type: 'line', source: 'v-zones', paint: { 'line-color': ['get', 'color'], 'line-width': 1.4, 'line-dasharray': [3, 2], 'line-opacity': 0.8 } }, before);
        const circle = (id: string, color: string, radius = 5, extra: Record<string, unknown> = {}) =>
          map!.addLayer({ id, type: 'circle', source: `v-${id}`, paint: {
            'circle-radius': radius, 'circle-color': color, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#07080a', ...extra } });
        circle('hospitals', '#7fb69a', 5.5);
        circle('shelters', '#8fb3d9', 5.5);
        circle('missions', '#ff6b00', 4.5, { 'circle-stroke-color': '#ff6b00', 'circle-color': '#07080a', 'circle-stroke-width': 2 });
        circle('volunteers', ['match', ['get', 'availability'], 'AVAILABLE', '#d4b483', 'BUSY', '#8d887e', '#5f5b54'] as unknown as string, 4);
        circle('nodes', ['case', ['get', 'active'], '#f4f1ea', '#5f5b54'] as unknown as string, 3.5, { 'circle-stroke-color': '#d4b483', 'circle-stroke-width': 1 });
        map.addLayer({ id: 'measure-line', type: 'line', source: 'v-measure', paint: { 'line-color': '#f4f1ea', 'line-width': 2, 'line-dasharray': [2, 1.5] } });
        map.addLayer({ id: 'measure-pts', type: 'circle', source: 'v-measure', filter: ['==', '$type', 'Point'],
          paint: { 'circle-radius': 4, 'circle-color': '#f4f1ea', 'circle-stroke-color': '#07080a', 'circle-stroke-width': 2 } });

        for (const id of ['hospitals', 'shelters', 'missions', 'volunteers', 'nodes']) {
          map.on('mouseenter', id, () => { map!.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', id, () => { map!.getCanvas().style.cursor = ''; });
        }
        setReady(true);
      });
    })();

    return () => {
      cancelled = true;
      if (orbitRef.current) cancelAnimationFrame(orbitRef.current);
      markersRef.current.forEach((m) => m.remove());
      map?.remove();
      mapRef.current = null;
    };
  }, [full]);

  // ─── Feature clicks (GeoJSON layers) & measuring ──────────────────────────
  const lookups = useRef(data);
  lookups.current = data;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (measure.active) {
        setMeasure((m) => ({ active: true, points: m.points.length >= 2 ? [[e.lngLat.lng, e.lngLat.lat]] : [...m.points, [e.lngLat.lng, e.lngLat.lat]] }));
        return;
      }
      const hit = map.queryRenderedFeatures(e.point, { layers: ['hospitals', 'shelters', 'missions', 'volunteers', 'nodes'] })[0];
      if (!hit) return;
      const id = hit.properties?.id as string;
      const d = lookups.current;
      const pick: Selection | null =
        hit.layer.id === 'hospitals' ? { kind: 'hospital', item: d.hospitals.find((x) => x.id === id)! }
        : hit.layer.id === 'shelters' ? { kind: 'shelter', item: d.shelters.find((x) => x.id === id)! }
        : hit.layer.id === 'missions' ? { kind: 'mission', item: d.tasks.find((x) => x.id === id)! }
        : hit.layer.id === 'volunteers' ? { kind: 'volunteer', item: d.volunteers.find((x) => x.id === id)! }
        : { kind: 'node', item: d.nodes.find((x) => x.node_uuid === id)! };
      if (pick?.item) setSelection(pick);
    };
    map.on('click', onClick);
    map.getCanvas().style.cursor = measure.active ? 'crosshair' : '';
    return () => { map.off('click', onClick); };
  }, [ready, measure.active]);

  const measureKm = useMemo(() => {
    const [a, b] = measure.points;
    return a && b ? haversineKm(a[1], a[0], b[1], b[0]) : null;
  }, [measure.points]);

  // ─── Push data into sources ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const set = (id: string, fc: GeoJSON.FeatureCollection) => (map.getSource(`v-${id}`) as GeoJSONSource | undefined)?.setData(fc);
    set('zones', featureCollection(layers.incidents ? disastersVisible.map((d) => ({
      type: 'Feature',
      geometry: d.polygon_geojson ?? circlePolygon(d.lat, d.lng, d.radius_km),
      properties: { id: d.id, color: CATEGORY_HEX[d.category] ?? SEVERITY_META[d.severity].hex, focus: d.id === focusDisasterId },
    })) : []));
    set('hospitals', featureCollection(layers.hospitals ? data.hospitals.map((h) => point(h.lng, h.lat, { id: h.id })) : []));
    set('shelters', featureCollection(layers.shelters ? data.shelters.map((s) => point(s.lng, s.lat, { id: s.id })) : []));
    set('missions', featureCollection(layers.missions ? missionsVisible.map((t) => point(t.lng, t.lat, { id: t.id })) : []));
    set('volunteers', featureCollection(layers.volunteers ? data.volunteers.map((v) => point(v.lng, v.lat, { id: v.id, availability: v.availability })) : []));
    set('nodes', featureCollection(layers.nodes ? data.nodes.filter((n) => n.last_lat != null && n.last_lng != null)
      .map((n) => point(n.last_lng!, n.last_lat!, { id: n.node_uuid, active: n.active })) : []));
    const pts = measure.points.map(([lng, lat]) => point(lng, lat, {}));
    set('measure', featureCollection(measure.points.length === 2
      ? [...pts, { type: 'Feature', geometry: { type: 'LineString', coordinates: measure.points }, properties: {} }] : pts));
  }, [ready, layers, disastersVisible, missionsVisible, data.hospitals, data.shelters, data.volunteers, data.nodes, measure.points, focusDisasterId]);

  // HTML markers: incidents (diamonds) and mesh reports (rings).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const add = (el: HTMLElement, lng: number, lat: number, onPick: () => void) => {
      el.addEventListener('click', (ev) => { ev.stopPropagation(); onPick(); });
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map));
    };
    if (layers.mesh) {
      for (const e of meshVisible) {
        add(meshMarker(e, selection?.kind === 'mesh' && selection.item.id === e.id), e.lng!, e.lat!, () => setSelection({ kind: 'mesh', item: e }));
      }
    }
    if (layers.incidents) {
      for (const d of disastersVisible) {
        add(incidentMarker(d, selection?.kind === 'incident' && selection.item.id === d.id), d.lng, d.lat, () => {
          setSelection({ kind: 'incident', item: d });
          map.flyTo({ center: [d.lng, d.lat], zoom: Math.max(map.getZoom(), 6.5), duration: 1200, essential: true });
        });
      }
    }
  }, [ready, layers.mesh, layers.incidents, meshVisible, disastersVisible, selection]);

  // Focus a specific incident (dossier embed or ?incident=).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focusDisasterId) return;
    const d = data.disasters.find((x) => x.id === focusDisasterId || x.code === focusDisasterId);
    if (d) map.jumpTo({ center: [d.lng, d.lat], zoom: d.radius_km > 80 ? 5.8 : 7.5 });
  }, [ready, focusDisasterId, data.disasters]);

  // Controlled radar overlay (Intelligence page).
  useEffect(() => {
    if (radar !== undefined) setLayers((l) => (l.radar === radar ? l : { ...l, radar }));
  }, [radar]);

  // Mission route: drawn above every operational layer; the view fits the whole way from start to mission.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !route) return;
    const coords = (route.line?.coordinates ?? [[route.from.lng, route.from.lat], [route.to.lng, route.to.lat]]) as [number, number][];
    const fc = featureCollection([
      { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: { kind: route.line ? 'road' : 'direct' } },
      point(route.from.lng, route.from.lat, { end: 'start' }),
      point(route.to.lng, route.to.lat, { end: 'mission' }),
    ]);
    const source = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(fc);
    } else {
      map.addSource('route', { type: 'geojson', data: fc });
      const line = ['==', '$type', 'LineString'] as maplibregl.FilterSpecification;
      map.addLayer({ id: 'route-casing', type: 'line', source: 'route', filter: line, layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#07080a', 'line-width': 9, 'line-opacity': 0.85 } });
      map.addLayer({ id: 'route-road', type: 'line', source: 'route', filter: ['all', line, ['==', 'kind', 'road']] as maplibregl.FilterSpecification,
        layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ff6b00', 'line-width': 4.5 } });
      map.addLayer({ id: 'route-direct', type: 'line', source: 'route', filter: ['all', line, ['==', 'kind', 'direct']] as maplibregl.FilterSpecification,
        layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ff6b00', 'line-width': 3.5, 'line-dasharray': [2, 1.6] } });
      map.addLayer({ id: 'route-ends', type: 'circle', source: 'route', filter: ['==', '$type', 'Point'] as maplibregl.FilterSpecification,
        paint: { 'circle-radius': 7.5, 'circle-color': ['match', ['get', 'end'], 'start', '#f4f1ea', '#ff6b00'] as unknown as string,
          'circle-stroke-color': '#07080a', 'circle-stroke-width': 3 } });
    }
    const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    // Leave room for the route panel: a side card on wide screens, a bottom sheet on phones.
    const wide = map.getContainer().clientWidth >= 640;
    map.fitBounds(bounds, { padding: wide ? { top: 110, bottom: 90, left: 70, right: 400 } : { top: 130, bottom: 340, left: 40, right: 40 },
      maxZoom: 15, duration: 1200 });
  }, [ready, route]);

  // Satellite imagery under the operational layers: incidents, reports, missions and labels stay on top.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (map.getLayer('imagery')) map.removeLayer('imagery');
    if (map.getSource('imagery')) map.removeSource('imagery');
    if (activeImagery) {
      map.addSource('imagery', { type: 'raster', tiles: activeImagery.tiles, tileSize: 256, maxzoom: activeImagery.max_zoom,
        attribution: activeImagery.provider === 'NASA GIBS' ? 'Imagery: NASA GIBS / ESDIS' : `Imagery: ${activeImagery.provider}` });
      map.addLayer({ id: 'imagery', type: 'raster', source: 'imagery', paint: { 'raster-opacity': imageryOpacity, 'raster-fade-duration': 200 } },
        map.getLayer('hillshade') ? 'hillshade' : firstSymbolLayer(map.getStyle()));
      // Daily composites stop at zoom 9; keep the view useful rather than blank.
      if (activeImagery.max_zoom < 12 && map.getZoom() > activeImagery.max_zoom + 2) map.easeTo({ zoom: activeImagery.max_zoom + 1, duration: 600 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeImagery]);

  useEffect(() => {
    const map = mapRef.current;
    if (ready && map?.getLayer('imagery')) map.setPaintProperty('imagery', 'raster-opacity', imageryOpacity);
  }, [ready, imageryOpacity]);

  // Precipitation radar (RainViewer latest frame).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let cancelled = false;
    const drop = () => { if (map.getLayer('radar')) map.removeLayer('radar'); if (map.getSource('radar')) map.removeSource('radar'); };
    if (!layers.radar) { drop(); return; }
    fetch(RAINVIEWER_INDEX).then((r) => r.json()).then((idx: { host: string; radar: { past: { path: string }[] } }) => {
      const frame = idx.radar.past.at(-1);
      if (cancelled || !frame) return;
      drop();
      map.addSource('radar', { type: 'raster', tiles: [`${idx.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`], tileSize: 256, maxzoom: 7, attribution: 'RainViewer' });
      map.addLayer({ id: 'radar', type: 'raster', source: 'radar', paint: { 'raster-opacity': 0.7 } }, firstSymbolLayer(map.getStyle()));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [ready, layers.radar]);

  // 2D / 3D terrain.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setTerrain(terrain3d ? { source: 'dem', exaggeration: 1.5 } : null);
    map.setLayoutProperty('hillshade', 'visibility', terrain3d ? 'visible' : 'none');
    map.easeTo({ pitch: terrain3d ? 60 : 0, bearing: terrain3d ? map.getBearing() : 0, duration: 900 });
  }, [ready, terrain3d]);

  // God's Eye: slow orbit around the target sector.
  const target = useMemo<Disaster | undefined>(() => {
    if (selection?.kind === 'incident') return selection.item;
    return disastersVisible[0];
  }, [selection, disastersVisible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (orbitRef.current) cancelAnimationFrame(orbitRef.current);
    if (!godsEye || !target) return;
    setTerrain3d(true);
    map.flyTo({ center: [target.lng, target.lat], zoom: target.radius_km > 80 ? 6.2 : 8.4, pitch: 62, duration: 1800, essential: true });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const spin = () => {
      if (!map.isMoving()) map.setBearing((map.getBearing() + 0.06) % 360);
      orbitRef.current = requestAnimationFrame(spin);
    };
    const startId = window.setTimeout(() => { if (!reduce) orbitRef.current = requestAnimationFrame(spin); }, 1900);
    return () => { window.clearTimeout(startId); if (orbitRef.current) cancelAnimationFrame(orbitRef.current); };
  }, [ready, godsEye, target]);

  // ─── Tools ────────────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const rows: { label: string; sub: string; lat: number; lng: number; pick: Selection }[] = [
      ...data.disasters.map((d) => ({ label: d.title, sub: `${d.location}, ${d.state}`, lat: d.lat, lng: d.lng, pick: { kind: 'incident', item: d } as Selection })),
      ...data.hospitals.map((h) => ({ label: h.name, sub: h.address, lat: h.lat, lng: h.lng, pick: { kind: 'hospital', item: h } as Selection })),
      ...data.shelters.map((s) => ({ label: s.name, sub: s.address, lat: s.lat, lng: s.lng, pick: { kind: 'shelter', item: s } as Selection })),
      ...data.tasks.map((t) => ({ label: t.title, sub: t.location_name, lat: t.lat, lng: t.lng, pick: { kind: 'mission', item: t } as Selection })),
    ];
    return rows.filter((r) => `${r.label} ${r.sub}`.toLowerCase().includes(q)).slice(0, 7);
  }, [query, data.disasters, data.hospitals, data.shelters, data.tasks]);

  const flyTo = useCallback((lat: number, lng: number, zoom = 9) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1400, essential: true });
  }, []);

  const exportPng = () => {
    const canvas = mapRef.current?.getCanvas();
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `volentify-map-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  const locate = () => navigator.geolocation?.getCurrentPosition(
    (p) => flyTo(p.coords.latitude, p.coords.longitude, 10), () => undefined, { enableHighAccuracy: true, timeout: 8000 });

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) { await shellRef.current?.requestFullscreen(); setFullscreen(true); }
    else { await document.exitFullscreen(); setFullscreen(false); }
  };
  useEffect(() => {
    const h = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const toolBtn = (on: boolean) => cn('flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] transition-colors',
    on ? 'bg-ivory/[0.12] text-ivory' : 'text-sand hover:bg-ivory/[0.06] hover:text-ivory');
  const panelPos = full ? 'top-[7.25rem] sm:left-[21.5rem] sm:top-[4.25rem]' : 'top-[4.25rem]';
  const activeFilters = [filters.disaster, filters.type, filters.priority, filters.ageMin].filter(Boolean).length;
  const mapQuery = (() => {
    const q = new URLSearchParams();
    if (focusDisasterId) q.set('incident', focusDisasterId);
    if (basemap !== BASEMAP_DARK) q.set('imagery', basemap);
    if (layers.radar) q.set('radar', '1');
    const s = q.toString();
    return s ? `?${s}` : '';
  })();

  return (
    <div ref={shellRef} className={cn('relative isolate overflow-hidden bg-ink', className)}>
      <div ref={containerRef} className="!absolute inset-0" aria-label="Tactical map" role="region" />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start gap-2 sm:inset-x-4 sm:top-4">
        {full && (
          <div className="pointer-events-auto relative w-full sm:w-80">
            <div className="glass flex h-11 items-center gap-2 rounded-xl px-3">
              <Search className="h-4 w-4 text-stone" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search incidents, hospitals, shelters"
                aria-label="Search the map" className="h-full w-full bg-transparent text-sm text-ivory placeholder:text-ash focus:outline-none" />
              {query && <button onClick={() => setQuery('')} aria-label="Clear search" className="text-stone hover:text-ivory"><X className="h-4 w-4" /></button>}
            </div>
            {searchResults.length > 0 && (
              <ul className="glass mt-2 overflow-hidden rounded-xl py-1">
                {searchResults.map((r) => (
                  <li key={`${r.label}-${r.lat}`}>
                    <button className="w-full px-3 py-2 text-left hover:bg-ivory/[0.06]" onClick={() => { setSelection(r.pick); flyTo(r.lat, r.lng); setQuery(''); }}>
                      <span className="block truncate text-sm text-ivory">{r.label}</span>
                      <span className="block truncate text-xs text-stone">{r.sub}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="glass pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl p-1">
          <button className={toolBtn(panel === 'layers')} onClick={() => setPanel(panel === 'layers' ? null : 'layers')} aria-expanded={panel === 'layers'}>
            <Layers className="h-4 w-4" aria-hidden /><span className="hidden md:inline">Layers</span>
          </button>
          {full && (
            <button className={toolBtn(panel === 'filters')} onClick={() => setPanel(panel === 'filters' ? null : 'filters')} aria-expanded={panel === 'filters'}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden /><span className="hidden md:inline">Filter</span>
              {activeFilters > 0 && <span className="rounded-full bg-signal px-1.5 text-[0.6875rem] font-semibold text-ink">{activeFilters}</span>}
            </button>
          )}
          <button className={cn(toolBtn(basemap !== BASEMAP_DARK), 'xl:hidden')} onClick={toggleSatellite} aria-pressed={basemap !== BASEMAP_DARK}
            title={basemap !== BASEMAP_DARK ? 'Back to the cartographic map' : 'Show satellite imagery under every layer'}>
            <Satellite className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Satellite</span>
          </button>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          <button className={toolBtn(terrain3d)} onClick={() => setTerrain3d((v) => !v)} aria-pressed={terrain3d} title="Toggle 3D terrain">
            <Box className="h-4 w-4" aria-hidden /><span>{terrain3d ? '3D' : '2D'}</span>
          </button>
          <button className={toolBtn(godsEye)} onClick={() => setGodsEye((v) => !v)} aria-pressed={godsEye} title="God's Eye orbital view">
            <Eye className="h-4 w-4" aria-hidden /><span className="hidden md:inline">God’s Eye</span>
          </button>
          {full && (
            <>
              <span className="mx-1 h-5 w-px bg-line" aria-hidden />
              <button className={toolBtn(measure.active)} onClick={() => setMeasure((m) => ({ active: !m.active, points: [] }))} aria-pressed={measure.active} title="Measure distance">
                <Ruler className="h-4 w-4" aria-hidden />
              </button>
              <button className={toolBtn(false)} onClick={locate} title="Go to my location"><Crosshair className="h-4 w-4" aria-hidden /></button>
              <button className={cn(toolBtn(false), 'max-sm:hidden')} onClick={exportPng} title="Download map as PNG"><Download className="h-4 w-4" aria-hidden /></button>
              <button className={toolBtn(false)} onClick={toggleFullscreen} title={fullscreen ? 'Exit full screen' : 'Full screen'}>
                {fullscreen ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
              </button>
            </>
          )}
        </div>

        {/* Base map switcher: cartographic map or satellite imagery, with every operational layer on top. */}
        <div className="glass pointer-events-auto hidden max-w-full items-center gap-0.5 overflow-x-auto rounded-xl p-1 xl:flex" role="group" aria-label="Base map">
          {[{ id: BASEMAP_DARK, short: 'Map' }, ...baseImagery.map((l) => ({ id: l.id, short: l.short ?? l.label }))].map((b) => (
            <button key={b.id} className={toolBtn(basemap === b.id)} onClick={() => setBasemap(b.id)} aria-pressed={basemap === b.id}
              title={b.id === BASEMAP_DARK ? 'Cartographic base map' : baseImagery.find((l) => l.id === b.id)?.label}>
              {b.id === 'esri-imagery' && <Satellite className="h-4 w-4" aria-hidden />}
              <span className="whitespace-nowrap">{b.short}</span>
            </button>
          ))}
        </div>

        {!full && (
          <Link href={`/map${mapQuery}`} className="glass pointer-events-auto ml-auto flex h-11 items-center rounded-xl px-4 text-[0.8125rem] text-ivory hover:bg-ink-800">
            Open full map
          </Link>
        )}
      </div>

      {/* Layers panel */}
      {panel === 'layers' && (
        <div className={cn('glass absolute left-3 z-20 max-h-[calc(100%-9rem)] w-[min(20rem,calc(100%-1.5rem))] animate-fade-up overflow-y-auto rounded-2xl p-4', panelPos)}>
          <p className="mb-2 text-sm text-ivory">Base map</p>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {[{ id: BASEMAP_DARK, label: 'Cartographic', cadence: 'CARTO Dark Matter' }, ...baseImagery].map((b) => (
              <button key={b.id} onClick={() => setBasemap(b.id)} aria-pressed={basemap === b.id}
                className={cn('rounded-lg px-2.5 py-2 text-left text-xs ring-1 ring-inset transition-colors',
                  basemap === b.id ? 'bg-ivory/[0.08] text-ivory ring-signal/50' : 'text-sand ring-line hover:ring-line-strong')}>
                <span className="block">{b.label}</span>
                <span className="block text-[0.6875rem] text-stone">{b.cadence}</span>
              </button>
            ))}
          </div>
          {activeImagery && (
            <label className="mb-4 block text-xs text-stone">
              <span className="mb-1 flex justify-between"><span>Imagery opacity</span><span className="data">{Math.round(imageryOpacity * 100)}%</span></span>
              <input type="range" min={0.2} max={1} step={0.05} value={imageryOpacity} onChange={(e) => setImageryOpacity(Number(e.target.value))}
                className="w-full accent-[rgb(255,107,0)]" aria-label="Imagery opacity" />
            </label>
          )}
          <p className="mb-2 text-sm text-ivory">Overlays</p>
          <div className="space-y-0.5">
            {(Object.keys(LAYER_LABEL) as LayerKey[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-[0.8125rem] text-sand hover:bg-ivory/[0.04]">
                {LAYER_LABEL[k]}
                <input type="checkbox" checked={layers[k]} onChange={() => setLayers((l) => ({ ...l, [k]: !l[k] }))} className="h-4 w-4 accent-[rgb(255,107,0)]" />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Filters panel (FR-15) */}
      {panel === 'filters' && full && (
        <div className={cn('glass absolute left-3 z-20 w-[min(20rem,calc(100%-1.5rem))] animate-fade-up space-y-4 rounded-2xl p-4', panelPos)}>
          <div className="space-y-1.5">
            <p className="text-sm text-ivory">Incident</p>
            <select value={filters.disaster} onChange={(e) => setFilters((f) => ({ ...f, disaster: e.target.value }))}
              className="h-9 w-full rounded-lg border border-line bg-ink-800 px-2 text-sm text-ivory">
              <option value="">All incidents</option>
              {data.disasters.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm text-ivory">Report type</p>
            <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as MeshEventType | '' }))}
              className="h-9 w-full rounded-lg border border-line bg-ink-800 px-2 text-sm text-ivory">
              <option value="">All types</option>
              {(Object.keys(MESH_TYPE_LABEL) as MeshEventType[]).map((t) => <option key={t} value={t}>{MESH_TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm text-ivory">Priority</p>
            <div className="flex flex-wrap gap-1.5">
              {(['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
                <button key={p || 'all'} onClick={() => setFilters((f) => ({ ...f, priority: p }))} aria-pressed={filters.priority === p}
                  className={cn('rounded-full px-2.5 py-1 text-xs ring-1 ring-inset', filters.priority === p ? 'bg-ivory/[0.1] text-ivory ring-ivory/30' : 'text-stone ring-line')}>
                  {p ? p.charAt(0) + p.slice(1).toLowerCase() : 'Any'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm text-ivory">Observed within</p>
            <div className="flex gap-1.5">
              {AGE_OPTIONS.map((a) => (
                <button key={a.value} onClick={() => setFilters((f) => ({ ...f, ageMin: a.value }))} aria-pressed={filters.ageMin === a.value}
                  className={cn('flex-1 rounded-lg py-1 text-xs ring-1 ring-inset', filters.ageMin === a.value ? 'bg-ivory/[0.1] text-ivory ring-ivory/30' : 'text-stone ring-line')}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-stone">
            <span>{meshVisible.length} reports shown</span>
            <button className="text-sand hover:text-ivory" onClick={() => setFilters({ disaster: '', type: '', priority: '', ageMin: 0 })}>Reset</button>
          </div>
        </div>
      )}

      {/* Measure readout */}
      {measure.active && (
        <div className="glass absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full px-4 py-2 text-[0.8125rem] text-ivory">
          {measureKm == null ? `Click ${measure.points.length ? 'a second' : 'two'} point${measure.points.length ? '' : 's'} on the map`
            : <>Distance <span className="data text-signal">{measureKm.toFixed(2)} km</span></>}
        </div>
      )}

      {godsEye && target && <GodsEyeHUD target={target} data={data} onClose={() => setGodsEye(false)} />}

      {selection && <DetailDrawer selection={selection} disasters={data.disasters} onClose={() => setSelection(null)} compact={!full} />}

      {/* Legend & provenance */}
      <div className={cn('glass pointer-events-none absolute z-10 rounded-xl px-3 py-2.5 text-[0.75rem] text-sand',
        full ? 'bottom-10 left-3 sm:left-4' : 'bottom-3 left-3')}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 rounded-[1px] bg-critical" />Incident</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-dashed border-high" />Unreviewed report</span>
          {full && <>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold" />Volunteer</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-signal" />Mission</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-low" />Hospital</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-info" />Shelter</span>
          </>}
        </div>
        {activeImagery && (
          <p className="mt-1.5 text-[0.6875rem] text-stone">
            {activeImagery.label} · {activeImagery.provider}{activeImagery.date ? ` · ${activeImagery.date} (UTC)` : ''}
          </p>
        )}
        {full && <SourceTag source={data.source} className="mt-1.5" />}
      </div>

      {!ready && (
        <div className="absolute inset-0 z-0 flex items-center justify-center text-sm text-stone">
          <Camera className="mr-2 h-4 w-4 animate-pulse" aria-hidden /> Loading map
        </div>
      )}
    </div>
  );
}
