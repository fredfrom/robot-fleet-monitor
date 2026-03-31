const TIME_FRAMES = [
  { value: 1, label: '1m' },
  { value: 5, label: '5m' },
  { value: 15, label: '15m' },
  { value: 0, label: 'All' },
];

export default function PathHistoryControl({ minutes, setMinutes, positionCount, loading }) {
  return (
    <div>
      <div className="font-mono text-[11px] font-bold text-text-muted uppercase mb-sm">PATH HISTORY</div>
      <div className="flex items-center gap-sm">
        <div className="flex gap-xs">
          {TIME_FRAMES.map(tf => {
            const isActive = minutes === tf.value;
            return (
              <button
                key={tf.value}
                onClick={() => setMinutes(tf.value)}
                className={`min-h-[44px] min-w-[44px] px-sm py-sm font-mono text-[11px] border rounded cursor-pointer transition-colors duration-150
                  ${isActive
                    ? 'bg-accent/20 text-accent border-accent'
                    : 'bg-surface text-text-muted border-border hover:text-text hover:border-text-muted'
                  }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
        <span className="font-mono text-[11px] text-text-muted">
          {loading ? (
            <span className="inline-block w-[6px] h-[6px] rounded-full bg-accent animate-pulse" />
          ) : (
            `${positionCount} pts`
          )}
        </span>
      </div>
    </div>
  );
}
