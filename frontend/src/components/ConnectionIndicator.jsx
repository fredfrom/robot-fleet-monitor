const STATUS_TEXT = {
  connected: 'LIVE',
  reconnecting: 'RECONNECTING',
  disconnected: 'OFFLINE',
};

const STATUS_STYLES = {
  connected: { text: 'text-status-ok', dot: 'bg-status-ok' },
  reconnecting: { text: 'text-accent', dot: 'bg-accent animate-[connPulse_1.5s_ease-in-out_infinite]' },
  disconnected: { text: 'text-status-alert', dot: 'bg-status-alert' },
};

export default function ConnectionIndicator({ status }) {
  const text = STATUS_TEXT[status] || STATUS_TEXT.disconnected;
  const styles = STATUS_STYLES[status] || STATUS_STYLES.disconnected;

  return (
    <div className={`absolute bottom-md right-md z-10 flex items-center gap-xs px-sm py-xs bg-surface/90 border border-border text-[11px] uppercase ${styles.text}`}>
      <span className={`w-2 h-2 inline-block ${styles.dot}`} />
      {text}
    </div>
  );
}
