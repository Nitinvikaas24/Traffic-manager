import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Chip from '@mui/material/Chip';
import './TrafficMap.css';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_CENTER = [80.2707, 13.0827]; // Chennai, India (lng, lat)
const SIGNALS_SOURCE_ID = 'signals-source';
const SIGNALS_LAYER_ID = 'signals-layer';

const STATUS_COLORS = {
  normal: '#4caf50',
  altered: '#ff9800',
  offline: '#f44336',
  maintenance: '#f44336',
  blocked: '#f44336',
  overridden: '#f44336',
};

const ROUTE_COLORS = ['#4caf50', '#ffeb3b', '#ff9800'];
const DASH_SEQUENCE = [
  [0, 4, 3],
  [1, 4, 2],
  [2, 4, 1],
  [3, 4, 0],
  [0, 1, 3, 3],
  [0, 2, 3, 2],
  [0, 3, 3, 1],
];

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
const TrafficMap = ({ signals, selectedSignalId, onSignalSelect, onMapClick, routes = [] }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const dashFrameRef = useRef(null);
  const popupRef = useRef(null);
  const openPopupSignalIdRef = useRef(null);
  const onSignalSelectRef = useRef(onSignalSelect);
  const onMapClickRef = useRef(onMapClick);
  const signalsRef = useRef(signals);
  const [mapReady, setMapReady] = useState(false);
  const [chipPositions, setChipPositions] = useState([]);

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
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

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

    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (dashFrameRef.current) clearInterval(dashFrameRef.current);
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
      map.addLayer({
        id: SIGNALS_LAYER_ID,
        type: 'circle',
        source: SIGNALS_SOURCE_ID,
        paint: {
          'circle-color': [
            'match',
            ['get', 'status'],
            'normal', STATUS_COLORS.normal,
            'altered', STATUS_COLORS.altered,
            'offline', STATUS_COLORS.offline,
            'maintenance', STATUS_COLORS.maintenance,
            'blocked', STATUS_COLORS.blocked,
            'overridden', STATUS_COLORS.overridden,
            STATUS_COLORS.normal,
          ],
          'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 10, 7],
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            4,
            ['case', ['boolean', ['feature-state', 'pulseEligible'], false], 3, 2],
          ],
          'circle-stroke-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#4dd0e1',
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
      zoom: 15,
    });
  }, [selectedSignalId, mapReady, signals]);

  // Sync route polylines
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const activeIds = new Set();

    routes.forEach((route, index) => {
      const sourceId = `route-${route.id}`;
      const layerId = `route-layer-${route.id}`;
      activeIds.add(sourceId);

      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: route.coordinates },
      };
      const baseWidth = index === 0 ? 5 : 3.5;
      const baseOpacity = index === 0 ? 0.95 : 0.75;
      const width = route.affected ? baseWidth + 2.5 : baseWidth;
      const opacity = route.affected ? 1 : baseOpacity;

      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(geojson);
        map.setPaintProperty(layerId, 'line-width', width);
        map.setPaintProperty(layerId, 'line-opacity', opacity);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: geojson });
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': route.color || ROUTE_COLORS[index] || ROUTE_COLORS[2],
            'line-width': width,
            'line-opacity': opacity,
          },
        });
      }
    });

    // Remove stale route layers/sources
    const existingLayers = map.getStyle().layers || [];
    existingLayers.forEach((layer) => {
      if (layer.id.startsWith('route-layer-') && !activeIds.has(layer.id.replace('route-layer-', 'route-'))) {
        if (map.getLayer(layer.id)) map.removeLayer(layer.id);
        const srcId = layer.id.replace('route-layer-', 'route-');
        if (map.getSource(srcId)) map.removeSource(srcId);
      }
    });

    // Animate the dash pattern on route 0 only (fastest route) for a "marching ants" effect
    if (dashFrameRef.current) clearInterval(dashFrameRef.current);
    const fastestRoute = routes[0];
    if (fastestRoute && map.getLayer(`route-layer-${fastestRoute.id}`)) {
      let step = 0;
      dashFrameRef.current = setInterval(() => {
        if (!map.getLayer(`route-layer-${fastestRoute.id}`)) return;
        step = (step + 1) % DASH_SEQUENCE.length;
        map.setLayoutProperty(`route-layer-${fastestRoute.id}`, 'line-dasharray', DASH_SEQUENCE[step]);
      }, 120);
    }

    return () => {
      if (dashFrameRef.current) {
        clearInterval(dashFrameRef.current);
        dashFrameRef.current = null;
      }
    };
  }, [routes, mapReady]);

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
            top: chip.y,
            transform: 'translate(-50%, -50%)',
            backgroundColor: ROUTE_COLORS[chip.rank] || ROUTE_COLORS[2],
            color: '#0a0a14',
            fontWeight: 700,
            pointerEvents: 'none',
            zIndex: 2,
            ...(chip.affected && { boxShadow: '0 0 0 3px rgba(255,255,255,0.6)' }),
          }}
        />
      ))}

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
