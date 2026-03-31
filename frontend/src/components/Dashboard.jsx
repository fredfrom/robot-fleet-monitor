import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRobots } from '../hooks/useRobots';
import { useStations } from '../hooks/useStations';
import { useAlerts } from '../hooks/useAlerts';
import { useTelemetryHistory } from '../hooks/useTelemetryHistory';
import { usePathHistory } from '../hooks/usePathHistory';
import RobotListPanel from './RobotListPanel';
import MapContainer from './MapContainer';
import ConnectionIndicator from './ConnectionIndicator';
import SimulationControls from './SimulationControls';
import FleetStatsHeader from './FleetStatsHeader';
import AlertToast from './AlertToast';
import RobotDetailPanel from './RobotDetailPanel';

export default function Dashboard() {
  const { token } = useAuth();
  const { robots, wsStatus, trailHistoryRef, lastMessage } = useRobots(token);
  const { stations } = useStations(token, lastMessage);
  const { alerts, alertCount } = useAlerts(robots);
  const [selectedRobotId, setSelectedRobotId] = useState(null);

  const selectedRobot = robots.find(r => r.id === selectedRobotId) || null;
  const telemetryHistory = useTelemetryHistory(selectedRobot);
  const pathHistory = usePathHistory(selectedRobotId);

  function handleRobotClick(robotOrId) {
    const id = typeof robotOrId === 'object' ? robotOrId.id : robotOrId;
    setSelectedRobotId(id);
  }

  const handleDeselect = useCallback(() => {
    setSelectedRobotId(null);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg text-text font-mono text-sm leading-normal">
      <FleetStatsHeader robots={robots} alertCount={alertCount} />
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <aside className="w-full md:w-[260px] lg:w-80 bg-surface border-r border-border flex flex-col shrink-0">
          <div className="p-md border-b border-border">
            <h1 className="font-sans text-xl font-semibold text-text mb-sm">FLEET MONITOR</h1>
            <SimulationControls />
          </div>
          <RobotListPanel
            robots={robots}
            selectedRobotId={selectedRobotId}
            onRobotClick={handleRobotClick}
          />
        </aside>
        <main className="flex-1 relative bg-bg min-h-[300px] md:min-h-0">
          <MapContainer
            robots={robots}
            stations={stations}
            selectedRobotId={selectedRobotId}
            onRobotClick={handleRobotClick}
            onDeselect={handleDeselect}
            trailHistoryRef={trailHistoryRef}
            pathHistoryPositions={pathHistory.positions}
          />
          <ConnectionIndicator status={wsStatus} />
          <AlertToast alerts={alerts} />
        </main>
        {selectedRobot && (
          <RobotDetailPanel
            robot={selectedRobot}
            onClose={handleDeselect}
            telemetryHistory={telemetryHistory}
            pathHistory={pathHistory}
          />
        )}
      </div>
    </div>
  );
}
