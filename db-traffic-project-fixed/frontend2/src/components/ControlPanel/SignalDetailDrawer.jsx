import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  TextField,
  Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import apiClient from '../../api/client';
import { useNotify } from '../../context/NotificationContext';

const DRAWER_WIDTH = 380;

const STATUS_COLOR = {
  normal: 'success',
  altered: 'warning',
  overridden: 'error',
  blocked: 'error',
  offline: 'default',
  maintenance: 'default',
};

export default function SignalDetailDrawer({ signal, open, onClose, onSignalUpdated }) {
  const notify = useNotify();
  const [tab, setTab] = useState(0);
  const [cycleLength, setCycleLength] = useState(0);
  const [phases, setPhases] = useState([]);
  const [overrideReason, setOverrideReason] = useState('');
  const [overridePhase, setOverridePhase] = useState('red');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (signal) {
      setCycleLength(signal.currentTiming.cycleLength);
      setPhases(signal.currentTiming.phases);
      setOverrideReason('');
      setTab(0);
    }
  }, [signal]);

  if (!signal) return null;

  const handlePhaseDurationChange = (index, value) => {
    const next = [...phases];
    next[index] = { ...next[index], duration: Number(value) };
    setPhases(next);
  };

  const runAction = async (label, fn) => {
    setSaving(true);
    try {
      const { data } = await fn();
      onSignalUpdated(data);
      notify(label, 'success');
    } catch (err) {
      notify(`${label} failed: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTiming = () =>
    runAction(`Timing updated for ${signal.intersectionName}`, () =>
      apiClient.patch(`/api/signals/${signal.signalId}/timing`, {
        currentTiming: { cycleLength, phases },
        reason: 'Manual timing update from control panel',
      })
    );

  const handleOverride = () => {
    if (!overrideReason.trim()) {
      notify('A reason is required to override a signal', 'warning');
      return;
    }
    runAction(`${signal.intersectionName} forced ${overridePhase.toUpperCase()}`, () =>
      apiClient.patch(`/api/signals/${signal.signalId}/override`, {
        forcedPhase: overridePhase,
        reason: overrideReason,
      })
    );
  };

  const handleClearOverride = () =>
    runAction(`Override cleared for ${signal.intersectionName}`, () =>
      apiClient.post(`/api/signals/${signal.signalId}/override/clear`)
    );

  const handleResetToDefault = () =>
    runAction(`${signal.intersectionName} reset to default timing`, () =>
      apiClient.post(`/api/signals/${signal.signalId}/reset`)
    );

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: DRAWER_WIDTH } }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" noWrap sx={{ maxWidth: 260 }}>
            {signal.intersectionName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {signal.signalId}
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
        <Tab label="Timing" />
        <Tab label="Override" />
        <Tab label="Audit Log" />
      </Tabs>
      <Box sx={{ p: 2, overflowY: 'auto' }}>
        {tab === 0 && (
          <Stack spacing={2}>
            <Chip
              label={signal.status.toUpperCase()}
              color={STATUS_COLOR[signal.status] || 'default'}
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            />
            <TextField
              label="Cycle Length (s)"
              type="number"
              size="small"
              value={cycleLength}
              onChange={(e) => setCycleLength(Number(e.target.value))}
            />
            {phases.map((phase, index) => (
              <TextField
                key={phase.phaseId}
                label={`${phase.phaseId} duration (s)`}
                type="number"
                size="small"
                value={phase.duration}
                onChange={(e) => handlePhaseDurationChange(index, e.target.value)}
              />
            ))}
            <Button variant="contained" onClick={handleSaveTiming} disabled={saving}>
              Save Timing
            </Button>
            {signal.status !== 'normal' && (
              <Button variant="outlined" color="warning" onClick={handleResetToDefault} disabled={saving}>
                Reset to Default
              </Button>
            )}
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={2}>
            {signal.override?.active ? (
              <>
                <Typography variant="body2">
                  Currently forced <b>{signal.override.forcedPhase?.toUpperCase()}</b> by{' '}
                  {signal.override.officerName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reason: {signal.override.reason}
                </Typography>
                <Button variant="outlined" color="warning" onClick={handleClearOverride} disabled={saving}>
                  Clear Override
                </Button>
              </>
            ) : (
              <>
                <ToggleButtonGroup
                  exclusive
                  value={overridePhase}
                  onChange={(_, v) => v && setOverridePhase(v)}
                  size="small"
                >
                  <ToggleButton value="red" color="error">
                    Force Red
                  </ToggleButton>
                  <ToggleButton value="green" color="success">
                    Force Green
                  </ToggleButton>
                </ToggleButtonGroup>
                <TextField
                  label="Reason (required)"
                  size="small"
                  multiline
                  minRows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
                <Button variant="contained" color="error" onClick={handleOverride} disabled={saving}>
                  Apply Override
                </Button>
              </>
            )}
          </Stack>
        )}

        {tab === 2 && (
          <List dense>
            {(signal.auditLog || []).length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No audit history yet
              </Typography>
            )}
            {(signal.auditLog || []).map((entry, index) => (
              <ListItem key={index} divider disableGutters>
                <ListItemText
                  primary={`${entry.action} — ${entry.officerName || 'system'}`}
                  secondary={`${new Date(entry.timestamp).toLocaleString()}${entry.reason ? ` · ${entry.reason}` : ''}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
}
