import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

export function useStations(token, lastMessage) {
  const [stations, setStations] = useState([]);

  // Initial REST load
  useEffect(() => {
    if (!token) return;
    apiFetch('/stations')
      .then((data) => { if (Array.isArray(data)) setStations(data); })
      .catch((err) => console.error('Failed to fetch stations:', err));
  }, [token]);

  // Merge WS station occupancy updates
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'position_update' || !lastMessage.stations) return;
    setStations(lastMessage.stations);
  }, [lastMessage]);

  return { stations };
}
