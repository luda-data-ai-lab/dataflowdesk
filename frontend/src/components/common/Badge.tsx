interface BadgeProps {
  label: string;
  colors: Record<string, string>;
}

export function Badge({ label, colors }: BadgeProps) {
  return <span className={`badge ${colors[label] ?? 'bg-slate-100 text-slate-700'}`}>{label}</span>;
}
