export default function FleetStatsHeader({ robots, alertCount }) {
  const total = robots.length;
  const active = robots.filter((r) => r.status === 'active' || r.status === 'moving').length;
  const avgBattery = Math.round(
    robots.reduce((sum, r) => sum + r.battery, 0) / (robots.length || 1)
  );
  const chargingCount = robots.filter((r) => r.status === 'charging' || r.status === 'returning').length;
  const groundCount = robots.filter((r) => (r.robotType || r.type) === 'ground').length;
  const airCount = robots.filter((r) => (r.robotType || r.type) === 'air').length;

  return (
    <div className="flex flex-row gap-md px-md py-sm bg-surface border-b border-border shrink-0">
      <div className="flex-1 min-w-0 p-sm border border-border/60 flex flex-col items-center shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <span className="font-sans text-xl font-semibold text-text leading-tight">{total}</span>
        <span className="font-mono text-[11px] text-text-muted leading-snug uppercase tracking-widest">TOTAL ROBOTS</span>
        <span className="font-mono text-[9px] text-text-muted leading-snug">{groundCount} GND / {airCount} AIR</span>
      </div>
      <div className="flex-1 min-w-0 p-sm border border-border/60 flex flex-col items-center shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <span className="font-sans text-xl font-semibold text-text leading-tight">{active}</span>
        <span className="font-mono text-[11px] text-text-muted leading-snug uppercase tracking-widest">ACTIVE</span>
      </div>
      <div className="flex-1 min-w-0 p-sm border border-status-charging/40 flex flex-col items-center shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <span className="font-sans text-xl font-semibold text-status-charging leading-tight">{chargingCount}</span>
        <span className="font-mono text-[11px] text-text-muted leading-snug uppercase tracking-widest">CHARGING</span>
      </div>
      <div className="flex-1 min-w-0 p-sm border border-border/60 flex flex-col items-center shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <span className="font-sans text-xl font-semibold text-text leading-tight">{avgBattery}%</span>
        <span className="font-mono text-[11px] text-text-muted leading-snug uppercase tracking-widest">AVG BATTERY</span>
      </div>
      <div className={`flex-1 min-w-0 p-sm border flex flex-col items-center shadow-[0_1px_3px_rgba(0,0,0,0.3)] ${alertCount > 0 ? 'border-status-alert/40' : 'border-border/60'}`}>
        <span className={`font-sans text-xl font-semibold leading-tight ${alertCount > 0 ? 'text-status-alert' : 'text-text'}`}>{alertCount}</span>
        <span className="font-mono text-[11px] text-text-muted leading-snug uppercase tracking-widest">ALERTS</span>
      </div>
    </div>
  );
}
