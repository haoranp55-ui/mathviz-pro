// src/components/Layout/StatusBar.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const StatusBar: React.FC = () => {
  const viewPort = useAppStore(state => state.viewPort);
  const functions = useAppStore(state => state.functions);
  const hoverPoint = useAppStore(state => state.interaction.hoverPoint);

  // 计算缩放百分比：基于默认视口 [-10, 10] 宽度为 20
  const defaultWidth = 20;
  const currentWidth = viewPort.xMax - viewPort.xMin;
  const zoomPercent = Math.round((defaultWidth / currentWidth) * 100);

  const visibleFunctions = functions.filter(f => f.visible).length;

  return (
    <footer className="h-7 bg-canvas-panel border-t border-gray-700 flex items-center px-4 text-xs text-gray-400 gap-6 select-none">
      <span className="flex items-center gap-1.5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
        缩放: {zoomPercent}%
      </span>
      <span className="flex items-center gap-1.5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        坐标: ({hoverPoint?.x.toFixed(3) ?? '—'}, {hoverPoint?.y.toFixed(3) ?? '—'})
      </span>
      <span className="flex items-center gap-1.5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        函数: {visibleFunctions}/{functions.length}
      </span>
    </footer>
  );
};
