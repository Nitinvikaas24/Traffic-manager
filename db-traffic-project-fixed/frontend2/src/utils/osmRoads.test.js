import { describe, it, expect } from 'vitest';
import {
  snapSignalsToRoadNetwork,
  MAX_SNAP_DISTANCE_METERS,
  parseOverpassResponse,
  largestStronglyConnectedComponent,
} from './osmRoads';
import { haversineDistance } from './geo';

const signalAt = (signalId, lat, lng) => ({ signalId, location: { coordinates: [lng, lat] } });

// Two road nodes in central Chennai, ~1 km apart
const roadNetwork = {
  nodes: new Map([
    [1, { lat: 13.0827, lng: 80.2707 }],
    [2, { lat: 13.0917, lng: 80.2707 }],
  ]),
  adjacency: new Map(),
};

describe('snapSignalsToRoadNetwork', () => {
  it('snaps a signal sitting on a road node to that node', () => {
    const snapMap = snapSignalsToRoadNetwork([signalAt('A', 13.0827, 80.2707)], roadNetwork);
    expect(snapMap.get('A')).toBe(1);
  });

  it('snaps a nearby signal to the closer of two nodes', () => {
    const snapMap = snapSignalsToRoadNetwork([signalAt('B', 13.0910, 80.2708)], roadNetwork);
    expect(snapMap.get('B')).toBe(2);
  });

  it('leaves out a signal with no road node within the snap limit', () => {
    // ~2 km north of the nearest node: past the edge of the road data
    const snapMap = snapSignalsToRoadNetwork([signalAt('FAR', 13.1100, 80.2707)], roadNetwork);
    expect(snapMap.has('FAR')).toBe(false);
  });

  it('still snaps the signals that are in range when others are not', () => {
    const snapMap = snapSignalsToRoadNetwork(
      [signalAt('IN', 13.0827, 80.2707), signalAt('OUT', 13.1100, 80.2707)],
      roadNetwork,
    );
    expect([...snapMap.keys()]).toEqual(['IN']);
  });

  it('uses a snap limit large enough for hand-placed signals', () => {
    expect(MAX_SNAP_DISTANCE_METERS).toBeGreaterThanOrEqual(100);
  });

  it('only snaps to nodes in the main component, even when a stranded node is closer', () => {
    const network = {
      nodes: new Map([
        [1, { lat: 13.0827, lng: 80.2707 }], // main network
        [99, { lat: 13.0829, lng: 80.2707 }], // ~22 m away but stranded in a dead-end pocket
      ]),
      adjacency: new Map(),
      mainComponent: new Set([1]),
    };
    expect(snapSignalsToRoadNetwork([signalAt('S', 13.0829, 80.2707)], network).get('S')).toBe(1);
  });

  it('agrees with a brute-force nearest-node search, including across grid-cell borders', () => {
    // Nodes scattered over ~2 km, signals placed near cell borders (cells are 0.004 deg)
    const nodes = new Map();
    for (let i = 0; i < 400; i++) {
      nodes.set(i, { lat: 13.0 + ((i * 37) % 200) * 0.0001, lng: 80.2 + ((i * 91) % 200) * 0.0001 });
    }
    const network = { nodes, adjacency: new Map() };
    const signals = [];
    for (let k = 0; k < 40; k++) signals.push(signalAt(`S${k}`, 12.9995 + k * 0.0004, 80.1995 + ((k * 7) % 40) * 0.0004));

    const snapMap = snapSignalsToRoadNetwork(signals, network);
    signals.forEach((signal) => {
      const target = { lat: signal.location.coordinates[1], lng: signal.location.coordinates[0] };
      let bestId = null;
      let bestDist = Infinity;
      nodes.forEach((coord, id) => {
        const d = haversineDistance(target, coord);
        if (d < bestDist) {
          bestDist = d;
          bestId = id;
        }
      });
      if (bestDist <= MAX_SNAP_DISTANCE_METERS) expect(snapMap.get(signal.signalId)).toBe(bestId);
      else expect(snapMap.has(signal.signalId)).toBe(false);
    });
  });
});

describe('largestStronglyConnectedComponent', () => {
  const edges = (...pairs) => {
    const adjacency = new Map();
    pairs.forEach(([from, to]) => {
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from).push({ to });
    });
    return adjacency;
  };

  it('keeps the biggest two-way cluster and drops a one-way spur', () => {
    // 1<->2<->3 form a cycle-connected cluster; 3->4 is a one-way exit to a dead end
    const adjacency = edges([1, 2], [2, 1], [2, 3], [3, 2], [3, 4]);
    expect([...largestStronglyConnectedComponent(adjacency, [1, 2, 3, 4])].sort()).toEqual([1, 2, 3]);
  });

  it('picks the larger of two separate clusters', () => {
    const adjacency = edges([1, 2], [2, 1], [10, 11], [11, 12], [12, 10], [12, 13], [13, 12]);
    expect([...largestStronglyConnectedComponent(adjacency, [1, 2, 10, 11, 12, 13])].sort((a, b) => a - b)).toEqual([10, 11, 12, 13]);
  });

  it('handles a long chain without overflowing the stack', () => {
    const pairs = [];
    const ids = [];
    for (let i = 0; i < 50000; i++) {
      ids.push(i);
      pairs.push([i, i + 1], [i + 1, i]);
    }
    ids.push(50000);
    expect(largestStronglyConnectedComponent(edges(...pairs), ids).size).toBe(50001);
  });
});

describe('parseOverpassResponse', () => {
  const node = (id, lat, lon) => ({ type: 'node', id, lat, lon });
  const way = (id, nodes, tags) => ({ type: 'way', id, nodes, tags });

  it('gives faster road classes higher edge speeds', () => {
    const { adjacency } = parseOverpassResponse({
      elements: [
        node(1, 13, 80.2), node(2, 13, 80.201), node(3, 13, 80.202),
        way(10, [1, 2], { highway: 'primary' }),
        way(11, [2, 3], { highway: 'residential' }),
      ],
    });
    const primary = adjacency.get(1)[0].speedMps;
    const residential = adjacency.get(2).find((e) => e.to === 3).speedMps;
    expect(primary).toBeGreaterThan(residential);
  });

  it('honours oneway=yes and oneway=-1', () => {
    const { adjacency } = parseOverpassResponse({
      elements: [
        node(1, 13, 80.2), node(2, 13, 80.201), node(3, 13, 80.202),
        way(10, [1, 2], { highway: 'primary', oneway: 'yes' }),
        way(11, [2, 3], { highway: 'primary', oneway: '-1' }),
      ],
    });
    expect(adjacency.get(1).map((e) => e.to)).toEqual([2]); // forward only
    expect(adjacency.get(2)?.map((e) => e.to) ?? []).not.toContain(1); // can't go back 2 -> 1
    expect(adjacency.get(3).map((e) => e.to)).toEqual([2]); // -1 flips: only 3 -> 2
    expect(adjacency.get(2)?.map((e) => e.to) ?? []).not.toContain(3);
  });

  it('skips non-drivable ways and reports the main component', () => {
    const { adjacency, mainComponent } = parseOverpassResponse({
      elements: [
        node(1, 13, 80.2), node(2, 13, 80.201), node(3, 13, 80.202), node(4, 13, 80.5),
        way(10, [1, 2], { highway: 'residential' }),
        way(11, [2, 3], { highway: 'footway' }), // not drivable
      ],
    });
    expect(adjacency.has(3)).toBe(false);
    expect([...mainComponent].sort()).toEqual([1, 2]);
  });
});
