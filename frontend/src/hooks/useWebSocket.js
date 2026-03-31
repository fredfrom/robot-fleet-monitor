import { useRef, useState, useEffect, useCallback } from 'react';

const INITIAL_RETRY_MS = 3000;
const MAX_RETRY_MS = 30000;

export function useWebSocket(url) {
  const wsRef = useRef(null);
  const retryMs = useRef(INITIAL_RETRY_MS);
  const reconnectTimer = useRef(null);
  const [status, setStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);

  const connect = useCallback(() => {
    if (!url) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      retryMs.current = INITIAL_RETRY_MS;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setStatus('reconnecting');
      const delay = retryMs.current;
      retryMs.current = Math.min(retryMs.current * 2, MAX_RETRY_MS);
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url]);

  useEffect(() => {
    if (!url) {
      setStatus('disconnected');
      return;
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { status, lastMessage };
}
