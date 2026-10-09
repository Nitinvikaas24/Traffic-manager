import { describe, it, expect } from 'vitest';
import {
  buildGraph,
  updateNodeWeights,
  dijkstra,
  aStar,
  findAlternativeRoutes,
  recalculateRoutes,
} from './routing';

// Off-peak (Tuesday 2pm) so the congestion multiplier is 1 and weights are deterministic
const OFF_PEAK = new Date('2025-01-07T14:00:00');
const AVERAGE_SPEED_MPS = 8.33; // must match routing.js's internal default

// Webster uniform delay, d = (C - g)^2 / (2C), for the default plan (C = 120): Main approach
// g = 50 green + 5 amber = 55 s; Side approach g = 35 + 5 = 40 s. Averaged across the two.
const WEBSTER_WAIT_DEFAULT_PLAN = ((120 - 55) ** 2 / 240 + (120 - 40) ** 2 / 240) / 2;

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

// 1 -(1)-> 2 -(1)-> 4 ; 1 -(2)-> 3 -(1)-> 4 ; 1 -(5)-> 4, all nodes colocated
function buildDiamondGraph() {
  const coord = { lat: 0, lng: 0 };
  const nodes = new Map([[1, coord], [2, coord], [3, coord], [4, coord]]);
  const adjacency = new Map([
    [1, [{ to: 2, distanceMeters: 0, weight: 1 }, { to: 3, distanceMeters: 0, weight: 2 }, { to: 4, distanceMeters: 0, weight: 5 }]],
    [2, [{ to: 4, distanceMeters: 0, weight: 1 }]],
    [3, [{ to: 4, distanceMeters: 0, weight: 1 }]],
    [4, []],
  ]);
  return { nodes, adjacency, incomingEdges: new Map(), signalByOsmNode: new Map(), snapMap: new Map(), nodeCount: 4 };
}

const twoNodeNetwork = (edge) => ({
  nodes: new Map([[1, { lat: 0, lng: 0 }], [2, { lat: 0, lng: 0 }]]),
  adjacency: new Map([[1, [edge]]]),
});

describe('road-class speed', () => {
  it('uses the edge speed instead of the default cruising speed', () => {
    const graph = buildGraph([], twoNodeNetwork({ to: 2, distanceMeters: 1000, speedMps: 20 }), new Map(), OFF_PEAK);
    expect(graph.adjacency.get(1)[0].weight).toBeCloseTo(1000 / 20, 6);
  });

  it('keeps the edge speed when a signal update recomputes the weight', () => {
    const signal = makeSignal();
    const graph = buildGraph([signal], twoNodeNetwork({ to: 2, distanceMeters: 1000, speedMps: 20 }), new Map([['S1', 2]]), OFF_PEAK);
    updateNodeWeights(graph, 'S1', { ...signal, status: 'altered' }, OFF_PEAK);
    expect(graph.adjacency.get(1)[0].weight).toBeCloseTo((1000 / 20 + WEBSTER_WAIT_DEFAULT_PLAN) * 1.15, 6);
  });

  it('records the fastest edge speed for the A* heuristic', () => {
    const fast = buildGraph([], twoNodeNetwork({ to: 2, distanceMeters: 1000, speedMps: 16 }), new Map(), OFF_PEAK);
    expect(fast.maxSpeedMps).toBe(16);
    const slow = buildGraph([], twoNodeNetwork({ to: 2, distanceMeters: 1000, speedMps: 3 }), new Map(), OFF_PEAK);
    expect(slow.maxSpeedMps).toBe(AVERAGE_SPEED_MPS); // never below the default, which untagged edges use
  });
});

describe('signal wait (Webster uniform delay)', () => {
  const weightIntoSignal = (signal) =>
    buildGraph([signal], twoNodeNetwork({ to: 2, distanceMeters: 0 }), new Map([['S1', 2]]), OFF_PEAK).adjacency.get(1)[0].weight;

  it('is (C - g)^2 / 2C for a single-approach plan', () => {
    const signal = makeSignal({
      cycleLength: 100,
      phases: [
        { phaseId: 'Main_Green', duration: 40 },
        { phaseId: 'Main_Amber', duration: 5 },
        { phaseId: 'All_Red', duration: 55 },
      ],
    });
    expect(weightIntoSignal(signal)).toBeCloseTo((100 - 45) ** 2 / 200, 6);
  });

  it('is longer for a shorter green', () => {
    const plan = (green) => ({
      cycleLength: 100,
      phases: [
        { phaseId: 'Main_Green', duration: green },
        { phaseId: 'All_Red', duration: 100 - green },
      ],
    });
    expect(weightIntoSignal(makeSignal(plan(20)))).toBeGreaterThan(weightIntoSignal(makeSignal(plan(60))));
  });

  it('falls back to a quarter of the cycle when the plan has no green phases', () => {
    const signal = makeSignal({ cycleLength: 80, phases: [{ phaseId: 'All_Red', duration: 80 }] });
    expect(weightIntoSignal(signal)).toBeCloseTo(20, 6);
  });
});

describe('edge penalties', () => {
  it('steer dijkstra off a penalized road and report the penalized cost', () => {
    const result = dijkstra(buildDiamondGraph(), 1, 4, { edgePenalties: new Map([['1->2', 10]]) });
    expect(result.path).toEqual([1, 3, 4]); // 1-2-4 would now cost 11
    expect(result.cost).toBe(3);
  });

  it('are ignored when empty', () => {
    expect(dijkstra(buildDiamondGraph(), 1, 4, { edgePenalties: new Map() }).path).toEqual([1, 2, 4]);
  });
});

