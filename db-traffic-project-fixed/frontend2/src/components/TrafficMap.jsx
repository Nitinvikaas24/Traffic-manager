import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Chip from '@mui/material/Chip';
import { applyIsometricStyle, ISO_PITCH, ISO_BEARING, ISO_MAX_PITCH } from './isometricStyle';
import { ROUTE_COLORS } from './routeColors';
import './TrafficMap.css';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_CENTER = [80.2707, 13.0827]; // Chennai, India (lng, lat)
const DEFAULT_ZOOM = 14.2; // 3D buildings extrude from zoom 14; any wider reads as noise
const SELECTED_ZOOM = 16;
const INITIAL_MAX_ZOOM = 13.5; // don't zoom in past this when framing a small signal set
const SIGNALS_SOURCE_ID = 'signals-source';
const SIGNALS_HALO_LAYER_ID = 'signals-halo-layer';
const SIGNALS_LAYER_ID = 'signals-layer';

const STATUS_COLORS = {
  normal: '#1fb98a',
  altered: '#ff9800',
  offline: '#f44336',
  maintenance: '#f44336',
  blocked: '#f44336',
  overridden: '#f44336',
};

const STATUS_COLOR_EXPRESSION = [
  'match',
  ['get', 'status'],
  'normal', STATUS_COLORS.normal,
  'altered', STATUS_COLORS.altered,
  'offline', STATUS_COLORS.offline,
  'maintenance', STATUS_COLORS.maintenance,
  'blocked', STATUS_COLORS.blocked,
  'overridden', STATUS_COLORS.overridden,
  STATUS_COLORS.normal,
];

// Stable default for the `routes` prop: an inline `= []` is a new array every
// render, which re-fires the route/chip effects (and their setState) forever.
const NO_ROUTES = [];

// While a route is shown the basemap sinks into a night tone (a background
// layer slid in just under the signals) so the routes glow instead of washing
// out against the pale ground.
const ROUTE_DIM_LAYER_ID = 'route-dim-layer';
const ROUTE_DIM_COLOR = '#070d1f';
const ROUTE_DIM_OPACITY = 0.5;
const ROUTE_DIM_FADE_MS = 500;
const ROUTE_ANIMATION_INTERVAL_MS = 50;

// A bright pulse (white, fading to nothing behind it) that runs along a route.
// `head` is the pulse position as a fraction of the route's length; it must stay
// strictly inside (0, 1) so the gradient stops are strictly increasing.
const pulseGradient = (head) => [
  'interpolate', ['linear'], ['line-progress'],
  0, 'rgba(255,255,255,0)',
  Math.max(0.001, head - 0.12), 'rgba(255,255,255,0)',
  head, 'rgba(255,255,255,0.95)',
  Math.min(0.999, head + 0.012), 'rgba(255,255,255,0)',
  1, 'rgba(255,255,255,0)',
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const getStatusClass = (status) => {
  switch (status) {
    case 'normal':
      return 'status-success';
    case 'altered':
      return 'status-warning';
    default:
      return 'status-error';
  }
};

const formatLastUpdated = (dateString) => new Date(dateString).toLocaleString();

// signal.intersectionName and override.reason are officer-editable free text
// (round-tripped through the API), so they must be escaped before going into
// innerHTML via maplibre's Popup.setHTML — otherwise this is stored XSS.
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));

const buildPopupHtml = (signal) => {
  const overrideNote = signal.override?.active
    ? `<p class="popup-info">Override: forced ${escapeHtml(signal.override.forcedPhase || 'n/a')} — ${escapeHtml(signal.override.reason || 'no reason given')}</p>`
    : '';
  return `
    <div class="signal-popup">
      <h3 class="popup-title">${escapeHtml(signal.intersectionName)}</h3>
      <p class="popup-id">ID: ${escapeHtml(signal.signalId)}</p>
      <span class="status-badge ${getStatusClass(signal.status)}">${escapeHtml(signal.status.toUpperCase())}</span>
      <p class="popup-info">Current Cycle: ${escapeHtml(signal.currentTiming.cycleLength)}s</p>
      ${overrideNote}
      <p class="popup-timestamp">Last updated: ${escapeHtml(formatLastUpdated(signal.lastUpdated))}</p>
    </div>
  `;
};

