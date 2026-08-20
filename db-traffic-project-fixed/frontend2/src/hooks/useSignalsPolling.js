import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';

/**
 * Polls GET /api/signals on an interval, tracks which signals changed since
 * the last poll (by lastUpdated), and exposes a local-patch helper so control
 * actions can reflect immediately without waiting for the next poll tick.
 */
export default function useSignalsPolling(intervalMs = 10000) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);
  const [changedSignalIds, setChangedSignalIds] = useState([]);
  const previousRef = useRef(new Map()); // signalId -> lastUpdated

  const fetchSignals = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/signals');
      const changed = [];
      data.forEach((s) => {
        const prevUpdated = previousRef.current.get(s.signalId);
        if (prevUpdated && prevUpdated !== s.lastUpdated) changed.push(s.signalId);
        previousRef.current.set(s.signalId, s.lastUpdated);
      });
      setSignals(data);
      setChangedSignalIds(changed);
      setLastSynced(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    const id = setInterval(fetchSignals, intervalMs);
    return () => clearInterval(id);
  }, [fetchSignals, intervalMs]);

  // Merge a single freshly-updated signal (e.g. after an override/timing PATCH)
  // into state immediately, instead of waiting for the next poll.
  const patchSignal = useCallback((updatedSignal) => {
    previousRef.current.set(updatedSignal.signalId, updatedSignal.lastUpdated);
    setSignals((prev) => prev.map((s) => (s.signalId === updatedSignal.signalId ? updatedSignal : s)));
  }, []);

  const patchSignals = useCallback((updatedSignals) => {
    updatedSignals.forEach((s) => previousRef.current.set(s.signalId, s.lastUpdated));
    setSignals((prev) =>
      prev.map((s) => updatedSignals.find((u) => u.signalId === s.signalId) || s)
    );
  }, []);

  // Add a newly-created signal (e.g. from the Add-Signal dialog) so it
  // appears on the map immediately, instead of waiting for the next poll.
  const addSignal = useCallback((newSignal) => {
    previousRef.current.set(newSignal.signalId, newSignal.lastUpdated);
    setSignals((prev) => (prev.some((s) => s.signalId === newSignal.signalId) ? prev : [...prev, newSignal]));
  }, []);

  return {
    signals,
    loading,
    error,
    lastSynced,
    changedSignalIds,
    refresh: fetchSignals,
    patchSignal,
    patchSignals,
    addSignal,
  };
}
