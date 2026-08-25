import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
}) => {
  return (
    <div className="bg-white rounded-xl border border-zinc-200/80 p-6 shadow-xs flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-extrabold text-zinc-900 mt-2 tracking-tight">{value}</h3>
        {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
      </div>

      <div className="p-3.5 rounded-xl border bg-zinc-100 text-zinc-900 border-zinc-200 shrink-0">
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};
