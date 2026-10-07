# Traffic Signal Management System

A real-time command-center application for traffic police to monitor, control, and schedule traffic signals across Chennai — built on the MERN stack, with a custom Dijkstra / A* / Yen's K-shortest-paths routing engine that reacts live to signal state, real OpenStreetMap road and signal data, JWT-authenticated role-based access, and a MapLibre GL-powered live map.

**Live demo:** https://traffic-manager-pi.vercel.app

## Try the Demo

Open the live demo and sign in with username `officer1` and password `ChangeMe123!` (also shown on the login page). You're signed in as a demo *officer* (short-lived session; admin-only features such as creating signals are not exposed). Demo data is shared between visitors and may be reset.

## How to Use

1. Open the live demo and click **Enter Live Demo**.
2. **Command Center** (`/`) is the main view: a live map of ~370 real Chennai traffic signals, a searchable signal list, and a right-hand panel for routing and scheduling.
3. **Click any signal** on the map or in the list to open its detail drawer — view/edit its phase timing, force a manual override (with a reason), or review its audit log.
4. **Routing Engine** (right panel, "Routes" tab): pick a source and destination signal, click *Find Routes* — the engine builds a live road graph from OpenStreetMap and returns three ranked routes (fastest/alternate/fallback) with live ETAs. Editing a signal that sits on an active route re-highlights the affected route(s) with the updated ETA.
5. **Event Mode** (`E`): select a cluster of signals on the map and block them in one action (e.g. for a VIP convoy or parade route) — the routing engine reroutes around them automatically.
6. **Schedules** ("Schedule" tab, or `/occasions`): create a recurring signal-timing change (e.g. "reduce green time every weekday 8–10am") — a background scheduler applies and reverts it automatically, no manual intervention needed.
7. **Add Signal** (admin only): click-to-place a new signal directly on the map, or use the "New Signal" button on the `/signals` page.
8. Keyboard shortcuts: `R` refresh, `E` event mode, `S` new schedule.

## Architecture

```
frontend2/   React 18 + Vite + MUI v5 + MapLibre GL + motion — the actual app
backend/     Express + Mongoose (MongoDB) — REST API, JWT auth, routing data proxy, cron scheduler
```

### Backend
- **Auth**: JWT-based login (`backend/routes/auth.js`, `backend/middleware/auth.js`), roles (`officer`/`admin`) enforced per-route. Officer attribution on every mutating action is derived server-side from the authenticated session, never trusted from the client.
- **Data model**: `Signal` (location, default/current phase timing, live status, override state, audit log) and `Occasion` (recurring weekly time-windowed signal timing changes) — see `backend/models/`.
- **Scheduler**: `backend/services/scheduler.js` runs every minute via `node-cron`, auto-applying/reverting `Occasion` rules based on the current day/hour — idempotent, so it self-corrects regardless of prior state.
- **Road data proxy**: `backend/routes/roads.js` proxies OpenStreetMap Overpass API queries (with caching) so the frontend routing engine can build a real road graph.
- **Hardening**: helmet, CORS allowlist, rate limiting (stricter on login), request logging, fail-fast startup on missing config.

### Frontend
- **Routing engine** (`frontend2/src/utils/routing.js`, `osmRoads.js`, `minHeap.js`, `geo.js`): builds a weighted directed graph from real OSM road geometry + live signal state (distance, expected signal wait, congestion heuristic), and implements Dijkstra (binary min-heap), A* (Haversine heuristic), and Yen's K-shortest-paths from scratch — no third-party routing library. Fully unit-tested (`*.test.js`, `npm run test`).
- **Map**: `frontend2/src/components/TrafficMap.jsx` renders signals as a single GPU-rendered MapLibre GL circle layer (not one DOM marker per signal) so it scales to a city's worth of signals, with animated route polylines and live ETA chips.
- **Command Center** (`frontend2/src/layouts/CommandCenter.jsx`): the main dashboard — live polling, routing panel, event mode, schedule timeline, signal detail drawer.

### Data
Real traffic-signal locations for Chennai are pulled from OpenStreetMap (`backend/importChennaiSignals.js`, `npm run import-chennai-signals`) — every `highway=traffic_signals` node currently mapped in OSM for Chennai's administrative boundary. Phase timing is a synthetic default plan (OSM has no real timing data); officers can edit any signal's live timing through the app.

## Running it locally

**Prerequisites**: Node 18+, a MongoDB instance (local or Atlas).

```bash
# Backend
cd backend
cp .env.example .env        # fill in MONGODB_URI and a real JWT_SECRET
npm install
npm run create-users        # seeds admin/officer1 demo accounts
                            # set DEMO_MODE=true in .env to enable the one-click demo endpoint
npm run import-chennai-signals   # optional: seed real Chennai signal data
npm run dev                 # http://localhost:5000

# Frontend (separate terminal)
cd frontend2
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm install
npm run dev                 # http://localhost:5173
```

Run the test suites with `npm test` in either directory.

## Known limitations

- Signal phase timing is synthetic by design (OSM has no real timing data) — a genuine production deployment would integrate with real traffic controller hardware/telemetry.
- The congestion factor in the routing engine is a documented heuristic (status + time-of-day), not live sensor data — there's no such data source available.
- No self-service account registration — accounts are provisioned via `backend/createUsers.js` (standard practice for an internal tool; avoids an open signup surface for a system that can control real infrastructure).
