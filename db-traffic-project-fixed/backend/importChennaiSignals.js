const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Signal = require('./models/Signal');

dotenv.config();

// Public Overpass instances, tried in order — any single one is regularly
// throttled or down, so a lone endpoint made the import (and an empty map) flaky.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const OVERPASS_TIMEOUT_MS = 90 * 1000;

// Copy of the same query's result, so the import still works offline or when
// every Overpass instance is failing. Refresh by re-running the query above.
const BUNDLED_SIGNALS_PATH = path.join(__dirname, 'data', 'chennai-signals.json');

// Scoped to Chennai's OSM administrative boundary. This pulls every
// traffic-signal node OpenStreetMap contributors have currently mapped for
// the city — the best real, geolocated proxy available, but it is
// community-mapped data, not a government-exhaustive registry. Coverage
// depends entirely on how completely OSM has been mapped for Chennai.
const OVERPASS_QUERY = `
  [out:json][timeout:60];
  area["name"="Chennai"]["boundary"="administrative"]->.searchArea;
  node(area.searchArea)["highway"="traffic_signals"];
  out body;
`;

// OSM has no phase-timing data for signals, so every imported signal gets
// this same synthetic default plan — identical in shape to the original
// hand-seeded demo signals, clearly a placeholder pending real data.
const DEFAULT_TIMING = {
  cycleLength: 120,
  phases: [
    { phaseId: 'MainRd_Green', duration: 50 },
    { phaseId: 'MainRd_Amber', duration: 5 },
    { phaseId: 'SideRd_Green', duration: 35 },
    { phaseId: 'SideRd_Amber', duration: 5 },
    { phaseId: 'All_Red', duration: 25 },
  ],
};

async function fetchLiveSignalNodes() {
  const failures = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        // overpass-api.de's Apache config 406s Node's default fetch User-Agent
        // ("node") — Overpass's own usage policy also asks for an identifying UA.
        headers: { 'Content-Type': 'text/plain', 'User-Agent': 'traffic-signal-management-app/1.0' },
        body: OVERPASS_QUERY,
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
      });
      if (!response.ok) {
        failures.push(`${endpoint}: HTTP ${response.status}`);
        continue;
      }
      // An overloaded instance can answer 200 with an XML error page, so parse defensively
      const data = await response.json();
      return (data.elements || []).filter((el) => el.type === 'node');
    } catch (err) {
      failures.push(`${endpoint}: ${err.message}`);
    }
  }
  throw new Error(`Overpass failed on every endpoint:\n  ${failures.join('\n  ')}`);
}

function loadBundledSignalNodes() {
  const { nodes } = JSON.parse(fs.readFileSync(BUNDLED_SIGNALS_PATH, 'utf8'));
  return nodes.map(({ id, lat, lon, name }) => ({ id, lat, lon, tags: name ? { name } : undefined }));
}

async function fetchChennaiSignalNodes() {
  try {
    return await fetchLiveSignalNodes();
  } catch (err) {
    console.warn(`${err.message}\nFalling back to the bundled copy of the OSM data (backend/data/chennai-signals.json).`);
    return loadBundledSignalNodes();
  }
}

async function importChennaiSignals() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trafficSignals');
  console.log('MongoDB connected successfully');

  console.log('Querying Overpass for Chennai traffic-signal nodes...');
  const nodes = await fetchChennaiSignalNodes();
  console.log(`Got ${nodes.length} traffic-signal nodes mapped in OpenStreetMap for Chennai.`);
  console.log('This reflects OSM community mapping coverage, not a guaranteed-complete registry of every physical signal.');

  let upserted = 0;
  for (const node of nodes) {
    const signalId = `OSM_${node.id}`;
    const intersectionName = node.tags?.name || `Traffic Signal ${node.id}`;

    await Signal.findOneAndUpdate(
      { signalId },
      {
        $setOnInsert: {
          signalId,
          defaultTiming: DEFAULT_TIMING,
          currentTiming: DEFAULT_TIMING,
          status: 'normal',
        },
        $set: {
          intersectionName,
          location: { type: 'Point', coordinates: [node.lon, node.lat] },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
    if (upserted % 50 === 0) console.log(`  ...${upserted}/${nodes.length}`);
  }

  console.log(`Done. ${upserted} Chennai signals upserted (existing officer-edited timing/status on previously-imported signals was left untouched).`);
  await mongoose.disconnect();
}

importChennaiSignals().catch((err) => {
  console.error('Error importing Chennai signals:', err);
  process.exit(1);
});
