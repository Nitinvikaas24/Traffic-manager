import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Grid,
  IconButton,
  Autocomplete,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useAuth } from '../context/AuthContext';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const defaultFormData = () => ({
  occasionId: '',
  name: '',
  dates: [],
  timeWindows: [{ dayOfWeek: 0, startHour: 8, endHour: 12 }],
  affectedSignalIds: [],
  adjustmentRules: {
    cycleLength: 120,
    phases: [
      { phaseId: 'MainRd_Green', duration: 60 },
      { phaseId: 'MainRd_Amber', duration: 5 },
      { phaseId: 'SideRd_Green', duration: 30 },
      { phaseId: 'SideRd_Amber', duration: 5 },
      { phaseId: 'All_Red', duration: 20 },
    ],
  },
  isActive: true,
  reason: '',
});

const OccasionForm = ({ signals, initialData, onSubmit, isEditing = false }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(defaultFormData());
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        ...defaultFormData(),
        ...initialData,
        dates: (initialData.dates || []).map((d) => new Date(d)),
      });
    }
  }, [isEditing, initialData]);

  const setField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleDateChange = (index, value) => {
    const next = [...formData.dates];
    next[index] = value;
    setField('dates', next);
  };

  const addDate = () => setField('dates', [...formData.dates, new Date()]);
  const removeDate = (index) => setField('dates', formData.dates.filter((_, i) => i !== index));

  const handleTimeWindowChange = (index, field, value) => {
    const next = [...formData.timeWindows];
    next[index] = { ...next[index], [field]: Number(value) };
    setField('timeWindows', next);
  };

  const addTimeWindow = () =>
    setField('timeWindows', [...formData.timeWindows, { dayOfWeek: 0, startHour: 8, endHour: 12 }]);
  const removeTimeWindow = (index) => setField('timeWindows', formData.timeWindows.filter((_, i) => i !== index));

  const handlePhaseChange = (index, field, value) => {
    const next = [...formData.adjustmentRules.phases];
    next[index] = { ...next[index], [field]: field === 'duration' ? Number(value) : value };
    setField('adjustmentRules', { ...formData.adjustmentRules, phases: next });
  };

  const handleCycleLengthChange = (value) =>
    setField('adjustmentRules', { ...formData.adjustmentRules, cycleLength: Number(value) });

  const validateForm = () => {
    const next = {};
    if (!formData.occasionId.trim()) next.occasionId = 'Occasion ID is required';
    if (!formData.name.trim()) next.name = 'Name is required';
    if (formData.dates.length === 0) next.dates = 'At least one date is required';
    if (formData.affectedSignalIds.length === 0) next.affectedSignalIds = 'At least one signal must be selected';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) onSubmit(formData);
  };

  const selectedSignals = signals.filter((s) => formData.affectedSignalIds.includes(s.signalId));

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {isEditing ? 'Edit Occasion' : 'Create New Occasion'}
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Basic Information
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Occasion ID"
              value={formData.occasionId}
              onChange={(e) => setField('occasionId', e.target.value)}
              error={Boolean(errors.occasionId)}
              helperText={errors.occasionId}
              disabled={isEditing}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setField('name', e.target.value)}
              error={Boolean(errors.name)}
              helperText={errors.name}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Created By"
              value={user ? `${user.username} (${user.role})` : ''}
              disabled
              helperText="Recorded automatically from your login — not editable"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Reason"
              value={formData.reason}
              onChange={(e) => setField('reason', e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Dates
            </Typography>
            {errors.dates && (
              <Typography variant="caption" color="error">
                {errors.dates}
              </Typography>
            )}
            <Stack spacing={1}>
              {formData.dates.map((date, index) => (
                <Stack direction="row" spacing={1} alignItems="center" key={index}>
                  <DatePicker
                    value={date}
                    onChange={(value) => handleDateChange(index, value)}
                    slotProps={{ textField: { size: 'small' } }}
                  />
                  <IconButton onClick={() => removeDate(index)} size="small">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<AddIcon />} onClick={addDate} size="small" sx={{ alignSelf: 'flex-start' }}>
                Add Date
              </Button>
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={signals}
              getOptionLabel={(s) => `${s.intersectionName} (${s.signalId})`}
              value={selectedSignals}
              isOptionEqualToValue={(option, value) => option.signalId === value.signalId}
              onChange={(_, value) => setField('affectedSignalIds', value.map((s) => s.signalId))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Affected Signals"
                  error={Boolean(errors.affectedSignalIds)}
                  helperText={errors.affectedSignalIds}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={formData.isActive} onChange={(e) => setField('isActive', e.target.checked)} />}
              label="Active"
            />
          </Grid>
        </Grid>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Time Windows
        </Typography>
        <Stack spacing={2} sx={{ mb: 3 }}>
          {formData.timeWindows.map((window, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Day of Week"
                    value={window.dayOfWeek}
                    onChange={(e) => handleTimeWindowChange(index, 'dayOfWeek', e.target.value)}
                  >
                    {DAY_NAMES.map((day, dayIndex) => (
                      <MenuItem key={day} value={dayIndex}>
                        {day}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={5} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Start Hour"
                    inputProps={{ min: 0, max: 23 }}
                    value={window.startHour}
                    onChange={(e) => handleTimeWindowChange(index, 'startHour', e.target.value)}
                  />
                </Grid>
                <Grid item xs={5} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="End Hour"
                    inputProps={{ min: 0, max: 23 }}
                    value={window.endHour}
                    onChange={(e) => handleTimeWindowChange(index, 'endHour', e.target.value)}
                  />
                </Grid>
                <Grid item xs={2} sm={2}>
                  {formData.timeWindows.length > 1 && (
                    <IconButton onClick={() => removeTimeWindow(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Grid>
              </Grid>
            </Paper>
          ))}
          <Button startIcon={<AddIcon />} onClick={addTimeWindow} size="small" sx={{ alignSelf: 'flex-start' }}>
            Add Time Window
          </Button>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Signal Adjustment Rules
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Cycle Length (seconds)"
              inputProps={{ min: 60, max: 300 }}
              value={formData.adjustmentRules.cycleLength}
              onChange={(e) => handleCycleLengthChange(e.target.value)}
            />
          </Grid>
        </Grid>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {formData.adjustmentRules.phases.map((phase, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  label="Phase"
                  value={phase.phaseId}
                  onChange={(e) => handlePhaseChange(index, 'phaseId', e.target.value)}
                />
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Duration (seconds)"
                  inputProps={{ min: 1, max: 120 }}
                  value={phase.duration}
                  onChange={(e) => handlePhaseChange(index, 'duration', e.target.value)}
                />
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Button type="submit" variant="contained" size="large">
          {isEditing ? 'Update Occasion' : 'Create Occasion'}
        </Button>
      </Box>
    </Paper>
  );
};

export default OccasionForm;
