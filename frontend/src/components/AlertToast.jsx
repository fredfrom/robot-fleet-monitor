const BORDER_COLOR = {
  info: 'border-l-accent',
  warning: 'border-l-status-alert',
  recovery: 'border-l-status-ok',
};

export default function AlertToast({ alerts }) {
  return (
    <div className="fixed bottom-md right-md z-[1000] w-[360px] flex flex-col-reverse gap-sm">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`bg-surface border border-border border-l-4 px-md py-sm animate-[toastEnter_300ms_ease-out] ${BORDER_COLOR[alert.type] || BORDER_COLOR.info}`}
        >
          <div className="font-mono text-sm font-bold text-text leading-snug">{alert.title}</div>
          <div className="font-mono text-[11px] text-text-muted leading-snug">{alert.body}</div>
        </div>
      ))}
    </div>
  );
}
