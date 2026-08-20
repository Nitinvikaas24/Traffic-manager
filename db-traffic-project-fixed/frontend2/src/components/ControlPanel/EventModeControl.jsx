import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Chip, Stack, Alert } from '@mui/material';
import apiClient from '../../api/client';
import { useNotify } from '../../context/NotificationContext';

export default function EventModeControl({
  active,
  onToggleActive,
  selection,
  onRemoveFromSelection,
  onApplied,
  blockedIds,
  onBlockedIdsChange,
}) {
  const notify = useNotify();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleActivate = async () => {
    if (!selection.length) {
      notify('Select at least one signal on the map or list first', 'warning');
      return;
    }
    if (!reason.trim()) {
      notify('A reason is required for Event Mode', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/api/signals/event-mode/bulk', {
        signalIds: selection,
        blocked: true,
        reason,
      });
      onBlockedIdsChange(selection);
      onApplied(data);
      notify(`Event Mode active on ${selection.length} signal(s) — rerouting traffic`, 'success');
      onToggleActive();
      setReason('');
    } catch (err) {
      notify(`Event Mode activation failed: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/api/signals/event-mode/bulk', {
        signalIds: blockedIds,
        blocked: false,
        reason: 'Event mode ended',
      });
      onApplied(data);
      onBlockedIdsChange([]);
      notify('Event Mode deactivated — signals restored', 'success');
    } catch (err) {
      notify(`Failed to deactivate Event Mode: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1">Event Mode</Typography>
        <Button size="small" variant={active ? 'contained' : 'outlined'} color="error" onClick={onToggleActive}>
          {active ? 'Selecting…' : 'Start (E)'}
        </Button>
      </Stack>

      {active && (
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          <Alert severity="info" sx={{ fontSize: 12 }}>
            Click signals on the map or list to add them to the incident cluster.
          </Alert>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selection.map((id) => (
              <Chip key={id} label={id} size="small" onDelete={() => onRemoveFromSelection(id)} />
            ))}
          </Stack>
          <TextField
            size="small"
            label="Reason (e.g. VIP convoy, parade route)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button variant="contained" color="error" onClick={handleActivate} disabled={submitting}>
            Block Cluster &amp; Reroute
          </Button>
        </Stack>
      )}

      {!active && blockedIds.length > 0 && (
        <Button sx={{ mt: 1.5 }} size="small" variant="outlined" onClick={handleDeactivate} disabled={submitting}>
          End Event Mode ({blockedIds.length} signals)
        </Button>
      )}
    </Box>
  );
}
