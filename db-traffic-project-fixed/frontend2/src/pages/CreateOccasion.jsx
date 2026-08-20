import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  Breadcrumbs
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import OccasionForm from '../components/OccasionForm';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const CreateOccasion = () => {
  const navigate = useNavigate();
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch signals data for the form
  const fetchSignals = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/signals');
      setSignals(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching signals:', error);
      setError('Failed to load signals data. Please try again later.');
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchSignals();
  }, []);

  // Handle form submission
  const handleSubmit = async (formData) => {
    setLoading(true);
    setError('');
    
    try {
      await apiClient.post('/api/occasions', formData);
      setSuccess(true);
      
      // Navigate back to occasions list after a short delay
      setTimeout(() => {
        navigate('/occasions');
      }, 2000);
    } catch (error) {
      console.error('Error creating occasion:', error);
      setError('Failed to create occasion. Please check your inputs and try again.');
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          Command Center
        </Link>
        <Link to="/occasions" style={{ textDecoration: 'none', color: 'inherit' }}>
          Occasions
        </Link>
        <Typography color="text.primary">Create New</Typography>
      </Breadcrumbs>
      
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Button 
          component={Link} 
          to="/occasions" 
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back to List
        </Button>
        <Typography variant="h4">
          Create New Occasion
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 4 }}>
          <AlertTitle>Success</AlertTitle>
          Occasion created successfully! Redirecting to occasions list...
        </Alert>
      )}

      {loading && !success ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !success ? (
        <OccasionForm 
          signals={signals} 
          onSubmit={handleSubmit}
          isEditing={false}
        />
      ) : null}
    </Container>
  );
};

export default CreateOccasion; 