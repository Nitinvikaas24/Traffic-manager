import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import TrafficMap from '../components/TrafficMap';
import SignalDetail from '../components/SignalDetail';
import './SignalsList.css';

const SignalsList = () => {
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState([]);
  const [filteredSignals, setFilteredSignals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSignalId, setSelectedSignalId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch signals data
  const fetchSignals = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/signals`);
      setSignals(response.data);
      setFilteredSignals(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching signals:', error);
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchSignals();
  }, []);

  // Filter signals based on search term and status filter
  useEffect(() => {
    if (!signals.length) return;

    let filtered = [...signals];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        signal => 
          signal.signalId.toLowerCase().includes(term) ||
          signal.intersectionName.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(signal => signal.status === statusFilter);
    }
    
    setFilteredSignals(filtered);
    setPage(0); // Reset to first page when filters change
  }, [searchTerm, statusFilter, signals]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle status filter change
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  // Handle pagination change
  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle signal selection (from table or map)
  const handleSignalSelect = (signalId) => {
    setSelectedSignalId(signalId);
  };

  // Get selected signal object
  const selectedSignal = signals.find(signal => signal?.signalId === selectedSignalId);

  // Format last updated time
  const formatLastUpdated = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status class for styling
  const getStatusClass = (status) => {
    switch (status) {
      case 'normal':
        return 'status-success';
      case 'altered':
        return 'status-warning';
      default:
        return 'status-error';
    }
  };

  // Calculate pagination
  const indexOfLastItem = (page + 1) * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredSignals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSignals.length / rowsPerPage);

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Traffic Signals</h1>
        <button 
          className="btn"
          onClick={fetchSignals}
          disabled={loading}
        >
          <span className="btn-icon">↻</span> Refresh
        </button>
      </div>

      {/* Filters and Search */}
      <div className="filter-panel">
        <div className="filter-grid">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search by Signal ID or Intersection Name"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          <div className="filter-container">
            <label htmlFor="status-filter">Status</label>
            <div className="select-wrapper">
              <span className="filter-icon">⚙️</span>
              <select
                id="status-filter"
                className="filter-select"
                value={statusFilter}
                onChange={handleStatusFilterChange}
              >
                <option value="all">All Status</option>
                <option value="normal">Normal</option>
                <option value="altered">Altered</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loader"></div>
        </div>
      ) : (
        <div className="signals-grid">
          {/* Signals Table */}
          <div className="signals-table-container">
            <div className="table-wrapper">
              <table className="signals-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Intersection Name</th>
                    <th>Status</th>
                    <th>Cycle Length</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((signal) => (
                    <tr 
                      key={signal.signalId}
                      className={selectedSignalId === signal.signalId ? 'selected-row' : ''}
                      onClick={() => handleSignalSelect(signal.signalId)}
                    >
                      <td>{signal.signalId}</td>
                      <td>{signal.intersectionName}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(signal.status)}`}>
                          {signal.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{signal.currentTiming?.cycleLength ?? 'N/A'}s</td>
                      <td>{formatLastUpdated(signal.lastUpdated)}</td>
                    </tr>
                  ))}
                  
                  {filteredSignals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-message">
                        No signals found matching the current filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="pagination">
              <div className="rows-per-page">
                <label>Rows per page:</label>
                <select
                  value={rowsPerPage}
                  onChange={handleChangeRowsPerPage}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>
              
              <div className="page-controls">
                <span>
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredSignals.length)} of {filteredSignals.length}
                </span>
                <button
                  className="page-btn"
                  onClick={() => handleChangePage(page - 1)}
                  disabled={page === 0}
                >
                  ◀
                </button>
                <button
                  className="page-btn"
                  onClick={() => handleChangePage(page + 1)}
                  disabled={page >= totalPages - 1}
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="map-section">
            <TrafficMap 
              signals={signals || []}
              selectedSignalId={selectedSignalId}
              onSignalSelect={handleSignalSelect}
            />
          </div>
        </div>
      )}

      {/* Selected Signal Details */}
      {selectedSignal && (
        <div className="signal-details-container">
          <h2 className="section-title">Signal Details</h2>
          <SignalDetail signal={selectedSignal} />
        </div>
      )}
    </div>
  );
};

export default SignalsList; 