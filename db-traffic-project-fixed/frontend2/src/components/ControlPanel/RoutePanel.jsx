import React, { useState } from 'react';
import { Box, Typography, MenuItem, TextField, Button, Stack, CircularProgress, Alert } from '@mui/material';
import { ROUTE_COLORS } from '../routeColors';

const ROUTE_LABELS = ['Fastest', 'Alternate', 'Fallback'];

const formatDuration = (seconds) => {
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
};
const formatDistance = (meters) => (meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`);

export default function RoutePanel({ signals, graphStatus, onRequestRoute, activeRoutes, onClearRoute }) {
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');

  const handleFindRoutes = () => {
    if (sourceId && destId && sourceId !== destId) {
      onRequestRoute(sourceId, destId);
    }
  };

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle1">Routing Engine</Typography>

      {graphStatus === 'loading' && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Building road graph from OpenStreetMap…
          </Typography>
        </Stack>
      )}
      {graphStatus === 'error' && (
        <Alert severity="warning" sx={{ fontSize: 12 }}>
          Road network unavailable — routing is temporarily offline.
        </Alert>
      )}

      <TextField select size="small" label="From" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
        {signals.map((s) => (
          <MenuItem key={s.signalId} value={s.signalId}>
            {s.intersectionName}
          </MenuItem>
        ))}
      </TextField>
      <TextField select size="small" label="To" value={destId} onChange={(e) => setDestId(e.target.value)}>
        {signals.map((s) => (
          <MenuItem key={s.signalId} value={s.signalId}>
            {s.intersectionName}
          </MenuItem>
        ))}
      </TextField>
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          onClick={handleFindRoutes}
          disabled={graphStatus === 'loading' || !sourceId || !destId || sourceId === destId}
        >
          Find Routes
        </Button>
        <Button variant="text" onClick={onClearRoute} disabled={!activeRoutes.length}>
          Clear
        </Button>
      </Stack>

      <Stack spacing={1}>
        {activeRoutes.map((route) => {
          const color = ROUTE_COLORS[route.rank] || ROUTE_COLORS[2];
          const behindFastest = route.etaSeconds - activeRoutes[0].etaSeconds;
          return (
            <Box
              key={route.rank}
              sx={{
                p: 1.5,
                border: 1,
                borderColor: 'divider',
                borderLeft: `4px solid ${color}`,
                borderRadius: 1,
                boxShadow: `inset 10px 0 16px -12px ${color}`, // the route's glow, bleeding into its card
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="subtitle2" sx={{ color }}>
                  {ROUTE_LABELS[route.rank] || `Route ${route.rank + 1}`}
                </Typography>
                <Typography variant="h6" sx={{ lineHeight: 1 }} aria-label="ETA">
                  {formatDuration(route.etaSeconds)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {formatDistance(route.distanceMeters)} · {route.signalCount} {route.signalCount === 1 ? 'signal' : 'signals'}
                {route.signalCount > 0 && ` (about ${formatDuration(route.signalDelaySeconds)} waiting)`}
                {behindFastest > 0.5 && ` · ${formatDuration(behindFastest)} slower than fastest`}
              </Typography>
            </Box>
          );
        })}
        {activeRoutes.length === 0 && graphStatus === 'ready' && (
          <Typography variant="body2" color="text.secondary">
            Pick a source and destination to compute routes.
          </Typography>
        )}
        {activeRoutes.length === 0 && graphStatus === 'idle' && (
          <Typography variant="body2" color="text.secondary">
            Pick a source and destination, then Find Routes to build the road graph.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
