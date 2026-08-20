const cron = require('node-cron');
const Occasion = require('../models/Occasion');
const Signal = require('../models/Signal');

/**
 * Auto-applies/reverts Occasion timing rules based on their time windows.
 * Recomputed from scratch every tick (idempotent) rather than tracked as
 * separate state, so it self-corrects regardless of what happened before.
 * Signals under a manual override or event-mode block are left untouched —
 * manual control always wins over scheduling.
 */
// Mongoose auto-assigns each phase subdocument its own _id, so two
// independently-created documents' phases never JSON-match even when their
// business data (phaseId/duration) is identical. Compare only the fields
// that matter.
const normalizePhases = (phases) => (phases || []).map((p) => ({ phaseId: p.phaseId, duration: p.duration }));

async function runSchedulerTick(now = new Date()) {
  const day = now.getDay();
  const hour = now.getHours();

  const occasions = await Occasion.find({ isActive: true });

  const desiredBySignal = new Map(); // signalId -> occasion that should currently apply
  const allManagedSignalIds = new Set();

  occasions.forEach((occasion) => {
    occasion.affectedSignalIds.forEach((id) => allManagedSignalIds.add(id));

    const inWindow = occasion.timeWindows.some(
      (w) => w.dayOfWeek === day && hour >= w.startHour && hour < w.endHour
    );
    if (inWindow) {
      occasion.affectedSignalIds.forEach((signalId) => {
        if (!desiredBySignal.has(signalId)) {
          desiredBySignal.set(signalId, occasion);
        }
      });
    }
  });

  const results = [];

  for (const signalId of allManagedSignalIds) {
    const signal = await Signal.findOne({ signalId });
    if (!signal) continue;
    if (signal.status === 'overridden' || signal.status === 'blocked') continue;

    const occasion = desiredBySignal.get(signalId);

    if (occasion) {
      const { cycleLength, phases } = occasion.adjustmentRules;
      const alreadyApplied =
        signal.currentTiming?.cycleLength === cycleLength &&
        JSON.stringify(normalizePhases(signal.currentTiming?.phases)) === JSON.stringify(normalizePhases(phases));

      if (!alreadyApplied) {
        const previousStatus = signal.status;
        signal.currentTiming = { cycleLength, phases };
        signal.status = 'altered';
        signal.lastUpdated = new Date();
        signal.auditLog.unshift({
          action: 'schedule_applied',
          officerName: occasion.officerName || 'scheduler',
          reason: `Auto-applied schedule "${occasion.name}"`,
          previousStatus,
          newStatus: 'altered',
          timestamp: new Date(),
        });
        signal.auditLog = signal.auditLog.slice(0, 50);
        await signal.save();
        results.push({ signalId, action: 'applied', occasionId: occasion.occasionId });
      }
    } else if (signal.status === 'altered') {
      signal.currentTiming = signal.defaultTiming;
      signal.status = 'normal';
      signal.lastUpdated = new Date();
      signal.auditLog.unshift({
        action: 'schedule_reset',
        officerName: 'scheduler',
        reason: 'No active schedule window',
        previousStatus: 'altered',
        newStatus: 'normal',
        timestamp: new Date(),
      });
      signal.auditLog = signal.auditLog.slice(0, 50);
      await signal.save();
      results.push({ signalId, action: 'reset' });
    }
  }

  return results;
}

function startScheduler() {
  cron.schedule('* * * * *', () => {
    runSchedulerTick().catch((err) => console.error('Scheduler tick failed:', err));
  });
}

module.exports = { startScheduler, runSchedulerTick };
