import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppBar,
  Avatar,
  Toolbar,
  Typography,
  Box,
  Stack,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Skeleton,
  Tooltip,
  Button,
  Alert,
} from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LogoutIcon from '@mui/icons-material/Logout';
import AddLocationIcon from '@mui/icons-material/AddLocation';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import TrafficMap from '../components/TrafficMap';
import SignalListSidebar from '../components/ControlPanel/SignalListSidebar';
import SignalDetailDrawer from '../components/ControlPanel/SignalDetailDrawer';
import EventModeControl from '../components/ControlPanel/EventModeControl';
import RoutePanel from '../components/ControlPanel/RoutePanel';
import ScheduleTimeline from '../components/ControlPanel/ScheduleTimeline';
import NewSignalDialog from '../components/ControlPanel/NewSignalDialog';
import useSignalsPolling from '../hooks/useSignalsPolling';
import { useNotify } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { buildRoutingGraph, updateNodeWeights, recalculateRoutes } from '../utils/routing';
import BrandMark from '../components/BrandMark';
import { staggerContainer, staggerItem } from '../utils/motionVariants';

// A route is computed between the road nodes the two signals snapped to, which
// can sit up to ~300 m from where the signal is drawn (hand-placed signals are
// the worst). Extend each route's line to the signals' real positions so it
// visibly starts and ends at the markers instead of stopping short of them.
const withSignalEndpoints = (routes, signalList, sourceSignalId, destSignalId) => {
  const positionOf = (id) => signalList.find((s) => s.signalId === id)?.location?.coordinates;
  const start = positionOf(sourceSignalId);
  const end = positionOf(destSignalId);
  return routes.map((route) => ({
    ...route,
    coordinates: [...(start ? [start] : []), ...route.coordinates, ...(end ? [end] : [])],
  }));
};

// Small status dot used as the leading icon of the header stat chips
const StatDot = ({ color, className }) => (
  <Box
    component="span"
    className={className}
    sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0, '&&': { ml: '10px', mr: '-3px' } }}
  />
);

