// Intelligent routing engine — all pathfinding/graph logic lives in this file only.
// Nodes are OpenStreetMap road-network node ids (numbers); a subset of nodes carry
// signal metadata (attached by snapping each MongoDB Signal to its nearest OSM node).
import MinHeap from './minHeap';
import { fetchRoadNetwork, snapSignalsToRoadNetwork } from './osmRoads';
import { haversineDistance } from './geo';

export { haversineDistance };

const AVERAGE_SPEED_MPS = 8.33; // ~30 km/h urban default cruising speed
const LARGE_GRAPH_NODE_THRESHOLD = 2000;

// ---------------------------------------------------------------------------
// Edge weighting
// ---------------------------------------------------------------------------

/**
 * Expected wait (seconds) approaching a signal, approximated as half the total
 * "stop" phase duration in its current timing plan — a standard traffic-
 * engineering approximation derived from real currentTiming data, not measured.
 */
function estimateSignalWaitSeconds(signal) {
  if (!signal || !signal.currentTiming) return 0;
  const { cycleLength, phases } = signal.currentTiming;
  const stopPhases = (phases || []).filter((p) => /red/i.test(p.phaseId));
  const stopDuration = stopPhases.length
    ? stopPhases.reduce((sum, p) => sum + p.duration, 0)
    : cycleLength / 2;
  return stopDuration / 2;
}

/**
 * Congestion multiplier is a documented HEURISTIC placeholder — the database has
 * no live congestion telemetry. It combines the signal's operational status with
 * a simple rush-hour time-of-day bump. Replace with real sensor data if/when
 * available; nothing else in the engine depends on this being exact.
 */
function estimateCongestionMultiplier(signal, atDate = new Date()) {
  let multiplier = 1;
  if (signal) {
    if (signal.status === 'altered') multiplier *= 1.15;
    if (signal.status === 'overridden') multiplier *= 1.3;
  }
  const hour = atDate.getHours();
  const isRushHour = (hour >= 8 && hour < 10) || (hour >= 17 && hour < 20);
  if (isRushHour) multiplier *= 1.4;
  return multiplier;
}

export function isSignalRoutable(signal) {
  if (!signal) return true;
  return signal.status !== 'blocked' && signal.status !== 'offline';
}

function computeEdgeWeight(distanceMeters, targetSignal, atDate) {
  if (!isSignalRoutable(targetSignal)) return Infinity;
  const baseSeconds = distanceMeters / AVERAGE_SPEED_MPS;
  const waitSeconds = estimateSignalWaitSeconds(targetSignal);
  const congestion = estimateCongestionMultiplier(targetSignal, atDate);
  return (baseSeconds + waitSeconds) * congestion;
}

// ---------------------------------------------------------------------------
// Graph construction
// ---------------------------------------------------------------------------

/**
 * Builds a weighted directed graph from the real OSM road network plus live
 * signal state. Edge weight = travel time (Haversine-derived distance / avg
 * speed) + expected signal wait + congestion factor.
 */
export function buildGraph(signals, roadNetwork, snapMap, atDate) {
  const signalByOsmNode = new Map();
  snapMap.forEach((osmId, signalId) => {
    const signal = signals.find((s) => s.signalId === signalId);
    if (signal) signalByOsmNode.set(osmId, signal);
  });

  // incomingEdges[nodeId] lists every edge object that targets nodeId, across
  // whichever node it originates from — built once here so updateNodeWeights
  // can patch a changed signal's incoming edges directly (O(in-degree)),
  // instead of scanning the entire adjacency list (O(total edges)).
  const incomingEdges = new Map();
  const adjacency = new Map();
  roadNetwork.adjacency.forEach((edges, fromId) => {
    const list = edges.map(({ to, distanceMeters }) => {
      const edge = { to, distanceMeters, weight: computeEdgeWeight(distanceMeters, signalByOsmNode.get(to), atDate) };
      if (!incomingEdges.has(to)) incomingEdges.set(to, []);
      incomingEdges.get(to).push(edge);
      return edge;
    });
    adjacency.set(fromId, list);
  });

  return {
    nodes: roadNetwork.nodes, // Map<osmNodeId, {lat, lng}>
    adjacency, // Map<osmNodeId, [{to, distanceMeters, weight}]>
    incomingEdges, // Map<osmNodeId, edge[]> — same edge objects as in `adjacency`
    signalByOsmNode, // Map<osmNodeId, Signal>
    snapMap, // Map<signalId, osmNodeId>
    nodeCount: roadNetwork.nodes.size,
  };
}

