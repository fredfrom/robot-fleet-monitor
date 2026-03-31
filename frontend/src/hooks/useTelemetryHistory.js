import { useState, useEffect, useRef } from 'react';

export function useTelemetryHistory(robot, maxPoints = 30) {
  const historyRef = useRef([]);
  const [history, setHistory] = useState([]);
  const prevIdRef = useRef(null);

  useEffect(() => {
    if (!robot) {
      historyRef.current = [];
      setHistory([]);
      prevIdRef.current = null;
      return;
    }

    // Reset buffer when robot changes
    if (prevIdRef.current !== robot.id) {
      historyRef.current = [];
      prevIdRef.current = robot.id;
    }

    const point = {
      battery: robot.battery ?? 0,
      speed: robot.speed ?? 0,
      heading: robot.heading != null
        ? +(robot.heading * (180 / Math.PI)).toFixed(1)
        : 0,
      ts: Date.now(),
    };

    historyRef.current.push(point);
    if (historyRef.current.length > maxPoints) {
      historyRef.current.shift();
    }

    setHistory([...historyRef.current]);
  }, [robot?.id, robot?.battery, robot?.speed, robot?.heading, maxPoints]);

  return history;
}
