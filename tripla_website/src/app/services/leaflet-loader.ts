/**
 * Loads Leaflet 1.9.4 from a CDN once and shares it between map components.
 * Falls back to a second CDN when the first one is blocked or reset by the network.
 */
const LEAFLET_SOURCES = [
  'https://unpkg.com/leaflet@1.9.4/dist',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist',
];

interface TileProvider {
  url: string;
  attribution: string;
  subdomains?: string[];
  maxZoom: number;
}

/**
 * Keyless OpenStreetMap community mirrors first (basemaps.cartocdn.com now stamps
 * "API KEY REQUIRED" tiles, and tile.openstreetmap.org resets on some Vietnamese ISPs).
 */
const TILE_PROVIDERS: TileProvider[] = [
  {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, Tiles style by HOT',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  },
  {
    url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
  {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
];

export const MAP_TILE_URL = TILE_PROVIDERS[0].url;
export const MAP_TILE_ATTRIBUTION = TILE_PROVIDERS[0].attribution;

/** Attaches the primary keyless tile layer and fails over cleanly if a tile CDN fails. */
export function addBaseTileLayer(L: any, map: any): any {
  let providerIdx = 0;
  let currentLayer: any = null;

  const mountProvider = (idx: number) => {
    const cfg = TILE_PROVIDERS[idx];
    let loadedAny = false;
    let consecutiveErrors = 0;

    const layer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
      ...(cfg.subdomains ? { subdomains: cfg.subdomains } : {}),
    });

    layer.on('tileload', () => {
      loadedAny = true;
      consecutiveErrors = 0;
    });

    layer.on('tileerror', () => {
      consecutiveErrors += 1;
      if (!loadedAny && consecutiveErrors >= 4 && providerIdx === idx && idx + 1 < TILE_PROVIDERS.length) {
        map.removeLayer(layer);
        providerIdx = idx + 1;
        currentLayer = mountProvider(providerIdx);
      }
    });

    layer.addTo(map);
    return layer;
  };

  currentLayer = mountProvider(0);
  return currentLayer;
}

let pending: Promise<any> | null = null;

function inject(base: string): Promise<void> {
  if (!document.querySelector(`link[href="${base}/leaflet.css"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${base}/leaflet.css`;
    document.head.appendChild(link);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${base}/leaflet.js`;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error(`Leaflet failed to load from ${base}`));
    };
    document.body.appendChild(script);
  });
}

export function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (!pending) {
    pending = LEAFLET_SOURCES.reduce<Promise<void>>(
      (chain, base) => chain.catch(() => inject(base)),
      Promise.reject(new Error('start')),
    )
      .then(() => w.L)
      .catch((err) => {
        pending = null;
        throw err;
      });
  }
  return pending;
}

