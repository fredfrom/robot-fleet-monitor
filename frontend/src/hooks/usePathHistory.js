import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

export function usePathHistory(robotId) {
  const [positions, setPositions] = useState([]);
  const [minutes, setMinutes] = useState(5); // default 5 min
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!robotId) {
      setPositions([]);
      return;
    }

    setLoading(true);
    const query = minutes === 0 ? '' : `?minutes=${minutes}`;
    apiFetch(`/robots/${robotId}/positions${query}`)
      .then(data => setPositions(data || []))
      .catch(() => setPositions([]))
      .finally(() => setLoading(false));
  }, [robotId, minutes]);

  return { positions, minutes, setMinutes, loading };
}