const CommandCenter = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const { user, logout } = useAuth();
  const { signals, loading, error, lastSynced, changedSignalIds, refresh, patchSignal, patchSignals, addSignal } =
    useSignalsPolling(10000);

  const [occasions, setOccasions] = useState([]);
  const [now, setNow] = useState(new Date());

  const [selectedSignalId, setSelectedSignalId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [eventModeActive, setEventModeActive] = useState(false);
  const [eventModeSelection, setEventModeSelection] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);

  const [addSignalActive, setAddSignalActive] = useState(false);
  const [newSignalDialogOpen, setNewSignalDialogOpen] = useState(false);
  const [pendingSignalLocation, setPendingSignalLocation] = useState(null);
  const isAdmin = user?.role === 'admin';

  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightTab, setRightTab] = useState(0);

  const [graphStatus, setGraphStatus] = useState('idle');
  const [currentRoutes, setCurrentRoutes] = useState([]);
  const graphRef = useRef(null);
  const activePairRef = useRef(null);
  const currentRoutesRef = useRef([]);
  const affectedTimeoutRef = useRef(null);

  useEffect(() => {
    currentRoutesRef.current = currentRoutes;
  }, [currentRoutes]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchOccasions = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/occasions');
      setOccasions(data);
    } catch {
      // non-fatal; schedule panel just stays empty until the next refresh
    }
  }, []);

  useEffect(() => {
    fetchOccasions();
  }, [fetchOccasions]);

  const ensureGraph = useCallback(async () => {
    if (graphRef.current) return graphRef.current;
    setGraphStatus('loading');
    try {
      const graph = await buildRoutingGraph(signals);
      graphRef.current = graph;
      setGraphStatus('ready');
      return graph;
    } catch (err) {
      setGraphStatus('error');
      notify(`Routing engine unavailable: ${err.message}`, 'warning');
      return null;
    }
  }, [signals, notify]);

  // Recomputes the active route and, when told which signal(s) just changed,
  // diffs against the previous ETAs to flag which ranked routes were actually
  // affected — either the changed signal sits on that route's path, or its
  // ETA moved. Drives a transient map highlight plus a summary toast.
  const recomputeActiveRoute = useCallback(
    (changedSignalIds = []) => {
      if (!graphRef.current || !activePairRef.current) return;
      const { sourceSignalId, destSignalId, sourceOsmId, destOsmId } = activePairRef.current;
      const [result] = recalculateRoutes(graphRef.current, [{ id: 'active', sourceOsmId, destOsmId }]);
      const newRoutes = result?.routes || [];
      const prevRoutes = currentRoutesRef.current;

      const changedOsmIds = new Set(
        changedSignalIds.map((id) => graphRef.current.snapMap.get(id)).filter((v) => v !== undefined)
      );

      const affectedRanks = new Set();
      newRoutes.forEach((route) => {
        const prev = prevRoutes.find((p) => p.rank === route.rank);
        const etaChanged = prev && Math.abs(prev.etaSeconds - route.etaSeconds) > 0.01;
        const onPath = route.path.some((nodeId) => changedOsmIds.has(nodeId));
        if (etaChanged || onPath) affectedRanks.add(route.rank);
      });

      const routesWithFlags = withSignalEndpoints(newRoutes, signals, sourceSignalId, destSignalId).map((r) => ({
        ...r,
        affected: affectedRanks.has(r.rank),
      }));
      setCurrentRoutes(routesWithFlags);

      if (affectedTimeoutRef.current) {
        clearTimeout(affectedTimeoutRef.current);
        affectedTimeoutRef.current = null;
      }

      if (affectedRanks.size > 0 && changedSignalIds.length > 0) {
        const summary = routesWithFlags
          .filter((r) => affectedRanks.has(r.rank))
          .map((r) => {
            const prev = prevRoutes.find((p) => p.rank === r.rank);
            const prevEta = prev ? Math.round(prev.etaSeconds) : null;
            const newEta = Math.round(r.etaSeconds);
            const delta = prevEta !== null ? newEta - prevEta : null;
            const deltaLabel = delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta}s)` : '';
            return `Route ${r.rank + 1} ${prevEta !== null ? `${prevEta}s → ` : ''}${newEta}s${deltaLabel}`;
          })
          .join(', ');
        const changedNames = changedSignalIds
          .map((id) => signals.find((s) => s.signalId === id)?.intersectionName)
          .filter(Boolean)
          .join(', ');
        notify(`${summary}${changedNames ? ` after update at ${changedNames}` : ''}`, 'info');

        affectedTimeoutRef.current = setTimeout(() => {
          setCurrentRoutes((rs) => rs.map((r) => ({ ...r, affected: false })));
        }, 5000);
      }
    },
    [notify, signals]
  );

  const handleRequestRoute = useCallback(
    async (sourceSignalId, destSignalId) => {
      const graph = await ensureGraph();
      if (!graph) return;
      const sourceOsmId = graph.snapMap.get(sourceSignalId);
      const destOsmId = graph.snapMap.get(destSignalId);
      if (sourceOsmId === undefined || destOsmId === undefined) {
        notify('Could not snap one of the selected signals to the road network', 'error');
        return;
      }
      activePairRef.current = { sourceSignalId, destSignalId, sourceOsmId, destOsmId };
      const [result] = recalculateRoutes(graph, [{ id: 'active', sourceOsmId, destOsmId }]);
      setCurrentRoutes(withSignalEndpoints(result?.routes || [], signals, sourceSignalId, destSignalId));
      if (!result || result.routes.length === 0) {
        notify('No route found between the selected signals', 'warning');
      }
    },
    [ensureGraph, notify, signals]
  );

  const handleClearRoute = useCallback(() => {
    activePairRef.current = null;
    setCurrentRoutes([]);
  }, []);

  // React to live signal changes detected by polling — patch the graph in
  // place (no rebuild) and refresh any active route.
  useEffect(() => {
    if (!graphRef.current || changedSignalIds.length === 0) return;
    changedSignalIds.forEach((id) => {
      const sig = signals.find((s) => s.signalId === id);
      if (sig) updateNodeWeights(graphRef.current, id, sig);
    });
    recomputeActiveRoute(changedSignalIds);
  }, [changedSignalIds, signals, recomputeActiveRoute]);

  const handleSignalUpdated = useCallback(
    (updated) => {
      patchSignal(updated);
      if (graphRef.current) {
        updateNodeWeights(graphRef.current, updated.signalId, updated);
        recomputeActiveRoute([updated.signalId]);
      }
    },
    [patchSignal, recomputeActiveRoute]
  );

  const handleEventModeApplied = useCallback(
    (updatedList) => {
      patchSignals(updatedList);
      if (graphRef.current) {
        updatedList.forEach((s) => updateNodeWeights(graphRef.current, s.signalId, s));
        recomputeActiveRoute(updatedList.map((s) => s.signalId));
      }
      setEventModeSelection([]);
    },
    [patchSignals, recomputeActiveRoute]
  );

  const handleSignalSelect = useCallback(
    (signalId) => {
      if (eventModeActive) {
        setEventModeSelection((sel) => (sel.includes(signalId) ? sel.filter((s) => s !== signalId) : [...sel, signalId]));
      } else {
        setSelectedSignalId(signalId);
        setDrawerOpen(true);
      }
    },
    [eventModeActive]
  );

  const toggleEventMode = useCallback(() => {
    setAddSignalActive(false); // the two placement/selection modes are mutually exclusive
    setEventModeActive((a) => {
      if (a) setEventModeSelection([]); // leaving selection mode — drop any un-submitted picks
      return !a;
    });
  }, []);

  const toggleAddSignalMode = useCallback(() => {
    setEventModeActive(false);
    setEventModeSelection([]);
    setAddSignalActive((a) => !a);
  }, []);

  const handleMapClick = useCallback(
    (lngLat) => {
      if (!addSignalActive) return;
      setPendingSignalLocation(lngLat);
      setNewSignalDialogOpen(true);
      setAddSignalActive(false);
    },
    [addSignalActive]
  );

  const handleSignalCreated = useCallback(
    (newSignal) => {
      addSignal(newSignal);
    },
    [addSignal]
  );

  // Keyboard shortcuts: R = refresh, E = event mode, S = new schedule
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') {
        refresh();
        fetchOccasions();
      } else if (e.key === 'e' || e.key === 'E') {
        toggleEventMode();
      } else if (e.key === 's' || e.key === 'S') {
        navigate('/occasions/create');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [refresh, fetchOccasions, navigate, toggleEventMode]);

  const selectedSignal = signals.find((s) => s.signalId === selectedSignalId) || null;
  const mapRoutes = currentRoutes.map((r) => ({
    id: `route-rank-${r.rank}`,
    coordinates: r.coordinates,
    eta: r.etaSeconds,
    affected: r.affected,
  }));

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar variant="dense" sx={{ minHeight: 54 }}>
          <Box sx={{ flexGrow: 1 }}>
            <BrandMark title="Traffic Signal Command Center" />
          </Box>
          <Stack direction="row" spacing={2.5} alignItems="center">
            {user && (
              <Chip
                variant="outlined"
                size="small"
                avatar={<Avatar sx={{ fontWeight: 800 }}>{user.username?.[0]?.toUpperCase()}</Avatar>}
                label={`${user.username} (${user.role})`}
              />
            )}
            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {now.toLocaleTimeString()}
            </Typography>
            <Tooltip title={error ? `Disconnected: ${error}` : 'Connected'}>
              <CircleIcon sx={{ fontSize: 12, color: error ? 'error.main' : 'success.main' }} />
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              {lastSynced ? `Synced ${lastSynced.toLocaleTimeString()}` : 'Syncing…'}
            </Typography>
            <Button size="small" color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <motion.div variants={staggerItem}>
            <Chip
              icon={<StatDot color="success.main" />}
              label={`${signals.length} signals`}
              size="small"
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.07)' }}
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <Chip
              icon={<StatDot color="warning.main" />}
              label={`${signals.filter((s) => s.status === 'altered').length} altered/scheduled`}
              size="small"
              color="warning"
              variant="outlined"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <Chip
              icon={<StatDot color="error.main" />}
              label={`${signals.filter((s) => s.status === 'overridden' || s.status === 'blocked').length} manual control`}
              size="small"
              color="error"
              variant="outlined"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <Chip
              icon={<StatDot color="primary.main" />}
              label={`${occasions.filter((o) => o.isActive).length} active schedules`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </motion.div>
        </motion.div>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {loading && signals.length === 0 ? (
          <Box sx={{ width: 300, p: 2 }}>
            <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={56} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : (
          <SignalListSidebar
            signals={signals}
            selectedSignalId={selectedSignalId}
            onSelect={handleSignalSelect}
            eventModeSelection={eventModeSelection}
          />
        )}

        <Box sx={{ flex: 1, position: 'relative' }}>
          {loading && signals.length === 0 ? (
            <Skeleton variant="rectangular" width="100%" height="100%" />
          ) : (
            <TrafficMap
              signals={signals}
              selectedSignalId={selectedSignalId}
              onSignalSelect={handleSignalSelect}
              onMapClick={handleMapClick}
              routes={mapRoutes}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'flex-start', borderLeft: 1, borderColor: 'divider' }}>
          <IconButton size="small" onClick={() => setRightPanelOpen((o) => !o)} sx={{ mt: 1 }}>
            {rightPanelOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
          {rightPanelOpen && (
            <Box sx={{ width: 340, height: '100%', overflowY: 'auto' }}>
              {isAdmin && (
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1">Add Signal</Typography>
                    <Button
                      size="small"
                      variant={addSignalActive ? 'contained' : 'outlined'}
                      startIcon={<AddLocationIcon />}
                      onClick={toggleAddSignalMode}
                    >
                      {addSignalActive ? 'Click Map…' : 'Start'}
                    </Button>
                  </Stack>
                  {addSignalActive && (
                    <Alert severity="info" sx={{ mt: 1, fontSize: 12 }}>
                      Click a location on the map to place the new signal.
                    </Alert>
                  )}
                </Box>
              )}
              <EventModeControl
                active={eventModeActive}
                onToggleActive={toggleEventMode}
                selection={eventModeSelection}
                onRemoveFromSelection={(id) => setEventModeSelection((sel) => sel.filter((s) => s !== id))}
                onApplied={handleEventModeApplied}
                blockedIds={blockedIds}
                onBlockedIdsChange={setBlockedIds}
              />
              <Tabs value={rightTab} onChange={(_, v) => setRightTab(v)} variant="fullWidth">
                <Tab label="Routes" />
                <Tab label="Schedule" />
              </Tabs>
              {rightTab === 0 && (
                <RoutePanel
                  signals={signals}
                  graphStatus={graphStatus}
                  onRequestRoute={handleRequestRoute}
                  activeRoutes={currentRoutes}
                  onClearRoute={handleClearRoute}
                />
              )}
              {rightTab === 1 && <ScheduleTimeline occasions={occasions} />}
            </Box>
          )}
        </Box>
      </Box>

      <SignalDetailDrawer
        signal={selectedSignal}
        open={drawerOpen && !eventModeActive}
        onClose={() => setDrawerOpen(false)}
        onSignalUpdated={handleSignalUpdated}
      />

      {isAdmin && (
        <NewSignalDialog
          open={newSignalDialogOpen}
          initialLocation={pendingSignalLocation}
          onClose={() => setNewSignalDialogOpen(false)}
          onCreated={handleSignalCreated}
        />
      )}
    </Box>
  );
};

export default CommandCenter;
