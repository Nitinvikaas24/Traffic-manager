// Fetches and parses the real OpenStreetMap road network (via the backend's
// Overpass proxy at /api/roads) into a plain node/adjacency graph that
// routing.js can build on. No pathfinding logic lives here.
import apiClient from '../api/client';
import { haversineDistance } from './geo';

// Typical urban cruising speed per OSM road class (km/h). The absolute values
// are conservative city numbers; what matters for routing is the *ratio* —
// arterials are genuinely faster than back lanes, so a route that hugs main
// roads beats a shorter zig-zag through residential streets. The Overpass
// data carries no per-way maxspeed, so class is the best available signal.
const HIGHWAY_SPEED_KMH = {
  motorway: 60,
  trunk: 45,
  primary: 40,
  secondary: 35,
  tertiary: 30,
  unclassified: 25,
  residential: 22,
  living_street: 10,
  motorway_link: 45,
  trunk_link: 35,
  primary_link: 30,
  secondary_link: 28,
  tertiary_link: 25,
};
const DRIVABLE_HIGHWAY_TYPES = new Set(Object.keys(HIGHWAY_SPEED_KMH));

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

/**
 * Returns the node ids of the largest strongly connected component — the part
 * of the network where every node can reach every other along legal driving
 * directions. Roads that are only reachable one way (private lanes, one-way
 * pockets, clipped edges at the bbox border) fall outside it; a signal snapped
 * into one of those could never be a route start or end. Iterative Kosaraju,
 * so a city-scale graph can't overflow the call stack.
 */
export function largestStronglyConnectedComponent(adjacency, nodeIds) {
  const reverse = new Map();
  adjacency.forEach((edges, from) => {
    edges.forEach(({ to }) => {
      let list = reverse.get(to);
      if (!list) reverse.set(to, (list = []));
      list.push(from);
    });
  });

  // Pass 1: DFS on the forward graph, recording finish order
  const visited = new Set();
  const finishOrder = [];
  for (const start of nodeIds) {
    if (visited.has(start)) continue;
    visited.add(start);
    const stack = [[start, 0]]; // [node, index of next outgoing edge to try]
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const edges = adjacency.get(frame[0]) || [];
      if (frame[1] < edges.length) {
        const next = edges[frame[1]++].to;
        if (!visited.has(next)) {
          visited.add(next);
          stack.push([next, 0]);
        }
      } else {
        finishOrder.push(frame[0]);
        stack.pop();
      }
    }
  }

  // Pass 2: sweep the reversed graph in reverse finish order; each sweep is one SCC
  const assigned = new Set();
  let largest = [];
  for (let i = finishOrder.length - 1; i >= 0; i--) {
    const start = finishOrder[i];
    if (assigned.has(start)) continue;
    assigned.add(start);
    const component = [];
    const stack = [start];
    while (stack.length) {
      const node = stack.pop();
      component.push(node);
      for (const prev of reverse.get(node) || []) {
        if (!assigned.has(prev)) {
          assigned.add(prev);
          stack.push(prev);
        }
      }
    }
    if (component.length > largest.length) largest = component;
  }
  return new Set(largest);
}

export function parseOverpassResponse(data) {
  const nodes = new Map(); // osmId -> { lat, lng }
  const adjacency = new Map(); // osmId -> [{ to, distanceMeters, speedMps? }]

  (data.elements || []).forEach((el) => {
    if (el.type === 'node') {
      nodes.set(el.id, { lat: el.lat, lng: el.lon });
    }
  });

  const addEdge = (fromId, toId, speedMps) => {
    const from = nodes.get(fromId);
    const to = nodes.get(toId);
    if (!from || !to) return;
    const distanceMeters = haversineDistance(from, to);
    if (!adjacency.has(fromId)) adjacency.set(fromId, []);
    adjacency.get(fromId).push({ to: toId, distanceMeters, speedMps });
  };

  (data.elements || []).forEach((el) => {
    if (el.type !== 'way' || !Array.isArray(el.nodes)) return;
    const highway = el.tags?.highway;
    if (highway && !DRIVABLE_HIGHWAY_TYPES.has(highway)) return;
    const speedKmh = HIGHWAY_SPEED_KMH[highway];
    const speedMps = speedKmh ? speedKmh / 3.6 : undefined; // untagged ways use routing.js's default
    const oneway = el.tags?.oneway;
    const forwardOnly = oneway === 'yes' || oneway === 'true' || oneway === '1';
    const reverseOnly = oneway === '-1'; // way is drawn against its legal direction
    for (let i = 0; i < el.nodes.length - 1; i++) {
      if (!reverseOnly) addEdge(el.nodes[i], el.nodes[i + 1], speedMps);
      if (!forwardOnly) addEdge(el.nodes[i + 1], el.nodes[i], speedMps);
    }
  });

  const mainComponent = largestStronglyConnectedComponent(adjacency, nodes.keys());
  return { nodes, adjacency, mainComponent };
}