/**
 * When a signal changes (phase edit, override, block, schedule apply), patch
 * only the edges that target that signal's node — via the reverse-adjacency
 * index built in buildGraph, so this is O(in-degree), not O(total edges).
 */
export function updateNodeWeights(graph, signalId, updatedSignal, atDate) {
  const osmId = graph.snapMap.get(signalId);
  if (osmId === undefined) return graph;
  graph.signalByOsmNode.set(osmId, updatedSignal);
  const edges = graph.incomingEdges.get(osmId) || [];
  edges.forEach((edge) => {
    edge.weight = computeEdgeWeight(edge.distanceMeters, updatedSignal, atDate);
  });
  return graph;
}

/**
 * Orchestrates fetching the OSM road network, snapping signals to it, and
 * building the routing graph. Call once, then keep patching with
 * updateNodeWeights() as live signal data changes.
 */
export async function buildRoutingGraph(signals) {
  const roadNetwork = await fetchRoadNetwork(signals);
  const snapMap = snapSignalsToRoadNetwork(signals, roadNetwork);
  return buildGraph(signals, roadNetwork, snapMap);
}

// ---------------------------------------------------------------------------
// Shortest path algorithms
// ---------------------------------------------------------------------------

const edgeKey = (from, to) => `${from}->${to}`;

function reconstructPath(prev, dist, sourceId, destId) {
  if (!dist.has(destId)) return null;
  const path = [destId];
  let current = destId;
  while (current !== sourceId) {
    current = prev.get(current);
    if (current === undefined) return null;
    path.unshift(current);
  }
  return { path, cost: dist.get(destId) };
}

/** Dijkstra's algorithm with a binary min-heap — baseline shortest path. */
export function dijkstra(graph, sourceId, destId, options = {}) {
  const excludedNodes = options.excludedNodes || new Set();
  const excludedEdges = options.excludedEdges || new Set();

  const dist = new Map([[sourceId, 0]]);
  const prev = new Map();
  const visited = new Set();
  const heap = new MinHeap();
  heap.push(sourceId, 0);

  while (!heap.isEmpty()) {
    const current = heap.pop();
    if (current === destId) break;
    if (visited.has(current)) continue;
    visited.add(current);

    const edges = graph.adjacency.get(current) || [];
    edges.forEach(({ to, weight }) => {
      if (weight === Infinity) return;
      if (excludedNodes.has(to)) return;
      if (excludedEdges.has(edgeKey(current, to))) return;
      const newDist = dist.get(current) + weight;
      if (newDist < (dist.get(to) ?? Infinity)) {
        dist.set(to, newDist);
        prev.set(to, current);
        heap.push(to, newDist);
      }
    });
  }

  return reconstructPath(prev, dist, sourceId, destId);
}

