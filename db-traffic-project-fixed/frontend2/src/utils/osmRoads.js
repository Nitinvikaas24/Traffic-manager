// Fetches and parses the real OpenStreetMap road network (via the backend's
// Overpass proxy at /api/roads) into a plain node/adjacency graph that
// routing.js can build on. No pathfinding logic lives here.
import apiClient from '../api/client';
import { haversineDistance } from './geo';

const DRIVABLE_HIGHWAY_TYPES = new Set([
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'unclassified',
  'residential',
  'living_street',
  'motorway_link',
  'trunk_link',
  'primary_link',
  'secondary_link',
  'tertiary_link',
]);

export function computeBoundingBox(signals, paddingDegrees = 0.01) {
  const lats = signals.map((s) => s.location.coordinates[1]);
  const lngs = signals.map((s) => s.location.coordinates[0]);
  return {
    minLat: Math.min(...lats) - paddingDegrees,
    minLng: Math.min(...lngs) - paddingDegrees,
    maxLat: Math.max(...lats) + paddingDegrees,
    maxLng: Math.max(...lngs) + paddingDegrees,
  };
}

function parseOverpassResponse(data) {
  const nodes = new Map(); // osmId -> { lat, lng }
  const adjacency = new Map(); // osmId -> [{ to, distanceMeters }]

  (data.elements || []).forEach((el) => {
    if (el.type === 'node') {
      nodes.set(el.id, { lat: el.lat, lng: el.lon });
    }
  });

  const addEdge = (fromId, toId) => {
    const from = nodes.get(fromId);
    const to = nodes.get(toId);
    if (!from || !to) return;
    const distanceMeters = haversineDistance(from, to);
    if (!adjacency.has(fromId)) adjacency.set(fromId, []);
    adjacency.get(fromId).push({ to: toId, distanceMeters });
  };

  (data.elements || []).forEach((el) => {
    if (el.type !== 'way' || !Array.isArray(el.nodes)) return;
    if (el.tags?.highway && !DRIVABLE_HIGHWAY_TYPES.has(el.tags.highway)) return;
    const oneway = el.tags?.oneway === 'yes';
    for (let i = 0; i < el.nodes.length - 1; i++) {
      addEdge(el.nodes[i], el.nodes[i + 1]);
      if (!oneway) addEdge(el.nodes[i + 1], el.nodes[i]);
    }
  });

  return { nodes, adjacency };
}

export async function fetchRoadNetwork(signals) {
  if (!signals.length) return { nodes: new Map(), adjacency: new Map() };
  const bbox = computeBoundingBox(signals);
  const bboxParam = `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`;
  const { data } = await apiClient.get('/api/roads', { params: { bbox: bboxParam } });
  return parseOverpassResponse(data);
}

/** Snaps each MongoDB Signal to the nearest OSM road-network node. */
export function snapSignalsToRoadNetwork(signals, roadNetwork) {
  const snapMap = new Map(); // signalId -> osmNodeId

  signals.forEach((signal) => {
    const target = { lat: signal.location.coordinates[1], lng: signal.location.coordinates[0] };
    let nearestId = null;
    let nearestDist = Infinity;

    roadNetwork.nodes.forEach((coord, osmId) => {
      const d = haversineDistance(target, coord);
      if (d < nearestDist) {
        nearestDist = d;
        nearestId = osmId;
      }
    });

    if (nearestId !== null) snapMap.set(signal.signalId, nearestId);
  });

  return snapMap;
}