export async function fetchRoadNetwork(signals) {
  if (!signals.length) return { nodes: new Map(), adjacency: new Map() };
  const bbox = computeBoundingBox(signals);
  const bboxParam = `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`;
  const { data } = await apiClient.get('/api/roads', { params: { bbox: bboxParam } });
  return parseOverpassResponse(data);
}

// OSM signal nodes are themselves road nodes (distance ~0) and hand-placed
// ones land within a few tens of meters, so anything farther than this has no
// road data nearby — e.g. a signal past the edge of the bundled road snapshot.
// Snapping it anyway would pin it to a node kilometers away and route wrongly.
export const MAX_SNAP_DISTANCE_METERS = 300;

const METERS_PER_DEGREE = 111320;
// Grid cells wider than the snap limit, so every node within range of a signal
// lies in the signal's own cell or one of its neighbours.
const SNAP_CELL_DEGREES = 0.004;

/**
 * Snaps each MongoDB Signal to the nearest OSM road-network node. When the
 * network carries a `mainComponent` (the largest strongly connected part),
 * only its nodes are candidates, so a snapped signal can always start and end
 * routes. Signals with no candidate within MAX_SNAP_DISTANCE_METERS are left
 * out of the map; routing reports those as "could not snap" instead of using
 * a wrong location. Uses a spatial grid, so it is O(signals) not O(signals x nodes).
 */
export function snapSignalsToRoadNetwork(signals, roadNetwork) {
  const snapMap = new Map(); // signalId -> osmNodeId
  const cellOf = (lat, lng) => `${Math.floor(lat / SNAP_CELL_DEGREES)},${Math.floor(lng / SNAP_CELL_DEGREES)}`;

  const grid = new Map(); // cell -> [[osmId, coord], ...]
  roadNetwork.nodes.forEach((coord, osmId) => {
    if (roadNetwork.mainComponent && !roadNetwork.mainComponent.has(osmId)) return;
    const key = cellOf(coord.lat, coord.lng);
    const bucket = grid.get(key);
    if (bucket) bucket.push([osmId, coord]);
    else grid.set(key, [[osmId, coord]]);
  });

  signals.forEach((signal) => {
    const target = { lat: signal.location.coordinates[1], lng: signal.location.coordinates[0] };
    const row = Math.floor(target.lat / SNAP_CELL_DEGREES);
    const col = Math.floor(target.lng / SNAP_CELL_DEGREES);
    // A degree of longitude shrinks with latitude, so reach further in cells there
    const latReach = Math.ceil(MAX_SNAP_DISTANCE_METERS / (SNAP_CELL_DEGREES * METERS_PER_DEGREE));
    const lngReach = Math.ceil(
      MAX_SNAP_DISTANCE_METERS / (SNAP_CELL_DEGREES * METERS_PER_DEGREE * Math.cos((target.lat * Math.PI) / 180))
    );

    let nearestId = null;
    let nearestDist = Infinity;
    for (let dr = -latReach; dr <= latReach; dr++) {
      for (let dc = -lngReach; dc <= lngReach; dc++) {
        const bucket = grid.get(`${row + dr},${col + dc}`);
        if (!bucket) continue;
        bucket.forEach(([osmId, coord]) => {
          const d = haversineDistance(target, coord);
          if (d < nearestDist) {
            nearestDist = d;
            nearestId = osmId;
          }
        });
      }
    }

    if (nearestId !== null && nearestDist <= MAX_SNAP_DISTANCE_METERS) snapMap.set(signal.signalId, nearestId);
  });

  return snapMap;
}
