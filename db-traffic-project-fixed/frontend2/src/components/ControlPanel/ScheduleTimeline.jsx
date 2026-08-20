import React, { useMemo } from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
} from '@mui/lab';
import { Typography, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function nextOccurrence(window, from) {
  const result = new Date(from);
  const daysAhead = (window.dayOfWeek - from.getDay() + 7) % 7;
  result.setDate(from.getDate() + daysAhead);
  result.setHours(window.startHour, 0, 0, 0);
  if (result < from) result.setDate(result.getDate() + 7);
  return result;
}

export default function ScheduleTimeline({ occasions }) {
  const entries = useMemo(() => {
    const now = new Date();
    const list = [];
    occasions
      .filter((o) => o.isActive)
      .forEach((occasion) => {
        (occasion.timeWindows || []).forEach((window) => {
          list.push({
            occasionId: occasion.occasionId,
            name: occasion.name,
            window,
            next: nextOccurrence(window, now),
            affected: occasion.affectedSignalIds.length,
          });
        });
      });
    return list.sort((a, b) => a.next - b.next).slice(0, 10);
  }, [occasions]);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1">Upcoming Schedules</Typography>
        <Button size="small" component={Link} to="/occasions/create">
          + New (S)
        </Button>
      </Box>

      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No upcoming schedules
        </Typography>
      ) : (
        <Timeline sx={{ p: 0, m: 0 }}>
          {entries.map((entry, index) => (
            <TimelineItem key={`${entry.occasionId}-${index}`}>
              <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.4 }}>
                <Typography variant="caption">
                  {DAY_NAMES[entry.window.dayOfWeek]} {entry.window.startHour}:00–{entry.window.endHour}:00
                </Typography>
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot color="primary" />
                {index < entries.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Typography variant="body2">{entry.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {entry.affected} signals affected
                </Typography>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </Box>
  );
}
