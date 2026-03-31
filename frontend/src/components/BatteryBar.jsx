export default function BatteryBar({ level }) {
  const isLow = level > 0 && level <= 20;
  const isDead = level === 0;
  const fillColor = level > 20 ? 'var(--color-status-ok)' : 'var(--color-status-alert)';

  return (
    <div className={`flex items-center gap-sm text-[11px] ${isLow ? 'animate-pulse text-amber-400' : 'text-text-muted'}`}>
      <span>{isDead ? 'BAT DEAD' : `BAT ${level}%`}</span>
      <div className="flex-1 h-1 bg-border">
        <div
          className="h-full transition-[width] duration-300"
          style={{
            width: `${level}%`,
            backgroundColor: fillColor,
            ...(isLow ? { boxShadow: '0 0 6px rgba(245, 158, 11, 0.6)' } : {}),
          }}
        />
      </div>
    </div>
  );
}
