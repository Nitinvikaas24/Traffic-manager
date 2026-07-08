import React from 'react';
import './SignalDetail.css';

const SignalDetail = ({ signal }) => {
  if (!signal) {
    return <div className="signal-detail-placeholder">Select a signal to view details</div>;
  }

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
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

  return (
    <div className="signal-detail">
      <div className="signal-header">
        <h3 className="signal-title">{signal.intersectionName}</h3>
        <span className={`status-badge ${getStatusClass(signal.status)}`}>
          {signal.status.toUpperCase()}
        </span>
      </div>

      <div className="signal-info-grid">
        <div className="info-item">
          <span className="info-label">Signal ID:</span>
          <span className="info-value">{signal.signalId}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Last Updated:</span>
          <span className="info-value">{formatDate(signal.lastUpdated)}</span>
        </div>
      </div>

      <div className="section">
        <h4 className="section-title">Current Timing</h4>
        <div className="timing-info">
          <div className="timing-header">
            <span className="timing-label">Cycle Length:</span>
            <span className="timing-value">{signal.currentTiming.cycleLength} seconds</span>
          </div>
          <div className="phases-container">
            {(signal.currentTiming?.phases || []).map((phase, index) => (
              <div key={index} className="phase-item">
                <div className="phase-header">{phase.phaseId}</div>
                <div className="phase-duration">
                  <div 
                    className="phase-duration-bar" 
                    style={{ 
                      width: `${(phase.duration / signal.currentTiming.cycleLength) * 100}%`,
                      backgroundColor: 
                        phase.phaseId.includes('Green') ? '#4caf50' : 
                        phase.phaseId.includes('Amber') ? '#ff9800' : 
                        phase.phaseId.includes('Red') ? '#f44336' : '#757575'
                    }}
                  ></div>
                  <span className="duration-text">{phase.duration}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {Array.isArray(signal.occasions) && signal.occasions.length > 0 && (
        <div className="section">
          <h4 className="section-title">Active Occasions</h4>
          <div className="occasions-list">
            {signal.occasions.map((occasion) => (
              <div key={occasion.occasionId} className="occasion-item">
                <div className="occasion-name">{occasion.name}</div>
                <div className="occasion-dates">
                  {(occasion.dates || []).map((date, index) => (
                    <span key={index} className="occasion-date">
                      {new Date(date).toLocaleDateString()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignalDetail; 