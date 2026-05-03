// src/components/Layout/StatusBar.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const StatusBar: React.FC = () => {
  const viewPort = useAppStore(state => state.viewPort);
  const functions = useAppStore(state => state.functions);
  const implicitFunctions = useAppStore(state => state.implicitFunctions);
  const parametricFunctions = useAppStore(state => state.parametricFunctions);
  const hoverPoint = useAppStore(state => state.interaction.hoverPoint);

  // 计算缩放百分比：基于默认视口 [-10, 10] 宽度为 20
  const defaultWidth = 20;
  const currentWidth = viewPort.xMax - viewPort.xMin;
  const zoomPercent = Math.round((defaultWidth / currentWidth) * 100);

  const visibleFunctions = functions.filter(f => f.visible).length;
  const visibleImplicit = implicitFunctions.filter(f => f.visible).length;
  const visibleParametric = parametricFunctions.filter(f => f.visible).length;
  const totalVisible = visibleFunctions + visibleImplicit + visibleParametric;
  const totalFunctions = functions.length + implicitFunctions.length + parametricFunctions.length;

  return (
    <footer className="h-7 bg-gradient-to-r from-canvas-panel via-gray-900 to-canvas-panel border-t border-gray-700/50 flex items-center px-4 text-xs text-gray-400 gap-6 select-none relative overflow-hidden">
      {/* 数学符号装饰背景 */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute left-[5%] top-1/2 -translate-y-1/2 text-lg font-mono text-white">λ</div>
        <div className="absolute left-[25%] top-1/2 -translate-y-1/2 text-lg font-mono text-white">Δ</div>
        <div className="absolute left-[45%] top-1/2 -translate-y-1/2 text-lg font-mono text-white">∇</div>
        <div className="absolute left-[65%] top-1/2 -translate-y-1/2 text-lg font-mono text-white">φ</div>
        <div className="absolute left-[85%] top-1/2 -translate-y-1/2 text-lg font-mono text-white">ω</div>
      </div>

      {/* 缩放信息 */}
      <span className="flex items-center gap-1.5 relative z-10">
        <div className="w-4 h-4 rounded bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
          <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </div>
        <span className="text-gray-300">缩放</span>
        <span className="text-cyan-400 font-mono">{zoomPercent}%</span>
      </span>

      {/* 坐标信息 */}
      <span className="flex items-center gap-1.5 relative z-10">
        <div className="w-4 h-4 rounded bg-gradient-to-br from-green-500/20 to-teal-500/20 flex items-center justify-center">
          <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <span className="text-gray-300">坐标</span>
        <span className="text-green-400 font-mono">
          ({hoverPoint?.x.toFixed(3) ?? '—'}, {hoverPoint?.y.toFixed(3) ?? '—'})
        </span>
      </span>

      {/* 函数统计 */}
      <span className="flex items-center gap-1.5 relative z-10">
        <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <span className="text-gray-300">函数</span>
        <span className="text-purple-400 font-mono">{totalVisible}/{totalFunctions}</span>
      </span>

      {/* 右侧装饰 */}
      <div className="ml-auto flex items-center gap-2 text-gray-500 relative z-10">
        <span className="text-xs font-mono opacity-50">MathViz Pro</span>
      </div>
    </footer>
  );
};
