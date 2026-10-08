// Restyles OpenFreeMap's "liberty" basemap into a pale, isometric 3D look:
// white ground, soft grey extruded buildings, tilted camera. Applied once at
// map load by recoloring the stock layers, so we keep liberty's tile sources,
// glyphs and sprites instead of maintaining a full custom style.

export const ISO_PITCH = 58;
export const ISO_BEARING = -20;
export const ISO_MAX_PITCH = 70; // the horizon only shows past ~71.6° at the default field of view

export const GROUND_COLOR = '#eef0f4';
const ROAD_COLOR = '#ffffff';
const ROAD_CASING_COLOR = '#d9dde5';
const WATER_COLOR = '#d6e3f1';
const PARK_COLOR = '#e6efe9';

const BUILDING_COLOR = [
  'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 0],
  0, '#eceef2',
  30, '#e1e4ea',
  100, '#cfd3dc',
];

const setPaint = (map, id, property, value) => map.setPaintProperty(id, property, value);
const hide = (map, id) => map.setLayoutProperty(id, 'visibility', 'none');

const styleRoad = (map, layer) => {
  const { id, type } = layer;
  if (id === 'road_area_pattern') return hide(map, id);
  if (type === 'line') {
    if (id.includes('hatching')) return setPaint(map, id, 'line-color', '#c3c8d2');
    if (id.includes('rail')) return setPaint(map, id, 'line-color', '#c3c8d2');
    if (id.endsWith('_casing')) return setPaint(map, id, 'line-color', ROAD_CASING_COLOR);
    if (id.includes('path_pedestrian')) return setPaint(map, id, 'line-color', '#e4e7ed');
    return setPaint(map, id, 'line-color', ROAD_COLOR);
  }
  return undefined;
};

const styleLabel = (map, layer) => {
  const { id } = layer;
  if (id.includes('shield') || id.includes('one_way_arrow')) return hide(map, id);
  const isPlace = id.startsWith('label_');
  setPaint(map, id, 'text-color', isPlace ? '#4b5565' : '#8a93a3');
  setPaint(map, id, 'text-halo-color', '#ffffff');
  setPaint(map, id, 'text-halo-width', 1.5);
  return undefined;
};

export const applyIsometricStyle = (map) => {
  map.getStyle().layers.forEach((layer) => {
    const { id, type } = layer;
    const sourceLayer = layer['source-layer'];

    if (id === 'background') return setPaint(map, id, 'background-color', GROUND_COLOR);
    if (type === 'raster') return hide(map, id);
    if (id === 'park_outline' || sourceLayer === 'poi') return hide(map, id);
    if (type === 'symbol') return styleLabel(map, layer);

    if (id === 'building') {
      setPaint(map, id, 'fill-color', '#e4e6eb');
      return setPaint(map, id, 'fill-outline-color', '#d3d6dd');
    }
    if (id === 'building-3d') {
      // Not every OSM footprint carries a height; liberty's bare ['get', ...]
      // yields null for those, so default them to a low-rise block.
      setPaint(map, id, 'fill-extrusion-height', ['coalesce', ['get', 'render_height'], 6]);
      setPaint(map, id, 'fill-extrusion-base', ['coalesce', ['get', 'render_min_height'], 0]);
      setPaint(map, id, 'fill-extrusion-color', BUILDING_COLOR);
      setPaint(map, id, 'fill-extrusion-opacity', 1);
      return setPaint(map, id, 'fill-extrusion-vertical-gradient', true);
    }

    if (sourceLayer === 'water' || sourceLayer === 'waterway') {
      return setPaint(map, id, type === 'line' ? 'line-color' : 'fill-color', WATER_COLOR);
    }
    if (sourceLayer === 'park' && type === 'fill') return setPaint(map, id, 'fill-color', PARK_COLOR);
    if (sourceLayer === 'landcover' || sourceLayer === 'landuse') {
      if (type === 'fill') setPaint(map, id, 'fill-color', id === 'landcover_wood' || id === 'landcover_grass' ? PARK_COLOR : GROUND_COLOR);
      return undefined;
    }
    if (sourceLayer === 'aeroway') {
      return setPaint(map, id, type === 'line' ? 'line-color' : 'fill-color', type === 'line' ? ROAD_COLOR : '#e8ebf0');
    }
    if (sourceLayer === 'transportation') return styleRoad(map, layer);
    return undefined;
  });

  // A soft key light from the upper left gives each building a lit and a
  // shaded face — the cheap stand-in for the reel's drop shadows.
  map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.45, position: [1.5, 200, 55] });
};
