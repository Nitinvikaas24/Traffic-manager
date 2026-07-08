import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  CircularProgress
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  Traffic as TrafficIcon,
  Event as EventIcon,
  Warning as WarningIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import axios from 'axios';
import TrafficMap from '../components/TrafficMap';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedSignalId, setSelectedSignalId] = useState(null);
  const [stats, setStats] = useState({
    totalSignals: 0,
    alteredSignals: 0,
    activeOccasions: 0
  });

  // Fetch signals and occasions data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [signalsRes, occasionsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/signals`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/occasions`)
      ]);
      const routesRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/routes`);
      
      setSignals(signalsRes.data);
      setOccasions(occasionsRes.data);
      setRoutes(routesRes.data);
      
      // Calculate stats
      setStats({
        totalSignals: signalsRes.data.length,
        alteredSignals: signalsRes.data.filter(signal => signal.status === 'altered').length,
        activeOccasions: occasionsRes.data.filter(occasion => occasion.isActive).length
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Handle signal selection on map
  const handleSignalSelect = (signalId) => {
    setSelectedSignalId(signalId);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get the nearest upcoming occasion
  const getUpcomingOccasion = () => {
    if (!occasions.length) return null;
    
    const today = new Date();
    const upcoming = occasions
      .filter(occasion => occasion.isActive && Array.isArray(occasion.dates) && Array.isArray(occasion.timeWindows))
      .filter(occasion => {
        // Check if any of the dates are upcoming
        return occasion.dates.some(date => new Date(date) >= today);
      })
      .sort((a, b) => {
        // Find the closest upcoming date for each occasion
        const closestDateA = a.dates
          .map(date => new Date(date))
          .filter(date => date >= today)
          .sort((d1, d2) => d1 - d2)[0];
        
        const closestDateB = b.dates
          .map(date => new Date(date))
          .filter(date => date >= today)
          .sort((d1, d2) => d1 - d2)[0];
        
        return closestDateA - closestDateB;
      });
    
    return upcoming.length ? upcoming[0] : null;
  };

  const upcomingOccasion = getUpcomingOccasion();

  // Get active occasions (currently in effect)
  const getActiveOccasions = () => {
    if (!occasions.length) return [];
    
    const now = new Date();
    const today = now.getDay(); // 0-6 (Sunday-Saturday)
    const currentHour = now.getHours();
    
    return occasions.filter(occasion => {
      // First check if the occasion is marked as active
      if (!occasion.isActive || !Array.isArray(occasion.timeWindows)) return false;
      
      // Check if any of the time windows are currently active
      return occasion.timeWindows.some(window => {
        return window.dayOfWeek === today && 
               currentHour >= window.startHour && 
               currentHour < window.endHour;
      });
    });
  };

  const currentlyActiveOccasions = getActiveOccasions();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Traffic Signal Management Dashboard
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />} 
          onClick={fetchData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={4}>
          {/* Stats Cards */}
          <Grid item xs={12}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                    <TrafficIcon fontSize="large" color="primary" sx={{ mb: 2 }} />
                    <Typography variant="h4" align="center">
                      {stats.totalSignals}
                    </Typography>
                    <Typography variant="subtitle1" align="center" color="textSecondary">
                      Total Traffic Signals
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%', backgroundColor: stats.alteredSignals > 0 ? '#fff8e1' : 'white' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                    <WarningIcon 
                      fontSize="large" 
                      sx={{ mb: 2, color: stats.alteredSignals > 0 ? '#ff9800' : '#9e9e9e' }} 
                    />
                    <Typography 
                      variant="h4" 
                      align="center"
                      color={stats.alteredSignals > 0 ? 'warning.main' : 'textPrimary'}
                    >
                      {stats.alteredSignals}
                    </Typography>
                    <Typography variant="subtitle1" align="center" color="textSecondary">
                      Altered Signals
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                    <EventIcon fontSize="large" color="primary" sx={{ mb: 2 }} />
                    <Typography variant="h4" align="center">
                      {stats.activeOccasions}
                    </Typography>
                    <Typography variant="subtitle1" align="center" color="textSecondary">
                      Active Occasions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Map and Active Occasions */}
          <Grid item xs={12}>
            <Grid container spacing={3}>
              {/* Map */}
              <Grid item xs={12} md={8}>
                <Paper elevation={3} sx={{ height: 600, p: 0, overflow: 'hidden' }}>
                  <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="h6">
                      Traffic Signal Map
                    </Typography>
                  </Box>
                  <TrafficMap 
                    signals={signals} 
                    routes={routes}
                    occasions={occasions}
                    selectedSignalId={selectedSignalId}
                    onSignalSelect={handleSignalSelect}
                  />
                </Paper>
              </Grid>
              
              {/* Active Occasions */}
              <Grid item xs={12} md={4}>
                <Grid container spacing={3}>
                  {/* Currently Active Occasions */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader 
                        title="Currently Active" 
                        subheader={`${currentlyActiveOccasions.length} occasions in effect now`}
                        titleTypographyProps={{ variant: 'h6' }}
                      />
                      <Divider />
                      <CardContent>
                        {currentlyActiveOccasions.length > 0 ? (
                          <List dense>
                            {currentlyActiveOccasions.map(occasion => (
                              <React.Fragment key={occasion.occasionId}>
                                <ListItem>
                                  <ListItemText
                                    primary={occasion.name}
                                    secondary={`Affects ${occasion.affectedSignalIds.length} signals`}
                                    primaryTypographyProps={{ fontWeight: 'bold' }}
                                  />
                                </ListItem>
                                <Divider component="li" />
                              </React.Fragment>
                            ))}
                          </List>
                        ) : (
                          <Box sx={{ py: 2, textAlign: 'center' }}>
                            <Typography color="textSecondary">
                              No occasions currently active
                            </Typography>
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
                  
                  {/* Upcoming Occasion */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader 
                        title="Next Scheduled Occasion" 
                        titleTypographyProps={{ variant: 'h6' }}
                      />
                      <Divider />
                      <CardContent>
                        {upcomingOccasion ? (
                          <Box>
                            <Typography variant="subtitle1" gutterBottom>
                              {upcomingOccasion.name}
                            </Typography>
                            
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                              <Grid item xs={6}>
                                <Typography variant="body2" color="textSecondary">
                                  Date:
                                </Typography>
                                <Typography variant="body1">
                                  {new Date(upcomingOccasion.dates[0]).toLocaleDateString()}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="body2" color="textSecondary">
                                  Time Window:
                                </Typography>
                                <Typography variant="body1">
                                  {upcomingOccasion.timeWindows[0].startHour}:00 - {upcomingOccasion.timeWindows[0].endHour}:00
                                </Typography>
                              </Grid>
                            </Grid>
                            
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              Affected Signals:
                            </Typography>
                            <Typography variant="body2">
                              {upcomingOccasion.affectedSignalIds.length} signals will be affected
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ py: 2, textAlign: 'center' }}>
                            <Typography color="textSecondary">
                              No upcoming occasions scheduled
                            </Typography>
                          </Box>
                        )}
                        
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            component={Link}
                            to="/occasions/create"
                            variant="contained"
                            color="primary"
                          >
                            Create New Occasion
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default Dashboard; 