import { describe, it, expect } from 'vitest';
import { snapSignalsToRoadNetwork, MAX_SNAP_DISTANCE_METERS } from './osmRoads';

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
});
