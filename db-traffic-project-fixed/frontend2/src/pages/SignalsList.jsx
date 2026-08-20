import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  MenuItem,
} from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon, Add as AddIcon } from '@mui/icons-material';
import apiClient from '../api/client';
import TrafficMap from '../components/TrafficMap';
import SignalDetail from '../components/SignalDetail';
import NewSignalDialog from '../components/ControlPanel/NewSignalDialog';
import { useAuth } from '../context/AuthContext';

const STATUS_COLOR = {
  normal: 'success',
  altered: 'warning',
  overridden: 'error',
  blocked: 'error',
  offline: 'default',
  maintenance: 'default',
};

const SignalsList = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState([]);
  const [filteredSignals, setFilteredSignals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSignalId, setSelectedSignalId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [newSignalDialogOpen, setNewSignalDialogOpen] = useState(false);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/signals');
      setSignals(response.data);
      setFilteredSignals(response.data);
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  useEffect(() => {
    if (!signals.length) return;
    let filtered = [...signals];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (signal) =>
          signal.signalId.toLowerCase().includes(term) || signal.intersectionName.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((signal) => signal.status === statusFilter);
    }

    setFilteredSignals(filtered);
    setPage(0);
  }, [searchTerm, statusFilter, signals]);

  const handleSignalSelect = (signalId) => {
    setSelectedSignalId(signalId);
  };

  const selectedSignal = signals.find((signal) => signal.signalId === selectedSignalId);

  const formatLastUpdated = (dateString) => new Date(dateString).toLocaleString();

  const currentItems = filteredSignals.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Traffic Signals</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {user?.role === 'admin' && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewSignalDialogOpen(true)}>
              New Signal
            </Button>
          )}
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchSignals} disabled={loading}>
            Refresh
          </Button>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              placeholder="Search by Signal ID or Intersection Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="altered">Altered</MenuItem>
              <MenuItem value="overridden">Overridden</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
              <MenuItem value="offline">Offline</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper elevation={3}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Intersection Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Cycle Length</TableCell>
                      <TableCell>Last Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentItems.map((signal) => (
                      <TableRow
                        key={signal.signalId}
                        hover
                        selected={selectedSignalId === signal.signalId}
                        onClick={() => handleSignalSelect(signal.signalId)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{signal.signalId}</TableCell>
                        <TableCell>{signal.intersectionName}</TableCell>
                        <TableCell>
                          <Chip
                            label={signal.status.toUpperCase()}
                            color={STATUS_COLOR[signal.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{signal.currentTiming.cycleLength}s</TableCell>
                        <TableCell>{formatLastUpdated(signal.lastUpdated)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredSignals.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No signals found matching the current filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredSignals.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper elevation={3} sx={{ height: 400, overflow: 'hidden', mb: 3 }}>
              <TrafficMap signals={signals} selectedSignalId={selectedSignalId} onSignalSelect={handleSignalSelect} />
            </Paper>
          </Grid>
        </Grid>
      )}

      {selectedSignal && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Signal Details
          </Typography>
          <SignalDetail signal={selectedSignal} />
        </Box>
      )}

      {user?.role === 'admin' && (
        <NewSignalDialog
          open={newSignalDialogOpen}
          initialLocation={null}
          onClose={() => setNewSignalDialogOpen(false)}
          onCreated={() => fetchSignals()}
        />
      )}
    </Container>
  );
};

export default SignalsList;
