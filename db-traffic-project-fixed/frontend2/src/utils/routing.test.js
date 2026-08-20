import { describe, it, expect } from 'vitest';
import {
  buildGraph,
  updateNodeWeights,
  dijkstra,
  aStar,
  yensKShortestPaths,
  selectAlgorithm,
  recalculateRoutes,
  pathToCoordinates,
  isSignalRoutable,
} from './routing';

// A fixed off-peak instant (Tuesday 2pm) so congestion-multiplier tests are
// deterministic regardless of when the test suite actually runs.
const OFF_PEAK = new Date('2025-01-07T14:00:00');
const RUSH_HOUR = new Date('2025-01-07T09:00:00');

const AVERAGE_SPEED_MPS = 8.33; // must match routing.js's internal constant

function makeSignal({ status = 'normal', cycleLength = 120, phases } = {}) {
  return {
    signalId: 'S1',
    status,
    currentTiming: {
      cycleLength,
      phases: phases || [
        { phaseId: 'MainRd_Green', duration: 50 },
        { phaseId: 'MainRd_Amber', duration: 5 },
        { phaseId: 'SideRd_Green', duration: 35 },
        { phaseId: 'SideRd_Amber', duration: 5 },
        { phaseId: 'All_Red', duration: 25 },
      ],
    },
  };
}

// Hand-verifiable diamond graph with a shortcut, all nodes colocated so the
// A* Haversine heuristic is 0 everywhere (isolates algorithm-correctness
// testing from heuristic/geometry testing, which geo.test.js covers):
//
//   1 --(1)--> 2 --(1)--> 4      shortest:  1-2-4 = 2
//   1 --(2)--> 3 --(1)--> 4      2nd best:  1-3-4 = 3
//   1 --(5)------------->4       3rd best:  1-4   = 5
function buildDiamondGraph() {
  const coord = { lat: 0, lng: 0 };
  const nodes = new Map([
    [1, coord],
    [2, coord],
    [3, coord],
    [4, coord],
  ]);
  const adjacency = new Map([
    [
      1,
      [
        { to: 2, distanceMeters: 0, weight: 1 },
        { to: 3, distanceMeters: 0, weight: 2 },
        { to: 4, distanceMeters: 0, weight: 5 },
      ],
    ],
    [2, [{ to: 4, distanceMeters: 0, weight: 1 }]],
    [3, [{ to: 4, distanceMeters: 0, weight: 1 }]],
    [4, []],
  ]);
  return { nodes, adjacency, incomingEdges: new Map(), signalByOsmNode: new Map(), snapMap: new Map(), nodeCount: 4 };
}

describe('buildGraph', () => {
  it('computes edge weight as (distance/speed + signal wait) * congestion, off-peak', () => {
    const roadNetwork = {
      nodes: new Map([
        [1, { lat: 0, lng: 0 }],
        [2, { lat: 0, lng: 0 }],
      ]),
      adjacency: new Map([[1, [{ to: 2, distanceMeters: 1000 }]]]),
    };
    const signal = makeSignal({ status: 'normal' }); // All_Red duration 25 -> wait = 12.5s
    const snapMap = new Map([['S1', 2]]);

    const graph = buildGraph([signal], roadNetwork, snapMap, OFF_PEAK);

    const expectedWeight = 1000 / AVERAGE_SPEED_MPS + 12.5; // congestion x1 off-peak, normal status
    expect(graph.adjacency.get(1)[0].weight).toBeCloseTo(expectedWeight, 3);
  });

  it('applies the rush-hour congestion multiplier', () => {
    const roadNetwork = {
      nodes: new Map([
        [1, { lat: 0, lng: 0 }],
        [2, { lat: 0, lng: 0 }],
      ]),
      adjacency: new Map([[1, [{ to: 2, distanceMeters: 1000 }]]]),
    };
    const signal = makeSignal({ status: 'normal' });
    const snapMap = new Map([['S1', 2]]);

    const offPeakGraph = buildGraph([signal], roadNetwork, snapMap, OFF_PEAK);
    const rushHourGraph = buildGraph([signal], roadNetwork, snapMap, RUSH_HOUR);

    const offPeakWeight = offPeakGraph.adjacency.get(1)[0].weight;
    const rushHourWeight = rushHourGraph.adjacency.get(1)[0].weight;
    expect(rushHourWeight).toBeCloseTo(offPeakWeight * 1.4, 3);
  });

  it('gives a blocked signal Infinite edge weight, excluding it from routing', () => {
    const roadNetwork = {
      nodes: new Map([
        [1, { lat: 0, lng: 0 }],
        [2, { lat: 0, lng: 0 }],
      ]),
      adjacency: new Map([[1, [{ to: 2, distanceMeters: 500 }]]]),
    };
    const signal = makeSignal({ status: 'blocked' });
    const snapMap = new Map([['S1', 2]]);

    const graph = buildGraph([signal], roadNetwork, snapMap, OFF_PEAK);
    expect(graph.adjacency.get(1)[0].weight).toBe(Infinity);
  });

  it('builds a reverse-adjacency index so updateNodeWeights only touches the changed node\'s incoming edges', () => {
    const roadNetwork = {
      nodes: new Map([
        [1, { lat: 0, lng: 0 }],
        [2, { lat: 0, lng: 0 }],
        [3, { lat: 0, lng: 0 }],
      ]),
      adjacency: new Map([
        [1, [{ to: 2, distanceMeters: 1000 }]],
        [2, [{ to: 3, distanceMeters: 1000 }]],
      ]),
    };
    const signalAtNode2 = { ...makeSignal({ status: 'normal' }), signalId: 'S2' };
    const signalAtNode3 = { ...makeSignal({ status: 'normal' }), signalId: 'S3' };
    const snapMap = new Map([
      ['S2', 2],
      ['S3', 3],
    ]);

    const graph = buildGraph([signalAtNode2, signalAtNode3], roadNetwork, snapMap, OFF_PEAK);
    const edgeIntoNode2 = graph.adjacency.get(1)[0];
    const edgeIntoNode3Original = graph.adjacency.get(2)[0].weight;

    updateNodeWeights(graph, 'S2', { ...signalAtNode2, status: 'blocked' }, OFF_PEAK);

    expect(edgeIntoNode2.weight).toBe(Infinity); // the changed node's incoming edge
    expect(graph.adjacency.get(2)[0].weight).toBe(edgeIntoNode3Original); // untouched
  });
});

