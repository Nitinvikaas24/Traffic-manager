import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import apiClient from '../../api/client';
import { useNotify } from '../../context/NotificationContext';

const DEFAULT_PHASES = [
  { phaseId: 'MainRd_Green', duration: 50 },
  { phaseId: 'MainRd_Amber', duration: 5 },
  { phaseId: 'SideRd_Green', duration: 35 },
  { phaseId: 'SideRd_Amber', duration: 5 },
  { phaseId: 'All_Red', duration: 25 },
];

/**
 * Admin-only creation form for a new Signal record. Coordinates can arrive
 * pre-filled (e.g. from a map click) but stay editable, and also work from
 * scratch (e.g. the legacy Signals page, which has no map-click entry point).
 */
export default function NewSignalDialog({ open, initialLocation, onClose, onCreated }) {
  const notify = useNotify();
  const [signalId, setSignalId] = useState('');
  const [intersectionName, setIntersectionName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [cycleLength, setCycleLength] = useState(120);
  const [phases, setPhases] = useState(DEFAULT_PHASES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSignalId('');
      setIntersectionName('');
      setLat(initialLocation?.lat != null ? initialLocation.lat.toFixed(6) : '');
      setLng(initialLocation?.lng != null ? initialLocation.lng.toFixed(6) : '');
      setCycleLength(120);
      setPhases(DEFAULT_PHASES);
    }
  }, [open, initialLocation]);

  const handlePhaseChange = (index, value) => {
    const next = [...phases];
    next[index] = { ...next[index], duration: Number(value) };
    setPhases(next);
  };

  const handleSubmit = async () => {
    if (!signalId.trim() || !intersectionName.trim() || lat === '' || lng === '') {
      notify('Signal ID, intersection name, and coordinates are required', 'warning');
      return;
    }
    setSaving(true);
    try {
      const timing = { cycleLength: Number(cycleLength), phases };
      const { data } = await apiClient.post('/api/signals', {
        signalId: signalId.trim(),
        intersectionName: intersectionName.trim(),
        location: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        defaultTiming: timing,
        currentTiming: timing,
        status: 'normal',
      });
      onCreated(data);
      notify(`Signal "${data.intersectionName}" created`, 'success');
      onClose();
    } catch (err) {
      notify(`Failed to create signal: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Signal</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Signal ID" value={signalId} onChange={(e) => setSignalId(e.target.value)} fullWidth autoFocus />
          <TextField
            label="Intersection Name"
            value={intersectionName}
            onChange={(e) => setIntersectionName(e.target.value)}
            fullWidth
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Latitude"
                type="number"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                fullWidth
                inputProps={{ step: 'any' }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Longitude"
                type="number"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                fullWidth
                inputProps={{ step: 'any' }}
              />
            </Grid>
          </Grid>
          <TextField
            label="Cycle Length (s)"
            type="number"
            value={cycleLength}
            onChange={(e) => setCycleLength(e.target.value)}
            inputProps={{ min: 60, max: 300 }}
          />
          <Typography variant="subtitle2">Default Phase Timing</Typography>
          {phases.map((phase, index) => (
            <TextField
              key={phase.phaseId}
              label={`${phase.phaseId} duration (s)`}
              type="number"
              size="small"
              value={phase.duration}
              onChange={(e) => handlePhaseChange(index, e.target.value)}
              inputProps={{ min: 1, max: 120 }}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          Create Signal
        </Button>
      </DialogActions>
    </Dialog>
  );
}