/** A* search with a Haversine heuristic — faster for large, geographically spread graphs. */
export function aStar(graph, sourceId, destId, options = {}) {
  const excludedNodes = options.excludedNodes || new Set();
  const excludedEdges = options.excludedEdges || new Set();
  const destCoord = graph.nodes.get(destId);

  const heuristic = (nodeId) => {
    const coord = graph.nodes.get(nodeId);
    if (!coord || !destCoord) return 0;
    return haversineDistance(coord, destCoord) / AVERAGE_SPEED_MPS; // admissible lower bound
  };

  const dist = new Map([[sourceId, 0]]);
  const prev = new Map();
  const visited = new Set();
  const heap = new MinHeap();
  heap.push(sourceId, heuristic(sourceId));

  while (!heap.isEmpty()) {
    const current = heap.pop();
    if (current === destId) break;
    if (visited.has(current)) continue;
    visited.add(current);

    const edges = graph.adjacency.get(current) || [];
    edges.forEach(({ to, weight }) => {
      if (weight === Infinity) return;
      if (excludedNodes.has(to)) return;
      if (excludedEdges.has(edgeKey(current, to))) return;
      const newDist = dist.get(current) + weight;
      if (newDist < (dist.get(to) ?? Infinity)) {
        dist.set(to, newDist);
        prev.set(to, current);
        heap.push(to, newDist + heuristic(to));
      }
    });
  }

  return reconstructPath(prev, dist, sourceId, destId);
}

/** Picks Dijkstra or A* at runtime based on graph size. */
export function selectAlgorithm(graph) {
  return graph.nodeCount > LARGE_GRAPH_NODE_THRESHOLD ? aStar : dijkstra;
}

function pathCost(graph, path) {
  let cost = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edges = graph.adjacency.get(path[i]) || [];
    const edge = edges.find((e) => e.to === path[i + 1]);
    cost += edge ? edge.weight : Infinity;
  }
  return cost;
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Yen's K-Shortest Paths (default K=3) — ranked alternate routes, built on top
 * of the chosen single-shortest-path algorithm as its subroutine.
 */
export function yensKShortestPaths(graph, sourceId, destId, K = 3, shortestPathFn = dijkstra) {
  const first = shortestPathFn(graph, sourceId, destId);
  if (!first) return [];

  const A = [first];
  const B = [];

  for (let k = 1; k < K; k++) {
    const prevPath = A[k - 1].path;

    for (let i = 0; i < prevPath.length - 1; i++) {
      const spurNode = prevPath[i];
      const rootPath = prevPath.slice(0, i + 1);

      const excludedEdges = new Set();
      A.forEach(({ path }) => {
        if (path.length > i && arraysEqual(path.slice(0, i + 1), rootPath)) {
          excludedEdges.add(edgeKey(path[i], path[i + 1]));
        }
      });
      const excludedNodes = new Set(rootPath.slice(0, i));

      const spurResult = shortestPathFn(graph, spurNode, destId, { excludedNodes, excludedEdges });
      if (spurResult) {
        const totalPath = rootPath.slice(0, -1).concat(spurResult.path);
        if (!B.some((c) => arraysEqual(c.path, totalPath)) && !A.some((c) => arraysEqual(c.path, totalPath))) {
          B.push({ path: totalPath, cost: pathCost(graph, totalPath) });
        }
      }
    }

    if (B.length === 0) break;
    B.sort((a, b) => a.cost - b.cost);
    A.push(B.shift());
  }

  return A.slice(0, K);
}

// ---------------------------------------------------------------------------
// Live recalculation + map helpers
// ---------------------------------------------------------------------------

/**
 * Re-runs routing for every active source->destination pair. Intended to
 * complete in well under 200ms for the in-memory recompute step itself (post
 * fetch/build) on city-scale graphs; network/build time is separate.
 */
export function recalculateRoutes(graph, activeRoutePairs) {
  const algorithm = selectAlgorithm(graph);
  return activeRoutePairs.map(({ id, sourceOsmId, destOsmId }) => {
    const ranked = yensKShortestPaths(graph, sourceOsmId, destOsmId, 3, algorithm);
    return {
      id,
      sourceOsmId,
      destOsmId,
      routes: ranked.map((r, index) => ({
        rank: index,
        path: r.path,
        etaSeconds: r.cost,
        coordinates: pathToCoordinates(graph, r.path),
      })),
    };
  });
}

export function pathToCoordinates(graph, path) {
  return path
    .map((nodeId) => {
      const coord = graph.nodes.get(nodeId);
      return coord ? [coord.lng, coord.lat] : null;
    })
    .filter(Boolean);
}
