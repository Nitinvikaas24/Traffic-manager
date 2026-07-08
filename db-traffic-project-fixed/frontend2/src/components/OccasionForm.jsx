import React, { useState, useEffect } from 'react';
import './OccasionForm.css';

const OccasionForm = ({
  signals,
  initialData,
  onSubmit,
  isEditing = false
}) => {
  const [formData, setFormData] = useState({
    occasionId: '',
    name: '',
    dates: [],
    timeWindows: [
      {
        dayOfWeek: 0, // Sunday
        startHour: 8,
        endHour: 12
      }
    ],
    affectedSignalIds: [],
    adjustmentRules: {
      cycleLength: 120,
      phases: [
        { phaseId: 'MainRd_Green', duration: 60 },
        { phaseId: 'MainRd_Amber', duration: 5 },
        { phaseId: 'SideRd_Green', duration: 30 },
        { phaseId: 'SideRd_Amber', duration: 5 },
        { phaseId: 'All_Red', duration: 20 }
      ]
    },
    isActive: true
  });
  
  const [occasionError, setOccasionError] = useState('');
  const [nameError, setNameError] = useState('');
  const [datesError, setDatesError] = useState('');
  const [signalsError, setSignalsError] = useState('');

  // Initialize form data if editing an existing occasion
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData(initialData);
    }
  }, [isEditing, initialData]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error for the field
    if (name === 'occasionId') setOccasionError('');
    if (name === 'name') setNameError('');
  };

  // Handle dates changes
  const handleDateChange = (e, index) => {
    const newDates = [...formData.dates];
    newDates[index] = new Date(e.target.value);
    setFormData({
      ...formData,
      dates: newDates
    });
    setDatesError('');
  };

  // Add a new date field
  const addDateField = () => {
    setFormData({
      ...formData,
      dates: [...formData.dates, new Date()]
    });
  };

  // Remove a date field
  const removeDateField = (index) => {
    const newDates = [...formData.dates];
    newDates.splice(index, 1);
    setFormData({
      ...formData,
      dates: newDates
    });
  };

  // Handle time window changes
  const handleTimeWindowChange = (index, field, e) => {
    const value = field === 'dayOfWeek' ? parseInt(e.target.value, 10) : parseInt(e.target.value, 10);
    const newTimeWindows = [...formData.timeWindows];
    newTimeWindows[index] = {
      ...newTimeWindows[index],
      [field]: value
    };
    setFormData({
      ...formData,
      timeWindows: newTimeWindows
    });
  };

  // Add a new time window
  const addTimeWindow = () => {
    setFormData({
      ...formData,
      timeWindows: [
        ...formData.timeWindows,
        {
          dayOfWeek: 0,
          startHour: 8,
          endHour: 12
        }
      ]
    });
  };

  // Remove a time window
  const removeTimeWindow = (index) => {
    const newTimeWindows = [...formData.timeWindows];
    newTimeWindows.splice(index, 1);
    setFormData({
      ...formData,
      timeWindows: newTimeWindows
    });
  };

  // Handle affected signals change
  const handleSignalChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({
      ...formData,
      affectedSignalIds: selectedOptions
    });
    setSignalsError('');
  };

  // Handle phase change in adjustmentRules
  const handlePhaseChange = (index, field, e) => {
    const value = field === 'duration' ? parseInt(e.target.value, 10) : e.target.value;
    const newPhases = [...formData.adjustmentRules.phases];
    newPhases[index] = {
      ...newPhases[index],
      [field]: value
    };
    
    setFormData({
      ...formData,
      adjustmentRules: {
        ...formData.adjustmentRules,
        phases: newPhases
      }
    });
  };

  // Handle cycle length change
  const handleCycleLengthChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setFormData({
      ...formData,
      adjustmentRules: {
        ...formData.adjustmentRules,
        cycleLength: value
      }
    });
  };

  // Handle active status change
  const handleActiveChange = (e) => {
    setFormData({
      ...formData,
      isActive: e.target.checked
    });
  };

  // Validate form before submission
  const validateForm = () => {
    let isValid = true;

    if (!formData.occasionId.trim()) {
      setOccasionError('Occasion ID is required');
      isValid = false;
    }

    if (!formData.name.trim()) {
      setNameError('Name is required');
      isValid = false;
    }

    if (formData.dates.length === 0) {
      setDatesError('At least one date is required');
      isValid = false;
    }

    if (formData.affectedSignalIds.length === 0) {
      setSignalsError('At least one signal must be selected');
      isValid = false;
    }

    return isValid;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  // Get day name from dayOfWeek number
  const getDayName = (dayOfWeek) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  return (
    <div className="form-container">
      <h2 className="form-title">{isEditing ? 'Edit Occasion' : 'Create New Occasion'}</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="form-section">
          <h3 className="section-title">Basic Information</h3>
          <div className="form-group">
            <label htmlFor="occasionId">Occasion ID</label>
            <input
              type="text"
              id="occasionId"
              name="occasionId"
              value={formData.occasionId}
              onChange={handleChange}
              className={occasionError ? 'input-error' : ''}
              disabled={isEditing}
            />
            {occasionError && <div className="error-text">{occasionError}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={nameError ? 'input-error' : ''}
            />
            {nameError && <div className="error-text">{nameError}</div>}
          </div>

          <div className="form-group">
            <label>Dates</label>
            {datesError && <div className="error-text">{datesError}</div>}
            <div className="dates-container">
              {formData.dates.map((date, index) => (
                <div key={index} className="date-item">
                  <input
                    type="date"
                    value={date ? new Date(date).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleDateChange(e, index)}
                  />
                  <button 
                    type="button" 
                    className="icon-button remove-button"
                    onClick={() => removeDateField(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button 
                type="button" 
                className="add-button"
                onClick={addDateField}
              >
                + Add Date
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Affected Signals</label>
            {signalsError && <div className="error-text">{signalsError}</div>}
            <select 
              multiple 
              className="multi-select"
              onChange={handleSignalChange}
              value={formData.affectedSignalIds}
            >
              {signals && signals.map((signal) => (
                <option key={signal.signalId} value={signal.signalId}>
                  {signal.intersectionName} ({signal.signalId})
                </option>
              ))}
            </select>
            <div className="helper-text">Hold Ctrl (or Cmd) to select multiple signals</div>
          </div>

          <div className="form-group active-switch">
            <label htmlFor="isActive">Active</label>
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleActiveChange}
            />
          </div>
        </div>

        {/* Time Windows */}
        <div className="form-section">
          <h3 className="section-title">Time Windows</h3>
          {formData.timeWindows.map((timeWindow, index) => (
            <div key={index} className="time-window-item">
              <div className="time-window-header">
                <h4>Time Window {index + 1}</h4>
                {formData.timeWindows.length > 1 && (
                  <button 
                    type="button" 
                    className="icon-button remove-button"
                    onClick={() => removeTimeWindow(index)}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="time-window-content">
                <div className="form-group">
                  <label>Day of Week</label>
                  <select
                    value={timeWindow.dayOfWeek}
                    onChange={(e) => handleTimeWindowChange(index, 'dayOfWeek', e)}
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <option key={day} value={day}>
                        {getDayName(day)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="time-group">
                  <div className="form-group">
                    <label>Start Hour</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={timeWindow.startHour}
                      onChange={(e) => handleTimeWindowChange(index, 'startHour', e)}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Hour</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={timeWindow.endHour}
                      onChange={(e) => handleTimeWindowChange(index, 'endHour', e)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button 
            type="button" 
            className="add-button"
            onClick={addTimeWindow}
          >
            + Add Time Window
          </button>
        </div>

        {/* Signal Adjustment Rules */}
        <div className="form-section">
          <h3 className="section-title">Signal Adjustment Rules</h3>
          <div className="form-group">
            <label htmlFor="cycleLength">Cycle Length (seconds)</label>
            <input
              type="number"
              id="cycleLength"
              min="60"
              max="300"
              value={formData.adjustmentRules.cycleLength}
              onChange={handleCycleLengthChange}
            />
          </div>

          <div className="phases-section">
            <h4>Phase Durations</h4>
            <div className="phases-container">
              {formData.adjustmentRules.phases.map((phase, index) => (
                <div key={index} className="phase-item">
                  <div className="form-group">
                    <label>Phase</label>
                    <input
                      type="text"
                      value={phase.phaseId}
                      onChange={(e) => handlePhaseChange(index, 'phaseId', e)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Duration (seconds)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={phase.duration}
                      onChange={(e) => handlePhaseChange(index, 'duration', e)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">
            {isEditing ? 'Update Occasion' : 'Create Occasion'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OccasionForm; 