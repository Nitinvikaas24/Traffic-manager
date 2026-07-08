import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Paper,
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
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ToggleOn as ActivateIcon,
  ToggleOff as DeactivateIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const OccasionsList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [occasions, setOccasions] = useState([]);
  const [filteredOccasions, setFilteredOccasions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [occasionToDelete, setOccasionToDelete] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  // Fetch occasions data
  const fetchOccasions = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/occasions');
      setOccasions(response.data);
      setFilteredOccasions(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching occasions:', error);
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchOccasions();
  }, []);

  // Filter occasions based on search term
  useEffect(() => {
    if (!occasions.length) return;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = occasions.filter(
        occasion => 
          occasion.occasionId.toLowerCase().includes(term) ||
          occasion.name.toLowerCase().includes(term)
      );
      setFilteredOccasions(filtered);
    } else {
      setFilteredOccasions(occasions);
    }
    
    setPage(0); // Reset to first page when search changes
  }, [searchTerm, occasions]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle pagination change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (occasion) => {
    setOccasionToDelete(occasion);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setOccasionToDelete(null);
  };

  // Confirm deletion
  const handleDeleteConfirm = async () => {
    if (!occasionToDelete) return;

    try {
      await axios.delete(`http://localhost:5000/api/occasions/${occasionToDelete.occasionId}`);
      fetchOccasions(); // Refresh the list
      handleDeleteDialogClose();
    } catch (error) {
      console.error('Error deleting occasion:', error);
    }
  };

  // Toggle occasion active status
  const handleToggleStatus = async (occasion) => {
    setStatusUpdateLoading(true);
    
    try {
      if (occasion.isActive) {
        await axios.patch(`http://localhost:5000/api/occasions/${occasion.occasionId}/deactivate`);
      } else {
        await axios.patch(`http://localhost:5000/api/occasions/${occasion.occasionId}/activate`);
      }
      
      fetchOccasions(); // Refresh the list
    } catch (error) {
      console.error('Error updating occasion status:', error);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Navigate to edit page
  const handleEditClick = (occasionId) => {
    navigate(`/occasions/edit/${occasionId}`);
  };

  // Check if an occasion is currently active based on time windows
  const isCurrentlyActive = (occasion) => {
    if (!occasion.isActive || !Array.isArray(occasion.timeWindows)) return false;
    
    const now = new Date();
    const today = now.getDay(); // 0-6 (Sunday-Saturday)
    const currentHour = now.getHours();
    
    return occasion.timeWindows.some(window => {
      return window.dayOfWeek === today && 
             currentHour >= window.startHour && 
             currentHour < window.endHour;
    });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Traffic Occasions
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchOccasions}
            sx={{ mr: 2 }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            component={Link}
            to="/occasions/create"
          >
            Create Occasion
          </Button>
        </Box>
      </Box>

      {/* Search */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search by Occasion ID or Name"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={3}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Time Windows</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Affected Signals</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOccasions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((occasion) => (
                    <TableRow key={occasion.occasionId}>
                      <TableCell>{occasion.occasionId}</TableCell>
                      <TableCell>{occasion.name}</TableCell>
                      <TableCell>
                        {(occasion.dates || []).map((date, index) => (
                          <div key={index}>{formatDate(date)}</div>
                        ))}
                      </TableCell>
                      <TableCell>
                        {(occasion.timeWindows || []).map((window, index) => {
                          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                          return (
                            <div key={index}>
                              {days[window.dayOfWeek]}: {window.startHour}:00 - {window.endHour}:00
                            </div>
                          );
                        })}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Chip 
                            label={occasion.isActive ? 'ACTIVE' : 'INACTIVE'} 
                            color={occasion.isActive ? 'success' : 'default'}
                            size="small"
                          />
                          {isCurrentlyActive(occasion) && (
                            <Chip 
                              label="CURRENTLY IN EFFECT"
                              color="warning"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{(occasion.affectedSignalIds || []).length}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex' }}>
                          <Tooltip title="Edit">
                            <IconButton 
                              color="primary"
                              onClick={() => handleEditClick(occasion.occasionId)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title={occasion.isActive ? "Deactivate" : "Activate"}>
                            <IconButton 
                              color={occasion.isActive ? "warning" : "success"}
                              onClick={() => handleToggleStatus(occasion)}
                              disabled={statusUpdateLoading}
                            >
                              {occasion.isActive ? <DeactivateIcon /> : <ActivateIcon />}
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Delete">
                            <IconButton 
                              color="error"
                              onClick={() => handleDeleteClick(occasion)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                
                {filteredOccasions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No occasions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredOccasions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the occasion "{occasionToDelete?.name}"?
            This will reset any altered signals back to their default timing.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OccasionsList; 