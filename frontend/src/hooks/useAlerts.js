import { useState, useEffect, useRef, useCallback } from 'react';

const TOAST_DURATION = 5000;
const MAX_VISIBLE = 3;
const COOLDOWN_MS = 30000;
const OFFLINE_THRESHOLD = 10000;
const OFFLINE_CHECK_INTERVAL = 2000;

export function useAlerts(robots) {
  const [alerts, setAlerts] = useState([]);
  const prevStateRef = useRef({});
  const cooldownRef = useRef({});
  const timersRef = useRef([]);
  const intervalRef = useRef(null);

  const addAlert = useCallback((alert) => {
    setAlerts((prev) => {
      const next = [...prev, alert];
      // Max 3 visible -- remove oldest when adding 4th
      if (next.length > MAX_VISIBLE) {
        return next.slice(next.length - MAX_VISIBLE);
      }
      return next;
    });

    // Auto-remove after TOAST_DURATION
    const timer = setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    }, TOAST_DURATION);

    timersRef.current.push(timer);
  }, []);

  const canAlert = useCallback((robotId, type) => {
    const key = `${robotId}-${type}`;
    const last = cooldownRef.current[key];
    if (last && Date.now() - last < COOLDOWN_MS) return false;
    cooldownRef.current[key] = Date.now();
    return true;
  }, []);

  // Detect battery and recovery events on robot data changes
  useEffect(() => {
    if (!robots || robots.length === 0) return;

    for (const robot of robots) {
      const prev = prevStateRef.current[robot.id];

      // Low battery detection
      if (robot.battery <= 20) {
        if (!prev || prev.battery > 20 || canAlert(robot.id, 'battery')) {
          if (prev && prev.battery <= 20) {
            // Already alerted and within cooldown -- skip
          } else {
            addAlert({
              id: Date.now() + '-bat-' + robot.id,
              type: 'warning',
              title: 'LOW BATTERY',
              body: robot.name + ' battery at ' + robot.battery + '%',
              timestamp: Date.now(),
            });
          }
        }
      }

      // Recovery detection (was offline, now got update)
      if (prev && prev.offline) {
        addAlert({
          id: Date.now() + '-rec-' + robot.id,
          type: 'recovery',
          title: 'ROBOT ONLINE',
          body: robot.name + ' reconnected',
          timestamp: Date.now(),
        });
      }

      // Charging status transition alerts
      if (prev) {
        if (prev.status !== 'returning' && robot.status === 'returning' && canAlert(robot.id, 'charging-transition')) {
          addAlert({
            id: Date.now() + '-ret-' + robot.id,
            type: 'info',
            title: robot.name + ' -- LOW BATTERY',
            body: 'Battery at ' + robot.battery + '%. Returning to charge.',
            timestamp: Date.now(),
          });
        }

        if (prev.status !== 'charging' && robot.status === 'charging' && canAlert(robot.id, 'charging-transition')) {
          addAlert({
            id: Date.now() + '-chg-' + robot.id,
            type: 'info',
            title: robot.name + ' -- CHARGING',
            body: 'Docked at charging station.',
            timestamp: Date.now(),
          });
        }

        if (prev.status === 'charging' && robot.status !== 'charging' && robot.status !== 'dead' && canAlert(robot.id, 'charging-transition')) {
          addAlert({
            id: Date.now() + '-resume-' + robot.id,
            type: 'recovery',
            title: robot.name + ' -- PATROL RESUMED',
            body: 'Fully charged. Resuming patrol route.',
            timestamp: Date.now(),
          });
        }

        if (prev.status !== 'dead' && robot.status === 'dead' && canAlert(robot.id, 'charging-transition')) {
          addAlert({
            id: Date.now() + '-dead-' + robot.id,
            type: 'warning',
            title: robot.name + ' -- BATTERY DEAD',
            body: 'Battery depleted. Awaiting available charging station.',
            timestamp: Date.now(),
          });
        }
      }

      // Update prevState with latest seen timestamp
      prevStateRef.current[robot.id] = {
        battery: robot.battery,
        status: robot.status,
        lastSeen: Date.now(),
        offline: false,
      };
    }
  }, [robots, addAlert, canAlert]);

  // Offline detection via interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const prev = prevStateRef.current;

      for (const robotId of Object.keys(prev)) {
        const state = prev[robotId];
        if (!state.offline && now - state.lastSeen > OFFLINE_THRESHOLD) {
          if (canAlert(robotId, 'offline')) {
            const robotName = 'Robot ' + robotId;
            addAlert({
              id: now + '-off-' + robotId,
              type: 'warning',
              title: 'ROBOT OFFLINE',
              body: robotName + ' — no signal for 10s',
              timestamp: now,
            });
            prev[robotId] = { ...state, offline: true };
          }
        }
      }
    }, OFFLINE_CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [addAlert, canAlert]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      for (const t of timersRef.current) clearTimeout(t);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // alertCount = robots with battery <= 20, offline, or dead
  const alertCount =
    robots.filter((r) => r.battery <= 20).length +
    robots.filter((r) => r.status === 'dead').length +
    Object.values(prevStateRef.current).filter((s) => s.offline).length;

  return { alerts, alertCount };
}
