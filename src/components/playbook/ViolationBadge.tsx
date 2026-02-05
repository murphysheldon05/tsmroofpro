interface ViolationBadgeProps {
  type: 'MINOR' | 'MAJOR' | 'SEVERE';
}

export function ViolationBadge({ type }: ViolationBadgeProps) {
  const config = {
    MINOR: { bg: '#EAB30820', text: '#EAB308', border: '#EAB30850' },
    MAJOR: { bg: '#F9731620', text: '#F97316', border: '#F9731650' },
    SEVERE: { bg: '#EF444420', text: '#EF4444', border: '#EF444450' },
  };
  const style = config[type] || config.MINOR;

  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {type}
    </span>
  );
}