// Deterministic PRNG so the grids below are identical every run
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// size x size two-way street grid, ~330 m between junctions, each road given a random speed from `speeds`
function buildGridGraph(size, speeds, seed = 1) {
  const rand = mulberry32(seed);
  const id = (r, c) => r * size + c;
  const nodes = new Map();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) nodes.set(id(r, c), { lat: 13 + r * 0.003, lng: 80.2 + c * 0.003 });
  }
  const roadNetwork = { nodes, adjacency: new Map() };
  const connect = (a, b) => {
    const speedMps = speeds[Math.floor(rand() * speeds.length)];
    [[a, b], [b, a]].forEach(([from, to]) => {
      if (!roadNetwork.adjacency.has(from)) roadNetwork.adjacency.set(from, []);
      roadNetwork.adjacency.get(from).push({ to, distanceMeters: 330, speedMps });
    });
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (c + 1 < size) connect(id(r, c), id(r, c + 1));
      if (r + 1 < size) connect(id(r, c), id(r + 1, c));
    }
  }
  const graph = buildGraph([], roadNetwork, new Map(), OFF_PEAK);
  graph.nodeCount = nodes.size;
  return { graph, id };
}

const roadSet = (path) => new Set(path.slice(0, -1).map((n, i) => (n < path[i + 1] ? `${n}-${path[i + 1]}` : `${path[i + 1]}-${n}`)));
const overlap = (a, b) => {
  const ra = roadSet(a);
  const rb = roadSet(b);
  let shared = 0;
  ra.forEach((key) => {
    if (rb.has(key)) shared += 1;
  });
  return shared / Math.min(ra.size, rb.size);
};
const realCost = (graph, path) =>
  path.slice(0, -1).reduce((sum, n, i) => sum + graph.adjacency.get(n).find((e) => e.to === path[i + 1]).weight, 0);

describe('A* on a graph with mixed road speeds', () => {
  it('returns the same cost as Dijkstra (heuristic stays admissible)', () => {
    const { graph, id } = buildGridGraph(8, [3, 6, 11, 16.6]);
    [[id(0, 0), id(7, 7)], [id(0, 7), id(7, 0)], [id(3, 1), id(5, 6)], [id(7, 3), id(0, 4)]].forEach(([s, d]) => {
      expect(aStar(graph, s, d).cost).toBeCloseTo(dijkstra(graph, s, d).cost, 6);
    });
  });
});

describe('findAlternativeRoutes', () => {
  it('returns distinct routes: no two share more than 70% of their length', () => {
    const { graph, id } = buildGridGraph(8, [11]); // uniform grid: dozens of near-tied, corner-swapped paths
    const routes = findAlternativeRoutes(graph, id(0, 0), id(7, 7), 3);
    expect(routes.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < routes.length; i++) {
      for (let j = i + 1; j < routes.length; j++) {
        expect(overlap(routes[i].path, routes[j].path)).toBeLessThanOrEqual(0.7);
      }
    }
  });

  it('starts with the true fastest route and is sorted by real travel time', () => {
    const { graph, id } = buildGridGraph(8, [4, 8, 14], 7);
    const routes = findAlternativeRoutes(graph, id(0, 0), id(7, 6), 3);
    expect(routes[0].cost).toBeCloseTo(dijkstra(graph, id(0, 0), id(7, 6)).cost, 6);
    routes.forEach((r) => expect(r.cost).toBeCloseTo(realCost(graph, r.path), 6)); // never the penalized cost
    for (let i = 1; i < routes.length; i++) expect(routes[i].cost).toBeGreaterThanOrEqual(routes[i - 1].cost);
  });

  it('keeps alternatives within 1.6x of the fastest route', () => {
    const { graph, id } = buildGridGraph(8, [4, 8, 14], 11);
    const routes = findAlternativeRoutes(graph, id(0, 0), id(7, 7), 3);
    routes.forEach((r) => expect(r.cost).toBeLessThanOrEqual(routes[0].cost * 1.6 + 1e-9));
  });

  it('returns a single route when the only other road is far slower', () => {
    const graph = buildDiamondGraph();
    graph.adjacency.set(1, [{ to: 2, distanceMeters: 0, weight: 1 }, { to: 4, distanceMeters: 0, weight: 5 }]); // best 2 vs 5
    expect(findAlternativeRoutes(graph, 1, 4, 3, dijkstra)).toHaveLength(1);
  });

  it('returns [] when the destination is unreachable', () => {
    const graph = buildDiamondGraph();
    [1, 2, 3, 4].forEach((n) => graph.adjacency.set(n, []));
    expect(findAlternativeRoutes(graph, 1, 4, 3, dijkstra)).toEqual([]);
  });
});

describe('route stats', () => {
  it('reports distance, signal count and combined signal delay', () => {
    const roadNetwork = {
      nodes: new Map([[1, { lat: 0, lng: 0 }], [2, { lat: 0, lng: 0 }], [3, { lat: 0, lng: 0 }]]),
      adjacency: new Map([
        [1, [{ to: 2, distanceMeters: 400 }]],
        [2, [{ to: 3, distanceMeters: 600 }]],
      ]),
    };
    const graph = buildGraph([makeSignal()], roadNetwork, new Map([['S1', 2]]), OFF_PEAK);
    const [result] = recalculateRoutes(graph, [{ id: 'p', sourceOsmId: 1, destOsmId: 3 }]);
    const [route] = result.routes;
    expect(route.distanceMeters).toBe(1000);
    expect(route.signalCount).toBe(1);
    expect(route.signalDelaySeconds).toBeCloseTo(WEBSTER_WAIT_DEFAULT_PLAN, 6);
  });
});
