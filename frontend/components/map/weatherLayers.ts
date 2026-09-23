import maplibregl from 'maplibre-gl';

/**
 * RainViewer Free Global Weather Radar API
 * Fetches the latest precipitation radar timestamp and adds animated raster tiles
 */
export async function addRainViewerRadarLayer(map: maplibregl.Map): Promise<boolean> {
  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await res.json();
    
    if (!data || !data.radar || !data.radar.past || data.radar.past.length === 0) {
      return false;
    }

    const latestFrame = data.radar.past[data.radar.past.length - 1];
    const tileUrl = `${data.host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;

    if (map.getSource('rainviewer-radar')) {
      (map.getSource('rainviewer-radar') as maplibregl.RasterTileSource).setTiles([tileUrl]);
      return true;
    }

    map.addSource('rainviewer-radar', {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
      attribution: 'Weather Radar © RainViewer',
    });

    map.addLayer({
      id: 'rainviewer-radar-layer',
      type: 'raster',
      source: 'rainviewer-radar',
      paint: {
        'raster-opacity': 0.60,
      },
    });

    return true;
  } catch (err) {
    console.warn('[GIS Weather Radar] RainViewer stream unavailable:', err);
    return false;
  }
}

/**
 * Generates a tactical circular GeoJSON hazard buffer with glowing perimeter
 */
export function generateHazardBufferGeoJSON(centerLng: number, centerLat: number, radiusKm: number) {
  const points = 64;
  const coordinates: [number, number][] = [];
  const distanceX = radiusKm / (111.320 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = centerLng + distanceX * Math.cos(theta);
    const y = centerLat + distanceY * Math.sin(theta);
    coordinates.push([x, y]);
  }
  coordinates.push(coordinates[0]);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coordinates],
    },
    properties: {
      radiusKm,
    },
  };
}
