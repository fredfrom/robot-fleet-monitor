const LABEL_MAP = {
  moving: 'MOVING',
  active: 'MOVING',
  idle: 'IDLE',
  returning: 'RETURNING',
  charging: 'CHARGING',
  dead: 'DEAD',
};

const DOT_COLOR = {
  moving: 'bg-status-ok',
  active: 'bg-status-ok',
  idle: 'bg-text-muted',
  returning: 'bg-accent',
  charging: 'bg-status-charging',
  dead: 'bg-status-alert',
};

export default function StatusBadge({ status }) {
  const label = LABEL_MAP[status] || status.toUpperCase();
  const dotColor = DOT_COLOR[status] || 'bg-text-muted';

  return (
    <span className="inline-flex items-center gap-xs text-[11px] uppercase tracking-wider">
      <span className={`w-2 h-2 inline-block ${dotColor}`} />
      {label}
    </span>
  );
}
