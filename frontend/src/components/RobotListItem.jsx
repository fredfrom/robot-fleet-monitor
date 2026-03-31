import { useRef, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import BatteryBar from './BatteryBar';
import TypeBadge from './TypeBadge';

export default function RobotListItem({ robot, selected, onClick }) {
  const itemRef = useRef(null);
  const robotType = robot.robotType || robot.type || 'ground';

  useEffect(() => {
    if (selected && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selected]);

  return (
    <div
      ref={itemRef}
      className={`p-md border-b border-border cursor-pointer transition-colors duration-150 hover:bg-[rgba(240,180,41,0.05)] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ${selected ? 'bg-[rgba(240,180,41,0.1)] border border-border-active shadow-[0_0_8px_rgba(240,180,41,0.25)]' : ''}`}
      tabIndex={0}
      role="button"
      onClick={() => onClick(robot)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(robot); } }}
    >
      <div className="font-sans text-sm font-semibold mb-xs flex items-center">
        {robot.name}
        <TypeBadge type={robotType} />
      </div>
      <StatusBadge status={robot.status} />
      <BatteryBar level={robot.battery} />
      <div className="text-[11px] text-text-muted font-mono">
        {robot.latitude.toFixed(4)}, {robot.longitude.toFixed(4)}
      </div>
    </div>
  );
}
