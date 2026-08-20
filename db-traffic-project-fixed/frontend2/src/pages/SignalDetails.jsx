import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress,
  Alert,
  AlertTitle,
  Breadcrumbs,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../api/client';
import TrafficMap from '../components/TrafficMap';
import SignalDetail from '../components/SignalDetail';

const SignalDetails = () => {
  const { id } = useParams();
  const [signal, setSignal] = useState(null);
  const [activeOccasions, setActiveOccasions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Fetch signal and active occasions data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch signal and occasions data in parallel
      const [signalRes, occasionsRes] = await Promise.all([
        apiClient.get(`/api/signals/${id}`),
        apiClient.get('/api/occasions')
      ]);
      
      setSignal(signalRes.data);
      
      // Filter occasions that affect this signal
      const affecting = occasionsRes.data.filter(occasion => 
        occasion.isActive && 
        occasion.affectedSignalIds.includes(id)
      );
      setActiveOccasions(affecting);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load signal data. Please try again later.');
      setLoading(false);
    }
  };

  // Fetch data on component mount and when id changes
  useEffect(() => {
    fetchData();
  }, [id]);

  // Handle reset confirmation
  const handleResetClick = () => {
    setResetDialogOpen(true);
  };

  // Close reset dialog
  const handleResetDialogClose = () => {
    setResetDialogOpen(false);
  };

  // Confirm reset timing
  const handleResetConfirm = async () => {
    setLoading(true);
    
    try {
      await apiClient.post(`/api/signals/${id}/reset`);
      setResetSuccess(true);
      setResetDialogOpen(false);
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error resetting signal:', error);
      setError('Failed to reset signal timing. Please try again later.');
      setLoading(false);
      setResetDialogOpen(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Check if signal timing has been altered
  const isAltered = signal?.status === 'altered';

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          Command Center
        </Link>
        <Link to="/signals" style={{ textDecoration: 'none', color: 'inherit' }}>
          Signals
        </Link>
        <Typography color="text.primary">{signal?.intersectionName || id}</Typography>
      </Breadcrumbs>
      
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            component={Link} 
            to="/signals" 
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2 }}
          >
            Back to List
          </Button>
          <Typography variant="h4">
            Signal Details
          </Typography>
        </Box>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchData}
            sx={{ mr: 2 }}
            disabled={loading}
          >
            Refresh
          </Button>
          
          {isAltered && (
            <Button 
              variant="contained" 
              color="warning"
              startIcon={<HistoryIcon />}
              onClick={handleResetClick}
              disabled={loading}
            >
              Reset to Default
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {resetSuccess && (
        <Alert severity="success" sx={{ mb: 4 }}>
          <AlertTitle>Success</AlertTitle>
          Signal timing has been reset to default values.
        </Alert>
      )}

      {loading && !signal ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : signal ? (
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 0, overflow: 'hidden' }}>
              <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                <Typography variant="h6">
                  Location Map
                </Typography>
              </Box>
              <Box sx={{ height: '500px' }}>
                <TrafficMap 
                  signals={[signal]} 
                  selectedSignalId={signal.signalId}
                  onSignalSelect={() => {}}
                />
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <SignalDetail signal={signal} />
              </Grid>
              
              <Grid item xs={12}>
                <Card>
                  <CardHeader 
                    title="Active Occasions" 
                    subheader={`Affecting this signal: ${activeOccasions.length}`}
                    titleTypographyProps={{ variant: 'h6' }}
                  />
                  <Divider />
                  <CardContent>
                    {activeOccasions.length > 0 ? (
                      <List dense>
                        {activeOccasions.map((occasion) => (
                          <ListItem key={occasion.occasionId}>
                            <ListItemText
                              primary={occasion.name}
                              secondary={`Created on: ${formatDate(occasion.createdAt)}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                        <Typography color="textSecondary" gutterBottom>
                          No active occasions affecting this signal
                        </Typography>
                        
                        {!isAltered ? (
                          <Typography variant="body2" color="textSecondary">
                            Signal is operating with default timing
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <WarningIcon color="warning" sx={{ mr: 1 }} />
                            <Typography variant="body2" color="warning.main">
                              Signal timing is altered but no active occasion is linked
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                    
                    <Box sx={{ mt: 2, textAlign: 'right' }}>
                      <Button 
                        component={Link} 
                        to="/occasions" 
                        color="primary"
                      >
                        View All Occasions
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="error" sx={{ mb: 4 }}>
          <AlertTitle>Error</AlertTitle>
          Signal not found
        </Alert>
      )}

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={handleResetDialogClose}
      >
        <DialogTitle>Reset Signal Timing</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset this signal to its default timing?
            This will remove any modifications made by active occasions.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleResetConfirm} color="warning" variant="contained">
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SignalDetails; 