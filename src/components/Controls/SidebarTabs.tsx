// src/components/Controls/SidebarTabs.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { SidebarTab } from '../../types';

const TABS: Array<{ key: SidebarTab; label: string; icon: string; gradient: string }> = [
  { key: 'normal', label: '普通函数', icon: 'ƒ', gradient: 'from-blue-500 to-cyan-500' },
  { key: 'parametric', label: '参数化', icon: 'ξ', gradient: 'from-purple-500 to-pink-500' },
  { key: 'implicit', label: '隐函数', icon: '∮', gradient: 'from-green-500 to-teal-500' },
];

export const SidebarTabs: React.FC = () => {
  const sidebarTab = useAppStore(state => state.sidebarTab);
  const setSidebarTab = useAppStore(state => state.setSidebarTab);

  return (
    <div className="flex border-b border-gray-700/50 bg-gradient-to-r from-canvas-panel via-gray-900/50 to-canvas-panel relative overflow-hidden" role="tablist">
      {/* 几何装饰背景 */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute left-[15%] top-1/2 -translate-y-1/2 text-2xl font-mono text-white">△</div>
        <div className="absolute left-[50%] top-1/2 -translate-y-1/2 text-2xl font-mono text-white">○</div>
        <div className="absolute left-[85%] top-1/2 -translate-y-1/2 text-2xl font-mono text-white">□</div>
      </div>

      {TABS.map(tab => {
        const isActive = sidebarTab === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => setSidebarTab(tab.key)}
            className={`flex-1 py-2.5 text-sm font-medium transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/50 relative ${
              isActive
                ? 'text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 relative z-10">
              <span className={`text-base font-serif transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-50'}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </div>

            {/* 活动指示器 */}
            {isActive && (
              <div className={`absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r ${tab.gradient} rounded-full`} />
            )}

            {/* 悬停效果 */}
            <div className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} opacity-0 hover:opacity-10 transition-opacity duration-300`} />
          </button>
        );
      })}
    </div>
  );
};
