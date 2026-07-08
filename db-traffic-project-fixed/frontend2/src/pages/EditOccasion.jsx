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
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import OccasionForm from '../components/OccasionForm';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const EditOccasion = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [signals, setSignals] = useState([]);
  const [occasion, setOccasion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch signals and occasion data in parallel
        const [signalsRes, occasionRes] = await Promise.all([
          axios.get('http://localhost:5000/api/signals'),
          axios.get(`http://localhost:5000/api/occasions/${id}`)
        ]);
        
        setSignals(signalsRes.data);
        setOccasion(occasionRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Handle form submission
  const handleSubmit = async (formData) => {
    setLoading(true);
    setError('');
    
    try {
      await axios.put(`http://localhost:5000/api/occasions/${id}`, formData);
      setSuccess(true);
      
      // Navigate back to occasions list after a short delay
      setTimeout(() => {
        navigate('/occasions');
      }, 2000);
    } catch (error) {
      console.error('Error updating occasion:', error);
      setError('Failed to update occasion. Please check your inputs and try again.');
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          Dashboard
        </Link>
        <Link to="/occasions" style={{ textDecoration: 'none', color: 'inherit' }}>
          Occasions
        </Link>
        <Typography color="text.primary">Edit {occasion?.name || id}</Typography>
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
          Edit Occasion
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
          Occasion updated successfully! Redirecting to occasions list...
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : occasion && !success ? (
        <OccasionForm 
          signals={signals} 
          initialData={occasion}
          onSubmit={handleSubmit}
          isEditing={true}
        />
      ) : !success && !loading ? (
        <Alert severity="error" sx={{ mb: 4 }}>
          <AlertTitle>Error</AlertTitle>
          Occasion not found
        </Alert>
      ) : null}
    </Container>
  );
};

export default EditOccasion; 