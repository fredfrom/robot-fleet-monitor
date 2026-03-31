import { useRef } from 'react';
import CameraFeed from './CameraFeed';
import SensorCharts from './SensorCharts';
import AviationInstruments from './AviationInstruments';
import PathHistoryControl from './PathHistoryControl';
import StatusBadge from './StatusBadge';
import BatteryBar from './BatteryBar';
import TypeBadge from './TypeBadge';

const TASK_MAP = {
  active: 'Patrol',
  moving: 'Patrol',
  returning: 'Returning',
  charging: 'Charging',
  dead: 'Dead',
  idle: 'Idle',
};

function formatUptime(startRef) {
  const elapsed = Date.now() - startRef;
  const totalMin = Math.floor(elapsed / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

export default function RobotDetailPanel({ robot, onClose, telemetryHistory, pathHistory }) {
  const uptimeStart = useRef(Date.now());

  if (!robot) return null;

  const headingDeg = robot.heading != null
    ? (robot.heading * (180 / Math.PI)).toFixed(1)
    : '0.0';

  const position = `${(robot.latitude ?? 0).toFixed(4)}, ${(robot.longitude ?? 0).toFixed(4)}`;
  const task = TASK_MAP[robot.status] || 'Unknown';

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:w-[460px] shrink-0 bg-surface border-l border-border overflow-y-auto transition-transform duration-300 ease-out translate-x-0">
      <div className="p-md flex items-center gap-sm sticky top-0 bg-surface z-[1] border-b border-border">
        <h2 className="font-sans text-xl font-semibold text-text m-0 whitespace-nowrap overflow-hidden text-ellipsis">{robot.name}</h2>
        <TypeBadge type={robot.robotType} />
        <StatusBadge status={robot.status} />
        <button
          className="w-[44px] h-[44px] ml-auto bg-transparent border-none text-text-muted font-mono text-sm cursor-pointer flex items-center justify-center shrink-0 transition-colors duration-150 hover:text-accent hover:bg-[rgba(240,180,41,0.1)] focus:outline-none focus:ring-2 focus:ring-accent"
          onClick={onClose}
          aria-label="Close detail panel"
        >
          X
        </button>
      </div>

      <div className="px-md my-md">
        <CameraFeed robot={robot} />
      </div>

      <div className="px-md my-md">
        {robot.robotType === 'air'
          ? <AviationInstruments robot={robot} />
          : <SensorCharts robot={robot} />
        }
      </div>

      {pathHistory && (
        <div className="px-md my-md">
          <PathHistoryControl
            minutes={pathHistory.minutes}
            setMinutes={pathHistory.setMinutes}
            positionCount={pathHistory.positions.length}
            loading={pathHistory.loading}
          />
        </div>
      )}

      <div className="px-md my-md">
        <div className="grid grid-cols-[auto_1fr] gap-x-md gap-y-sm border-t border-border pt-md mt-md items-center">
          <span className="font-mono text-[11px] font-bold text-text-muted uppercase text-right">TYPE</span>
          <span className="font-mono text-sm text-text"><TypeBadge type={robot.robotType} /></span>

          <span className="font-mono text-[11px] font-bold text-text-muted uppercase text-right">STATUS</span>
          <span className="font-mono text-sm text-text"><StatusBadge status={robot.status} /></span>

          <span className="font-mono text-[11px] font-bold text-text-muted uppercase text-right">BATTERY</span>
          <span className="font-mono text-sm text-text"><BatteryBar level={robot.battery} /></span>

          <span className="font-mono text-[11px] font-bold text-text-muted uppercase text-right">TASK</span>
          <span className="font-mono text-sm text-text">{task}</span>

          <span className="font-mono text-[11px] font-bold text-text-muted uppercase text-right">UPTIME</span>
          <span className="font-mono text-sm text-text">{formatUptime(uptimeStart.current)}</span>

          <span className="font-mono text-[11px] font-bold text-text-muted uppercase text-right">POSITION</span>
          <span className="font-mono text-sm text-text">{position}</span>

          <span className="font-mono text-[11px] font-bold text-text-muted uppercase text-right">HEADING</span>
          <span className="font-mono text-sm text-text">{headingDeg} deg</span>
        </div>
      </div>
    </div>
  );
}
