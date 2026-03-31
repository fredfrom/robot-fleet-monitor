import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api/client';
import { useWebSocket } from './useWebSocket';

export function useRobots(token) {
  const [robots, setRobots] = useState([]);
  const trailHistoryRef = useRef({});

  const apiUrl = import.meta.env.VITE_API_URL;
  const wsHost = apiUrl ? new URL(apiUrl).host : window.location.host;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = token ? `${wsProtocol}//${wsHost}/ws?token=${token}` : null;
  const { status: wsStatus, lastMessage } = useWebSocket(wsUrl);

  // Initial REST load
  useEffect(() => {
    if (!token) return;

    apiFetch('/robots')
      .then((data) => {
        if (Array.isArray(data)) {
          setRobots(data);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch robots:', err);
      });
  }, [token]);

  // Merge WebSocket position updates
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'position_update') return;

    const updates = lastMessage.data;
    if (!Array.isArray(updates)) return;

    // Update trail history for each robot in the update
    for (const update of updates) {
      if (update.id == null || update.longitude == null || update.latitude == null) continue;

      if (!trailHistoryRef.current[update.id]) {
        trailHistoryRef.current[update.id] = [];
      }

      const trail = trailHistoryRef.current[update.id];
      trail.push([update.longitude, update.latitude]);

      // Keep only last 20 positions
      if (trail.length > 20) {
        trail.shift();
      }
    }

    setRobots((prev) => {
      const robotMap = new Map(prev.map((r) => [r.id, r]));

      for (const update of updates) {
        const existing = robotMap.get(update.id);
        if (existing) {
          // WS updates include robotType and heading (from simulator) — spread merge passes them through
          robotMap.set(update.id, { ...existing, ...update });
        } else {
          robotMap.set(update.id, update);
        }
      }

      return Array.from(robotMap.values());
    });
  }, [lastMessage]);

  return { robots, wsStatus, trailHistoryRef, lastMessage };
}