const buildSignalsGeoJson = (signalsList) => ({
  type: 'FeatureCollection',
  features: signalsList.map((s) => ({
    type: 'Feature',
    properties: { signalId: s.signalId, status: s.status },
    geometry: { type: 'Point', coordinates: [s.location.coordinates[0], s.location.coordinates[1]] },
  })),
});

/**
 * signals: Signal[]
 * selectedSignalId: string | null
 * onSignalSelect: (signalId: string) => void
 * onMapClick: ({ lat, lng }) => void (optional — fires for clicks that miss a signal, e.g. Add-Signal placement)
 * routes: Array<{ id: string, coordinates: [lng, lat][], eta: number, rank: 0|1|2, affected?: boolean }> (optional)
 *
 * Signals render as a single GPU-rendered circle layer (not one DOM marker per
 * signal) so this scales to a city's worth of signals — hundreds to low
 * thousands of points — without the per-marker DOM/event-listener overhead
 * that a maplibregl.Marker-per-signal approach would hit at that volume.
 */
const TrafficMap = ({ signals, selectedSignalId, onSignalSelect, onMapClick, routes = NO_ROUTES }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const routeAnimRef = useRef(null);
  const popupRef = useRef(null);
  const openPopupSignalIdRef = useRef(null);
  const onSignalSelectRef = useRef(onSignalSelect);
  const onMapClickRef = useRef(onMapClick);
  const signalsRef = useRef(signals);
  const routesRef = useRef(routes);
  const initialFitDoneRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [chipPositions, setChipPositions] = useState([]);
  const [is3d, setIs3d] = useState(true);

  // Keep the latest callbacks/data available to handlers registered once at
  // map-init time, so they never see a stale closure.
  useEffect(() => {
    onSignalSelectRef.current = onSignalSelect;
  }, [onSignalSelect]);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);
  useEffect(() => {
    signalsRef.current = signals;
  }, [signals]);
  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  const openPopupForSignal = (signal) => {
    if (popupRef.current) popupRef.current.remove();
    const popup = new maplibregl.Popup({ offset: 12 })
      .setLngLat([signal.location.coordinates[0], signal.location.coordinates[1]])
      .setHTML(buildPopupHtml(signal))
      .addTo(mapRef.current);
    popup.on('close', () => {
      if (popupRef.current === popup) {
        popupRef.current = null;
        openPopupSignalIdRef.current = null;
      }
    });
    popupRef.current = popup;
    openPopupSignalIdRef.current = signal.signalId;
  };

  // Initialize the map once
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: ISO_PITCH,
      bearing: ISO_BEARING,
      maxPitch: ISO_MAX_PITCH,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('click', (e) => {
      const hasLayer = map.getLayer(SIGNALS_LAYER_ID);
      const hits = hasLayer ? map.queryRenderedFeatures(e.point, { layers: [SIGNALS_LAYER_ID] }) : [];
      if (hits.length > 0) {
        const { signalId } = hits[0].properties;
        onSignalSelectRef.current?.(signalId);
        const signal = signalsRef.current.find((s) => s.signalId === signalId);
        if (signal) openPopupForSignal(signal);
      } else {
        onMapClickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    map.on('pitchend', () => setIs3d(map.getPitch() > 5));

    map.on('load', () => {
      applyIsometricStyle(map);
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (routeAnimRef.current) clearInterval(routeAnimRef.current);
      if (popupRef.current) popupRef.current.remove();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync the signals source/layer and per-feature selected/pulse state
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const geojson = buildSignalsGeoJson(signals);

    if (!map.getSource(SIGNALS_SOURCE_ID)) {
      map.addSource(SIGNALS_SOURCE_ID, { type: 'geojson', data: geojson, promoteId: 'signalId' });
      // Soft colored pool under each signal so it reads on the pale ground.
      // Both circle layers lie flat on the map plane ('map' alignment) so they
      // foreshorten with the tilted camera like discs on the road surface.
      map.addLayer({
        id: SIGNALS_HALO_LAYER_ID,
        type: 'circle',
        source: SIGNALS_SOURCE_ID,
        paint: {
          'circle-color': STATUS_COLOR_EXPRESSION,
          'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 26, 17],
          'circle-opacity': 0.22,
          'circle-blur': 0.8,
          'circle-pitch-alignment': 'map',
        },
      });
      map.addLayer({
        id: SIGNALS_LAYER_ID,
        type: 'circle',
        source: SIGNALS_SOURCE_ID,
        paint: {
          'circle-color': STATUS_COLOR_EXPRESSION,
          'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 10, 7],
          'circle-pitch-alignment': 'map',
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            4,
            ['case', ['boolean', ['feature-state', 'pulseEligible'], false], 3, 2.5],
          ],
          'circle-stroke-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#2563eb',
            ['case', ['boolean', ['feature-state', 'pulseEligible'], false], '#ff1744', '#ffffff'],
          ],
        },
      });
      map.on('mouseenter', SIGNALS_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', SIGNALS_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
      });
    } else {
      map.getSource(SIGNALS_SOURCE_ID).setData(geojson);
    }

    signals.forEach((signal) => {
      map.setFeatureState(
        { source: SIGNALS_SOURCE_ID, id: signal.signalId },
        {
          selected: signal.signalId === selectedSignalId,
          pulseEligible: signal.status === 'blocked' || signal.status === 'overridden',
        }
      );
    });

    // Keep an already-open popup's content fresh as signal data changes
    if (openPopupSignalIdRef.current) {
      const openSignal = signals.find((s) => s.signalId === openPopupSignalIdRef.current);
      if (openSignal && popupRef.current) {
        popupRef.current.setHTML(buildPopupHtml(openSignal));
      }
    }
  }, [signals, selectedSignalId, mapReady]);

  // Fly to the selected signal
  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedSignalId) return;
    const selectedSignal = signals.find((s) => s.signalId === selectedSignalId);
    if (!selectedSignal) return;
    mapRef.current.flyTo({
      center: [selectedSignal.location.coordinates[0], selectedSignal.location.coordinates[1]],
      zoom: SELECTED_ZOOM,
    });
  }, [selectedSignalId, mapReady, signals]);

  // Sync route polylines
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const activeIds = new Set();

    // Each route is a neon tube: a wide soft bloom, a tighter inner glow, the
    // coloured line, a white-hot core, and a pulse of light travelling along it.
    // Added slowest-first so the fastest route stacks on top wherever paths overlap.
    routes.map((route, index) => ({ route, index })).reverse().forEach(({ route, index }) => {
      const sourceId = `route-${route.id}`;
      const ids = {
        bloom: `route-bloom-${route.id}`,
        glow: `route-glow-${route.id}`,
        line: `route-layer-${route.id}`,
        core: `route-core-${route.id}`,
        pulse: `route-pulse-${route.id}`,
      };
      activeIds.add(sourceId);

      const color = route.color || ROUTE_COLORS[index] || ROUTE_COLORS[2];
      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: route.coordinates },
      };
      const baseWidth = index === 0 ? 6 : 4.5;
      const width = route.affected ? baseWidth + 2.5 : baseWidth;
      const sizes = {
        bloom: width * 5 + 8,
        glow: width * 2.4,
        line: width,
        core: Math.max(1.5, width * 0.35),
        pulse: width * 1.15,
      };

      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(geojson);
        Object.keys(ids).forEach((part) => map.setPaintProperty(ids[part], 'line-width', sizes[part]));
      } else {
        // lineMetrics is what lets the pulse layer address positions along the line
        map.addSource(sourceId, { type: 'geojson', data: geojson, lineMetrics: true });
        const layout = { 'line-join': 'round', 'line-cap': 'round' };
        const addLine = (part, paint) =>
          map.addLayer({ id: ids[part], type: 'line', source: sourceId, layout, paint: { 'line-width': sizes[part], ...paint } });
        addLine('bloom', { 'line-color': color, 'line-opacity': 0.5, 'line-blur': 16 });
        addLine('glow', { 'line-color': color, 'line-opacity': 0.85, 'line-blur': 4 });
        addLine('line', { 'line-color': color, 'line-opacity': 1 });
        addLine('core', { 'line-color': '#ffffff', 'line-opacity': 0.9 });
        addLine('pulse', { 'line-gradient': pulseGradient(0.02) });
      }
    });

    // Remove stale route layers (all five per route), then their now-unused sources
    const staleSources = new Set();
    (map.getStyle().layers || []).forEach((layer) => {
      if (layer.source?.startsWith('route-') && !activeIds.has(layer.source)) {
        map.removeLayer(layer.id);
        staleSources.add(layer.source);
      }
    });
    staleSources.forEach((srcId) => map.removeSource(srcId));

    // Run a pulse of light down each route and let its bloom breathe. Slower
    // routes pulse a little slower, so the three are easy to tell apart.
    if (routeAnimRef.current) clearInterval(routeAnimRef.current);
    if (routes.length > 0 && !prefersReducedMotion()) {
      const startedAt = performance.now();
      routeAnimRef.current = setInterval(() => {
        const elapsed = performance.now() - startedAt;
        routes.forEach((route, index) => {
          const pulseId = `route-pulse-${route.id}`;
          const bloomId = `route-bloom-${route.id}`;
          if (!map.getLayer(pulseId)) return;
          const head = 0.01 + 0.97 * ((elapsed / (3200 + index * 900)) % 1);
          map.setPaintProperty(pulseId, 'line-gradient', pulseGradient(head));
          map.setPaintProperty(bloomId, 'line-opacity', (route.affected ? 0.7 : 0.5) + 0.15 * Math.sin(elapsed / 400 + index));
        });
      }, ROUTE_ANIMATION_INTERVAL_MS);
    }

    return () => {
      if (routeAnimRef.current) {
        clearInterval(routeAnimRef.current);
        routeAnimRef.current = null;
      }
    };
  }, [routes, mapReady]);

  // Frame a newly requested trip. Keyed on the trip's endpoints, so live
  // recomputes of the same trip (signal changes, polling) don't yank the camera.
  const tripKey = routes[0]?.coordinates?.length
    ? `${routes[0].coordinates[0]}|${routes[0].coordinates[routes[0].coordinates.length - 1]}`
    : '';
  useEffect(() => {
    if (!mapReady || !mapRef.current || !tripKey) return;
    const bounds = new maplibregl.LngLatBounds();
    routesRef.current.forEach((route) => route.coordinates.forEach((coord) => bounds.extend(coord)));
    const map = mapRef.current;
    // fitBounds resets the bearing to north unless told otherwise; keep the isometric angle
    map.fitBounds(bounds, {
      padding: { top: 90, bottom: 130, left: 70, right: 70 },
      maxZoom: 16,
      duration: 1000,
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    });
  }, [tripKey, mapReady]);

  // Open framed on the whole signal network, so the map looks as populated as it is
  useEffect(() => {
    if (!mapReady || !mapRef.current || initialFitDoneRef.current || signals.length < 2 || selectedSignalId) return;
    initialFitDoneRef.current = true;
    const bounds = new maplibregl.LngLatBounds();
    signals.forEach((signal) => bounds.extend(signal.location.coordinates));
    mapRef.current.fitBounds(bounds, {
      padding: 60,
      maxZoom: INITIAL_MAX_ZOOM,
      duration: 0,
      bearing: ISO_BEARING,
      pitch: ISO_PITCH,
    });
  }, [mapReady, signals, selectedSignalId]);

  // Fade the basemap down to night while any route is shown, and back up when cleared
  const hasRoutes = routes.length > 0;
  useEffect(() => {
    if (!mapReady || !mapRef.current) return undefined;
    const map = mapRef.current;
    const target = hasRoutes ? ROUTE_DIM_OPACITY : 0;
    if (!map.getLayer(ROUTE_DIM_LAYER_ID)) {
      if (target === 0) return undefined;
      // Just under the signals, so they and the routes stay bright above the dimmed ground
      map.addLayer(
        { id: ROUTE_DIM_LAYER_ID, type: 'background', paint: { 'background-color': ROUTE_DIM_COLOR, 'background-opacity': 0 } },
        map.getLayer(SIGNALS_HALO_LAYER_ID) ? SIGNALS_HALO_LAYER_ID : undefined
      );
    }
    const from = map.getPaintProperty(ROUTE_DIM_LAYER_ID, 'background-opacity') ?? 0;
    const startedAt = performance.now();
    let frame;
    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / ROUTE_DIM_FADE_MS);
      if (map.getLayer(ROUTE_DIM_LAYER_ID)) map.setPaintProperty(ROUTE_DIM_LAYER_ID, 'background-opacity', from + (target - from) * progress);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [hasRoutes, mapReady]);

  // Keep ETA chip screen positions in sync with the map viewport
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    const updateChips = () => {
      const positions = routes.map((route, index) => {
        const midpoint = route.coordinates[Math.floor(route.coordinates.length / 2)];
        const point = map.project(midpoint);
        return { id: route.id, eta: route.eta, rank: index, affected: route.affected, x: point.x, y: point.y };
      });
      setChipPositions(positions);
    };

    updateChips();
    map.on('move', updateChips);
    map.on('resize', updateChips);
    return () => {
      map.off('move', updateChips);
      map.off('resize', updateChips);
    };
  }, [routes, mapReady]);

  const toggleTilt = () => {
    const map = mapRef.current;
    if (!map) return;
    const next = !is3d;
    map.easeTo({ pitch: next ? ISO_PITCH : 0, bearing: next ? ISO_BEARING : 0, duration: 800 });
    setIs3d(next);
  };

  return (
    <div className="map-container">
      <div ref={containerRef} className="map-canvas" />

      {chipPositions.map((chip) => (
        <Chip
          key={chip.id}
          label={`Route ${chip.rank + 1}: ${Math.round(chip.eta)}s`}
          size="small"
          sx={{
            position: 'absolute',
            left: chip.x,
            top: chip.y + chip.rank * 26, // stagger: near-identical routes share a midpoint
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            border: `2px solid ${ROUTE_COLORS[chip.rank] || ROUTE_COLORS[2]}`,
            color: '#12121f',
            fontWeight: 700,
            pointerEvents: 'none',
            zIndex: 2,
            ...(chip.affected && { boxShadow: `0 0 0 4px ${ROUTE_COLORS[chip.rank] || ROUTE_COLORS[2]}55` }),
          }}
        />
      ))}

      <div className="map-pill">
        <span>{signals.length} {signals.length === 1 ? 'signal' : 'signals'}</span>
        <button type="button" className="map-pill-toggle" onClick={toggleTilt} disabled={!mapReady}>
          {is3d ? '3D' : '2D'}
        </button>
      </div>

      <div className="map-legend">
        <h4 className="legend-title">Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot legend-normal"></span>
            <span>Normal</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-altered"></span>
            <span>Altered / Scheduled</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-offline"></span>
            <span>Offline / Blocked / Overridden</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficMap;
