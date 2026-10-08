const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { overlaps } = require('../utils/bbox');
const roadsRouter = require('../routes/roads');

// Same box as routes/roads.js SNAPSHOT_BBOX: [minLat, minLng, maxLat, maxLng]
const SNAPSHOT = [12.84, 80.12, 13.15, 80.31];

test('overlaps: box fully inside', () => {
  assert.equal(overlaps([12.9, 80.2, 13.0, 80.25], SNAPSHOT), true);
});

test('overlaps: box that extends past the edge still overlaps', () => {
  assert.equal(overlaps([12.848, 80.139, 13.1938, 80.3265], SNAPSHOT), true);
});

test('overlaps: box that contains the whole snapshot', () => {
  assert.equal(overlaps([12.0, 79.0, 14.0, 81.0], SNAPSHOT), true);
});

test('overlaps: disjoint boxes', () => {
  assert.equal(overlaps([28.4, 77.0, 28.9, 77.4], SNAPSHOT), false); // Delhi
  assert.equal(overlaps([13.2, 80.0, 13.4, 80.2], SNAPSHOT), false); // just north of the snapshot
});

async function withServer(fn) {
  const app = express();
  app.use('/api/roads', roadsRouter);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET /api/roads: a box that overhangs the snapshot is served from it, not live Overpass', async () => {
  await withServer(async (base) => {
    // The exact padded box the client sent for the full Chennai OSM signal set
    const res = await fetch(`${base}/api/roads?bbox=12.848,80.139,13.1938,80.3265`);
    assert.equal(res.status, 200);
    // Only the snapshot branch sets this; a live Overpass response would not
    assert.equal(res.headers.get('cache-control'), 'public, max-age=86400');
    const data = await res.json();
    assert.ok(Array.isArray(data.elements) && data.elements.length > 0);
  });
});

test('GET /api/roads: bbox is required', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/roads`);
    assert.equal(res.status, 400);
    await res.arrayBuffer();
  });
});
