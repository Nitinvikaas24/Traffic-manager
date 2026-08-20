import React, { useState } from 'react';
import { Box, Typography, MenuItem, TextField, Button, Stack, Chip, CircularProgress, Alert } from '@mui/material';

const ROUTE_LABELS = ['Fastest', 'Alternate', 'Fallback'];
const ROUTE_COLORS = ['success', 'warning', 'warning'];

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
        {activeRoutes.map((route) => (
          <Box key={route.rank} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Chip
                label={ROUTE_LABELS[route.rank] || `Route ${route.rank + 1}`}
                color={ROUTE_COLORS[route.rank] || 'default'}
                size="small"
              />
              <Typography variant="body2">{Math.round(route.etaSeconds)}s ETA</Typography>
            </Stack>
          </Box>
        ))}
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
