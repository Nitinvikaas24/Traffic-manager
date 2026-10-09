// Intelligent routing engine — all pathfinding/graph logic lives in this file only.
// Nodes are OpenStreetMap road-network node ids (numbers); a subset of nodes carry
// signal metadata (attached by snapping each MongoDB Signal to its nearest OSM node).
import MinHeap from './minHeap';
import { fetchRoadNetwork, snapSignalsToRoadNetwork } from './osmRoads';
import { haversineDistance } from './geo';

export { haversineDistance };

const AVERAGE_SPEED_MPS = 8.33; // ~30 km/h urban default for edges with no road-class speed
const LARGE_GRAPH_NODE_THRESHOLD = 2000;

// Alternative-route selection (see findAlternativeRoutes)
const ALTERNATIVE_COUNT = 3;
const MAX_SHARED_FRACTION = 0.7; // an alternative may reuse at most 70% of another route's length
const MAX_DETOUR_FACTOR = 1.6; // ...and may take at most 1.6x the fastest route's time
const PENALTY_FACTOR = 1.6; // multiplier applied to roads already used, per round, to push the next search elsewhere
const MAX_ALTERNATIVE_ATTEMPTS = 8;

// ---------------------------------------------------------------------------
// Edge weighting
// ---------------------------------------------------------------------------

/**
 * Expected wait (seconds) approaching a signal: Webster's uniform-delay
 * formula, d = (C - g)^2 / (2C), where C is the cycle length and g the
 * effective green (green + its amber) for an approach. The timing plan has one
 * green phase per approach (e.g. MainRd_Green / SideRd_Green) but nothing says
 * which approach a route arrives on, so the delay is averaged across them.
 * Derived from the real currentTiming data, not measured.
 */
function estimateSignalWaitSeconds(signal) {
  if (!signal || !signal.currentTiming) return 0;
  const { cycleLength, phases } = signal.currentTiming;
  const approaches = new Map(); // "MainRd" -> effective green seconds (green + amber)
  (phases || []).forEach((p) => {
    const match = /^(.*?)_?(green|amber|yellow)$/i.exec(p.phaseId);
    if (!match) return;
    approaches.set(match[1], (approaches.get(match[1]) || 0) + p.duration);
  });
  if (!approaches.size || !cycleLength) return (cycleLength || 0) / 4; // no phase structure: assume half the cycle is red, wait half of that
  const delays = [...approaches.values()].map((green) => {
    const red = Math.max(cycleLength - green, 0);
    return (red * red) / (2 * cycleLength);
  });
  return delays.reduce((sum, d) => sum + d, 0) / delays.length;
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

function computeEdgeWeight(distanceMeters, targetSignal, atDate, speedMps = AVERAGE_SPEED_MPS) {
  if (!isSignalRoutable(targetSignal)) return Infinity;
  const baseSeconds = distanceMeters / speedMps;
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
  let maxSpeedMps = AVERAGE_SPEED_MPS;
  roadNetwork.adjacency.forEach((edges, fromId) => {
    const list = edges.map(({ to, distanceMeters, speedMps }) => {
      const edge = {
        to,
        distanceMeters,
        speedMps,
        weight: computeEdgeWeight(distanceMeters, signalByOsmNode.get(to), atDate, speedMps),
      };
      if (speedMps > maxSpeedMps) maxSpeedMps = speedMps;
      if (!incomingEdges.has(to)) incomingEdges.set(to, []);
      incomingEdges.get(to).push(edge);
      return edge;
    });
    adjacency.set(fromId, list);
  });

  return {
    nodes: roadNetwork.nodes, // Map<osmNodeId, {lat, lng}>
    maxSpeedMps, // fastest edge in this graph — A*'s admissible heuristic divides by it
    adjacency, // Map<osmNodeId, [{to, distanceMeters, speedMps, weight}]>
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
    edge.weight = computeEdgeWeight(edge.distanceMeters, updatedSignal, atDate, edge.speedMps);
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

/**
 * The one search loop behind both Dijkstra and A* (they differ only in the
 * heuristic). Options:
 *   excludedNodes / excludedEdges — Yen's spur searches ban these outright.
 *   edgePenalties — Map<edgeKey, multiplier >= 1>; makes those roads look
 *     costlier so the search prefers elsewhere (used to find alternatives).
 *     The returned cost then includes the penalties; callers wanting the real
 *     travel time re-cost the path with pathCost().
 * Edge keys are only built when an option actually needs them, because
 * stringifying every relaxed edge dominated the runtime on city-scale graphs.
 */
function shortestPath(graph, sourceId, destId, options, heuristic) {
  const excludedNodes = options.excludedNodes;
  const excludedEdges = options.excludedEdges?.size ? options.excludedEdges : null;
  const edgePenalties = options.edgePenalties?.size ? options.edgePenalties : null;

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
      if (excludedNodes?.has(to)) return;
      let cost = weight;
      if (excludedEdges || edgePenalties) {
        const key = edgeKey(current, to);
        if (excludedEdges?.has(key)) return;
        cost *= edgePenalties?.get(key) ?? 1;
      }
      const newDist = dist.get(current) + cost;
      if (newDist < (dist.get(to) ?? Infinity)) {
        dist.set(to, newDist);
        prev.set(to, current);
        heap.push(to, newDist + heuristic(to));
      }
    });
  }

  return reconstructPath(prev, dist, sourceId, destId);
}

