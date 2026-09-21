import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  onClick?: () => void;
}

export function StatCard({ label, value, hint, onClick }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`card flex flex-col items-start p-4 text-left ${
        onClick ? 'transition hover:border-brand-300 hover:shadow' : ''
      }`}
    >
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </Tag>
  );
}
