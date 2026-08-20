import React from 'react';
import { Card, CardContent, CardHeader, Chip, Box, Typography, LinearProgress, Stack, Divider } from '@mui/material';

const STATUS_COLOR = {
  normal: 'success',
  altered: 'warning',
  overridden: 'error',
  blocked: 'error',
  offline: 'default',
  maintenance: 'default',
};

const PHASE_COLOR = (phaseId) => {
  if (/green/i.test(phaseId)) return 'success';
  if (/amber/i.test(phaseId)) return 'warning';
  if (/red/i.test(phaseId)) return 'error';
  return 'inherit';
};

const SignalDetail = ({ signal }) => {
  if (!signal) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary">Select a signal to view details</Typography>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString) => (dateString ? new Date(dateString).toLocaleString() : '—');

  return (
    <Card>
      <CardHeader
        title={signal.intersectionName}
        subheader={signal.signalId}
        action={<Chip label={signal.status.toUpperCase()} color={STATUS_COLOR[signal.status] || 'default'} size="small" sx={{ m: 2 }} />}
      />
      <Divider />
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Last Updated
            </Typography>
            <Typography variant="body2">{formatDate(signal.lastUpdated)}</Typography>
          </Box>

          {signal.override?.active && (
            <Box sx={{ p: 1.5, border: 1, borderColor: 'error.main', borderRadius: 1 }}>
              <Typography variant="body2" color="error.main" fontWeight="bold">
                Overridden: forced {signal.override.forcedPhase?.toUpperCase()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {signal.override.officerName} — {signal.override.reason}
              </Typography>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Current Timing — {signal.currentTiming.cycleLength}s cycle
            </Typography>
            <Stack spacing={1.5}>
              {signal.currentTiming.phases.map((phase) => (
                <Box key={phase.phaseId}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption">{phase.phaseId}</Typography>
                    <Typography variant="caption">{phase.duration}s</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(phase.duration / signal.currentTiming.cycleLength) * 100}
                    color={PHASE_COLOR(phase.phaseId)}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default SignalDetail;
