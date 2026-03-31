const TYPE_STYLES = {
  ground: 'bg-status-ok/15 text-status-ok border border-status-ok/30',
  air: 'bg-status-charging/15 text-status-charging border border-status-charging/30',
};

export default function TypeBadge({ type }) {
  const label = type === 'air' ? 'AIR' : 'GND';
  const variant = type === 'air' ? 'air' : 'ground';

  return (
    <span className={`inline-flex items-center px-sm py-xs font-mono text-[9px] font-bold uppercase tracking-wider leading-none ml-sm ${TYPE_STYLES[variant]}`}>
      {label}
    </span>
  );
}
