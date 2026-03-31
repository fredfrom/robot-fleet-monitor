import RobotListItem from './RobotListItem';

export default function RobotListPanel({ robots, selectedRobotId, onRobotClick }) {
  if (robots.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="py-2xl px-md text-center">
          <div className="font-sans text-base text-text-muted mb-sm">No Robots Detected</div>
          <div className="text-[11px] text-text-muted leading-relaxed">
            Start the simulation to begin monitoring patrol activity.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {robots.map((robot) => (
        <div key={robot.id} data-robot-id={robot.id}>
          <RobotListItem
            robot={robot}
            selected={robot.id === selectedRobotId}
            onClick={onRobotClick}
          />
        </div>
      ))}
    </div>
  );
}