/** Dijkstra's algorithm with a binary min-heap — baseline shortest path. */
export function dijkstra(graph, sourceId, destId, options = {}) {
  return shortestPath(graph, sourceId, destId, options, () => 0);
}

/** A* search with a Haversine heuristic — faster for large, geographically spread graphs. */
export function aStar(graph, sourceId, destId, options = {}) {
  const destCoord = graph.nodes.get(destId);
  // Admissible: no edge is faster than the graph's fastest road, and every
  // weight is at least its travel time (waits and congestion only add to it).
  const topSpeed = graph.maxSpeedMps ?? AVERAGE_SPEED_MPS;
  const heuristic = (nodeId) => {
    const coord = graph.nodes.get(nodeId);
    if (!coord || !destCoord) return 0;
    return haversineDistance(coord, destCoord) / topSpeed;
  };
  return shortestPath(graph, sourceId, destId, options, heuristic);
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
// Alternative routes
// ---------------------------------------------------------------------------

const edgeBetween = (graph, from, to) => (graph.adjacency.get(from) || []).find((e) => e.to === to);
// Direction-agnostic: driving the same street the other way is still the same street
const roadKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function roadLengths(graph, path) {
  const lengths = new Map();
  for (let i = 0; i < path.length - 1; i++) {
    lengths.set(roadKey(path[i], path[i + 1]), edgeBetween(graph, path[i], path[i + 1])?.distanceMeters || 0);
  }
  return lengths;
}

/** Fraction (0..1) of the shorter route's length that the two routes drive in common. */
function sharedFraction(graph, pathA, pathB) {
  const a = roadLengths(graph, pathA);
  const b = roadLengths(graph, pathB);
  let sharedLength = 0;
  let sharedCount = 0;
  a.forEach((length, key) => {
    if (b.has(key)) {
      sharedLength += length;
      sharedCount += 1;
    }
  });
  const sum = (m) => [...m.values()].reduce((total, length) => total + length, 0);
  const shorterLength = Math.min(sum(a), sum(b));
  if (shorterLength > 0) return sharedLength / shorterLength;
  const shorterCount = Math.min(a.size, b.size); // no distances recorded: fall back to counting roads
  return shorterCount > 0 ? sharedCount / shorterCount : 1;
}

/**
 * Up to `count` genuinely different routes, fastest first. Yen's K-shortest
 * paths is the textbook answer but returns near-duplicates in a street grid —
 * the 2nd "best" route usually differs from the best by one corner, which is
 * useless to a dispatcher. Instead this uses the penalty method: after each
 * route is found, the roads it uses are made costlier and the search re-run,
 * which pushes the next route onto different streets. A candidate is kept only
 * if it shares at most MAX_SHARED_FRACTION of its length with every route
 * already kept and isn't more than MAX_DETOUR_FACTOR slower than the fastest,
 * so fewer than `count` routes come back when no real alternative exists.
 * Reported costs are always real travel times, never the penalized ones.
 */
export function findAlternativeRoutes(graph, sourceId, destId, count = ALTERNATIVE_COUNT, shortestPathFn = selectAlgorithm(graph)) {
  const best = shortestPathFn(graph, sourceId, destId);
  if (!best) return [];

  const routes = [{ path: best.path, cost: best.cost }];
  const penalties = new Map();
  const penalize = (path) => {
    for (let i = 0; i < path.length - 1; i++) {
      [edgeKey(path[i], path[i + 1]), edgeKey(path[i + 1], path[i])].forEach((key) => {
        penalties.set(key, (penalties.get(key) ?? 1) * PENALTY_FACTOR);
      });
    }
  };
  penalize(best.path);

  for (let attempt = 0; attempt < MAX_ALTERNATIVE_ATTEMPTS && routes.length < count; attempt++) {
    const candidate = shortestPathFn(graph, sourceId, destId, { edgePenalties: penalties });
    if (!candidate) break;
    const cost = pathCost(graph, candidate.path);
    const distinct = routes.every((r) => sharedFraction(graph, r.path, candidate.path) <= MAX_SHARED_FRACTION);
    if (distinct && cost <= best.cost * MAX_DETOUR_FACTOR) routes.push({ path: candidate.path, cost });
    penalize(candidate.path); // kept or not, steer the next round further away from it
  }

  return routes.sort((a, b) => a.cost - b.cost);
}

/** Distance, and how many signals (with their combined expected wait), a route passes through. */
function routeStats(graph, path) {
  let distanceMeters = 0;
  let signalCount = 0;
  let signalDelaySeconds = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edge = edgeBetween(graph, path[i], path[i + 1]);
    if (edge) distanceMeters += edge.distanceMeters;
    const signal = graph.signalByOsmNode?.get(path[i + 1]);
    if (signal) {
      signalCount += 1;
      signalDelaySeconds += estimateSignalWaitSeconds(signal);
    }
  }
  return { distanceMeters, signalCount, signalDelaySeconds };
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
    const ranked = findAlternativeRoutes(graph, sourceOsmId, destOsmId, ALTERNATIVE_COUNT, algorithm);
    return {
      id,
      sourceOsmId,
      destOsmId,
      routes: ranked.map((r, index) => ({
        rank: index,
        path: r.path,
        etaSeconds: r.cost,
        ...routeStats(graph, r.path),
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
