// src/components/UI/EmptyState.tsx
import React from 'react';
import { ChartSpline } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle }) => (
  <div className="p-6 flex flex-col items-center justify-center min-h-[180px]">
    <div className="panel-subtle p-5 flex flex-col items-center max-w-[220px] w-full">
      <div className="w-10 h-10 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center mb-3">
        {icon || <ChartSpline className="w-5 h-5 text-cyan-500/50" />}
      </div>
      <div className="text-gray-300 text-sm mb-1 font-medium">{title}</div>
      {subtitle && <div className="text-gray-500 text-xs text-center">{subtitle}</div>}
    </div>
  </div>
);
