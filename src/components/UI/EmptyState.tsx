// src/components/UI/EmptyState.tsx
import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle }) => (
  <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
    <div className="glass-card p-5 flex flex-col items-center max-w-[220px] w-full">
      {/* 几何装饰 SVG */}
      <div className="relative w-12 h-12 mb-3">
        <svg className="w-12 h-12 text-gray-600/50" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1">
          {/* 坐标轴 */}
          <line x1="4" y1="24" x2="44" y2="24" strokeDasharray="2 2" />
          <line x1="24" y1="4" x2="24" y2="44" strokeDasharray="2 2" />
          {/* 虚线抛物线 */}
          <path d="M8 36 Q 24 12, 40 36" strokeDasharray="3 3" />
          {/* 小圆点 */}
          <circle cx="24" cy="24" r="2" fill="currentColor" />
        </svg>
        {/* 微妙发光 */}
        <div 
          className="absolute inset-0 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)' }}
        />
      </div>
      
      {icon && <div className="text-gray-500 mb-2">{icon}</div>}
      <div className="text-gray-400 text-sm mb-1 font-medium">{title}</div>
      {subtitle && <div className="text-gray-600 text-xs text-center">{subtitle}</div>}
    </div>
  </div>
);
