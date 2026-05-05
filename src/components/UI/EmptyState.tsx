// src/components/UI/EmptyState.tsx
import React from 'react';
import { ChartSpline } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle }) => (
  <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
    <div className="panel-subtle p-5 flex flex-col items-center max-w-[220px] w-full">
      <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-3">
        {icon || <ChartSpline className="w-5 h-5 text-[#475569]" />}
      </div>
      <div className="text-[#94A3B8] text-sm mb-1 font-medium">{title}</div>
      {subtitle && <div className="text-[#475569] text-xs text-center">{subtitle}</div>}
    </div>
  </div>
);
