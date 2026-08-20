const express = require('express');
const router = express.Router();

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour, to respect Overpass rate limits
// overpass-api.de's Apache config 406s Node's default fetch User-Agent
// ("node") — Overpass's own usage policy also asks for an identifying UA.
const OVERPASS_USER_AGENT = 'traffic-signal-management-app/1.0';

// In-memory cache: bbox key -> { data, fetchedAt }
const cache = new Map();

// Round bbox coordinates so nearby requests share a cache entry
const roundBbox = (bbox) => bbox.map((n) => Math.round(n * 1000) / 1000).join(',');

// GET /api/roads?bbox=minLat,minLng,maxLat,maxLng
// Proxies an Overpass query for the drivable road network in the given bounding box.
router.get('/', async (req, res) => {
  try {
    const { bbox } = req.query;
    if (!bbox) {
      return res.status(400).json({ message: 'bbox query param is required (minLat,minLng,maxLat,maxLng)' });
    }

    const parts = bbox.split(',').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
      return res.status(400).json({ message: 'bbox must be 4 comma-separated numbers: minLat,minLng,maxLat,maxLng' });
    }

    const cacheKey = roundBbox(parts);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const [minLat, minLng, maxLat, maxLng] = parts;
    const query = `
      [out:json][timeout:25];
      (
        way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](${minLat},${minLng},${maxLat},${maxLng});
      );
      (._;>;);
      out body;
    `;

    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'User-Agent': OVERPASS_USER_AGENT },
      body: query,
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ message: 'Overpass API request failed', detail: text.slice(0, 500) });
    }

    const data = await response.json();
    cache.set(cacheKey, { data, fetchedAt: Date.now() });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
