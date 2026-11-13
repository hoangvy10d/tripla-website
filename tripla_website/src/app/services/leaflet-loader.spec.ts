import { vi } from 'vitest';
import { MAP_TILE_URL, addBaseTileLayer } from './leaflet-loader';

type HandlerMap = Record<string, Array<() => void>>;

function createMockLeaflet() {
  const createdLayers: Array<{ url: string; options: any; handlers: HandlerMap }> = [];
  const L = {
    tileLayer: vi.fn((url: string, options: any) => {
      const handlers: HandlerMap = {};
      const entry = { url, options, handlers };
      createdLayers.push(entry);
      const layer = {
        url,
        on: vi.fn((event: string, cb: () => void) => {
          handlers[event] = handlers[event] || [];
          handlers[event].push(cb);
          return layer;
        }),
        addTo: vi.fn(() => layer),
        emit(event: string) {
          (handlers[event] || []).forEach((cb) => cb());
        },
      };
      return layer;
    }),
  };
  const map = { removeLayer: vi.fn() };
  return { L, map, createdLayers };
}

describe('leaflet-loader tile providers', () => {
  it('uses a keyless OSM community tile URL instead of Carto watermark tiles', () => {
    expect(MAP_TILE_URL).not.toContain('basemaps.cartocdn.com');
    expect(MAP_TILE_URL).toContain('tile.openstreetmap.fr/hot');
  });

  it('switches to fallback provider after repeated tile errors before any tile loads', () => {
    const { L, map, createdLayers } = createMockLeaflet();
    const firstLayer = addBaseTileLayer(L, map);

    expect(createdLayers.length).toBe(1);
    expect(createdLayers[0].url).toContain('tile.openstreetmap.fr/hot');

    firstLayer.emit('tileerror');
    firstLayer.emit('tileerror');
    firstLayer.emit('tileerror');
    expect(createdLayers.length).toBe(1);

    firstLayer.emit('tileerror');
    expect(map.removeLayer).toHaveBeenCalledWith(firstLayer);
    expect(createdLayers.length).toBe(2);
    expect(createdLayers[1].url).toContain('tile.openstreetmap.de');
  });

  it('keeps the active provider once at least one tile loads successfully', () => {
    const { L, map, createdLayers } = createMockLeaflet();
    const firstLayer = addBaseTileLayer(L, map);

    firstLayer.emit('tileload');
    for (let i = 0; i < 6; i++) {
      firstLayer.emit('tileerror');
    }

    expect(map.removeLayer).not.toHaveBeenCalled();
    expect(createdLayers.length).toBe(1);
  });
});

