interface ViolationBadgeProps {
  type: 'MINOR' | 'MAJOR' | 'SEVERE';
}

export function ViolationBadge({ type }: ViolationBadgeProps) {
  const config = {
    MINOR: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
    MAJOR: 'bg-orange-500/20 text-orange-500 border-orange-500/50',
    SEVERE: 'bg-destructive/20 text-destructive border-destructive/50',
  };
  
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${config[type] || config.MINOR}`}
    >
      {type}
    </span>
  );
}
