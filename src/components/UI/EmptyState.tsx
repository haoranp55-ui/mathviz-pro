// src/components/UI/EmptyState.tsx
import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle }) => (
  <div className="p-6 text-center flex flex-col items-center">
    {icon && <div className="text-gray-600 mb-3">{icon}</div>}
    <div className="text-gray-500 text-sm mb-1">{title}</div>
    {subtitle && <div className="text-gray-600 text-xs">{subtitle}</div>}
  </div>
);