describe('isSignalRoutable', () => {
  it('treats normal/altered/overridden as routable and blocked/offline as not', () => {
    expect(isSignalRoutable(makeSignal({ status: 'normal' }))).toBe(true);
    expect(isSignalRoutable(makeSignal({ status: 'altered' }))).toBe(true);
    expect(isSignalRoutable(makeSignal({ status: 'overridden' }))).toBe(true);
    expect(isSignalRoutable(makeSignal({ status: 'blocked' }))).toBe(false);
    expect(isSignalRoutable(makeSignal({ status: 'offline' }))).toBe(false);
    expect(isSignalRoutable(undefined)).toBe(true); // no signal at this node = an ordinary road node
  });
});

describe('dijkstra', () => {
  it('finds the optimal path and cost on the diamond graph', () => {
    const graph = buildDiamondGraph();
    const result = dijkstra(graph, 1, 4);
    expect(result.path).toEqual([1, 2, 4]);
    expect(result.cost).toBe(2);
  });

  it('returns null when no path exists', () => {
    const graph = buildDiamondGraph();
    const result = dijkstra(graph, 4, 1); // no reverse edges in this directed graph
    expect(result).toBeNull();
  });

  it('respects excludedNodes/excludedEdges options (used by Yen\'s spur search)', () => {
    const graph = buildDiamondGraph();
    const result = dijkstra(graph, 1, 4, { excludedNodes: new Set([2]) });
    expect(result.path).toEqual([1, 3, 4]);
    expect(result.cost).toBe(3);
  });
});

describe('aStar', () => {
  it('matches Dijkstra\'s optimal path/cost (heuristic is admissible with colocated nodes)', () => {
    const graph = buildDiamondGraph();
    const result = aStar(graph, 1, 4);
    expect(result.path).toEqual([1, 2, 4]);
    expect(result.cost).toBe(2);
  });
});

describe('selectAlgorithm', () => {
  it('picks dijkstra for small graphs and aStar for large ones', () => {
    expect(selectAlgorithm({ nodeCount: 5 })).toBe(dijkstra);
    expect(selectAlgorithm({ nodeCount: 3000 })).toBe(aStar);
  });
});

describe('yensKShortestPaths', () => {
  it('returns the 3 ranked, distinct paths in non-decreasing cost order', () => {
    const graph = buildDiamondGraph();
    const results = yensKShortestPaths(graph, 1, 4, 3);

    expect(results).toHaveLength(3);
    expect(results.map((r) => r.path)).toEqual([
      [1, 2, 4],
      [1, 3, 4],
      [1, 4],
    ]);
    expect(results.map((r) => r.cost)).toEqual([2, 3, 5]);

    // costs must be non-decreasing and every path must be unique
    for (let i = 1; i < results.length; i++) {
      expect(results[i].cost).toBeGreaterThanOrEqual(results[i - 1].cost);
    }
    const serialized = results.map((r) => r.path.join(','));
    expect(new Set(serialized).size).toBe(serialized.length);
  });

  it('returns fewer than K paths when the graph does not have that many distinct routes', () => {
    const graph = {
      nodes: new Map([
        [1, { lat: 0, lng: 0 }],
        [2, { lat: 0, lng: 0 }],
      ]),
      adjacency: new Map([[1, [{ to: 2, distanceMeters: 0, weight: 1 }]], [2, []]]),
      incomingEdges: new Map(),
      signalByOsmNode: new Map(),
      snapMap: new Map(),
      nodeCount: 2,
    };
    const results = yensKShortestPaths(graph, 1, 2, 3);
    expect(results).toHaveLength(1);
    expect(results[0].path).toEqual([1, 2]);
  });
});

describe('recalculateRoutes + pathToCoordinates', () => {
  it('produces ranked routes with real coordinates from node positions', () => {
    const graph = buildDiamondGraph();
    graph.nodes.set(1, { lat: 13.0, lng: 80.2 });
    graph.nodes.set(2, { lat: 13.01, lng: 80.21 });
    graph.nodes.set(4, { lat: 13.02, lng: 80.22 });

    const [result] = recalculateRoutes(graph, [{ id: 'pair1', sourceOsmId: 1, destOsmId: 4 }]);
    expect(result.routes).toHaveLength(3);
    expect(result.routes[0].rank).toBe(0);
    expect(result.routes[0].etaSeconds).toBe(2);
    expect(result.routes[0].coordinates).toEqual(
      pathToCoordinates(graph, [1, 2, 4])
    );
    expect(result.routes[0].coordinates[0]).toEqual([80.2, 13.0]); // [lng, lat] order for map rendering
  });
});
