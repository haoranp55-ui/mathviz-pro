// src/components/Layout/StatusBar.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const StatusBar: React.FC = () => {
  const { viewPort, functions, interaction } = useAppStore();

  const zoomPercent = Math.round((20 / (viewPort.xMax - viewPort.xMin)) * 100);
  const visibleFunctions = functions.filter(f => f.visible).length;

  return (
    <footer className="h-7 bg-canvas-panel border-t border-gray-700 flex items-center px-4 text-xs text-gray-400 gap-6">
      <span>缩放: {zoomPercent}%</span>
      <span>
        坐标: ({interaction.hoverPoint?.x.toFixed(2) ?? '—'}, {interaction.hoverPoint?.y.toFixed(2) ?? '—'})
      </span>
      <span>函数: {visibleFunctions}/{functions.length}</span>
    </footer>
  );
};
