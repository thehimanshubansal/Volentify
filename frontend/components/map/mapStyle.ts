import type { StyleSpecification } from 'maplibre-gl';
import type { ImageryLayer } from '@/lib/types';

export const DARK_STYLE_URL =
  process.env.NEXT_PUBLIC_MAPLIBRE_STYLE || 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/** Raster fallback if the vector style cannot be fetched. */
export const RASTER_FALLBACK: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    carto: {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', 'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
};

// Terrarium-encoded global DEM (Mapzen / AWS Open Data terrain tiles).
export const DEM_TILES = ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'];
export const DEM_ATTRIBUTION = 'Terrain: Mapzen / AWS Open Data';

export const RAINVIEWER_INDEX = 'https://api.rainviewer.com/public/weather-maps.json';

/**
 * Imagery the map can always offer, even before /api/bhuvan/layers answers (same definitions as the API).
 * NASA GIBS daily composites use yesterday (UTC) so the swath coverage is complete.
 */
export function defaultImagery(): ImageryLayer[] {
  const day = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const gibs = (layer: string) =>
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${day}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
  return [
    { id: 'esri-imagery', label: 'Satellite (high resolution)', short: 'Satellite', provider: 'Esri World Imagery', max_zoom: 19, cadence: 'Static mosaic',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'] },
    { id: 'modis-terra', label: 'MODIS Terra true colour', short: 'MODIS', provider: 'NASA GIBS', max_zoom: 9, cadence: `Daily · ${day}`, date: day,
      tiles: [gibs('MODIS_Terra_CorrectedReflectance_TrueColor')] },
    { id: 'viirs-snpp', label: 'VIIRS SNPP true colour', short: 'VIIRS', provider: 'NASA GIBS', max_zoom: 9, cadence: `Daily · ${day}`, date: day,
      tiles: [gibs('VIIRS_SNPP_CorrectedReflectance_TrueColor')] },
    { id: 'viirs-noaa20', label: 'VIIRS NOAA-20 true colour', short: 'NOAA-20', provider: 'NASA GIBS', max_zoom: 9, cadence: `Daily · ${day}`, date: day,
      tiles: [gibs('VIIRS_NOAA20_CorrectedReflectance_TrueColor')] },
    { id: 'rainviewer', label: 'Precipitation radar composite', short: 'Radar', provider: 'RainViewer', tiles: [], max_zoom: 7,
      cadence: 'Every 10 minutes', dynamic: RAINVIEWER_INDEX },
  ];
}

export const INDIA_VIEW = { center: [80.5, 22.4] as [number, number], zoom: 4.2 };

export function firstSymbolLayer(style: StyleSpecification | undefined): string | undefined {
  return style?.layers.find((l) => l.type === 'symbol')?.id;
}
