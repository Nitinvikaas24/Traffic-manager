import React, { useMemo, useState } from 'react';
import { Box, List, ListItemButton, ListItemText, Chip, TextField, InputAdornment, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { motion } from 'motion/react';

const STATUS_CHIP = {
  normal: { label: 'LIVE', color: 'success' },
  altered: { label: 'SCHEDULED', color: 'warning' },
  overridden: { label: 'OVERRIDE', color: 'error' },
  blocked: { label: 'BLOCKED', color: 'error' },
  offline: { label: 'OFFLINE', color: 'default' },
  maintenance: { label: 'MAINTENANCE', color: 'default' },
};

export default function SignalListSidebar({ signals, selectedSignalId, onSelect, eventModeSelection = [] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return signals;
    return signals.filter(
      (s) => s.signalId.toLowerCase().includes(term) || s.intersectionName.toLowerCase().includes(term)
    );
  }, [signals, search]);

  return (
    <Box sx={{ width: 300, flexShrink: 0, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search signals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <List dense sx={{ overflowY: 'auto', flex: 1, py: 0 }}>
        {filtered.map((signal) => {
          const chip = STATUS_CHIP[signal.status] || STATUS_CHIP.normal;
          const selectedForEvent = eventModeSelection.includes(signal.signalId);
          return (
            // Each row animates in independently as it scrolls into view
            // (rather than one big parent-stagger) — with 300+ signals a
            // single orchestrated cascade would take many seconds to finish.
            <motion.div
              key={signal.signalId}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '200px 0px' }}
              transition={{ duration: 0.25 }}
            >
              <ListItemButton
                selected={signal.signalId === selectedSignalId}
                onClick={() => onSelect(signal.signalId)}
                sx={selectedForEvent ? { boxShadow: 'inset 0 0 0 2px', color: 'error.main' } : undefined}
              >
                <ListItemText
                  primary={signal.intersectionName}
                  secondary={signal.signalId}
                  primaryTypographyProps={{ noWrap: true, fontSize: 14 }}
                  secondaryTypographyProps={{ fontSize: 11 }}
                />
                <Chip label={chip.label} color={chip.color} size="small" variant="outlined" />
              </ListItemButton>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No signals match
          </Typography>
        )}
      </List>
    </Box>
  );
}
