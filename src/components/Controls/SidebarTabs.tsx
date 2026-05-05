// src/components/Controls/SidebarTabs.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { SidebarTab } from '../../types';

const TABS: Array<{ key: SidebarTab; label: string; icon: string }> = [
  { key: 'normal', label: '普通函数', icon: 'ƒ' },
  { key: 'parametric', label: '参数化', icon: 'ξ' },
  { key: 'implicit', label: '隐函数', icon: '∮' },
  { key: 'polar', label: '极坐标', icon: 'ρ' },
];

export const SidebarTabs: React.FC = () => {
  const sidebarTab = useAppStore(state => state.sidebarTab);
  const setSidebarTab = useAppStore(state => state.setSidebarTab);

  return (
    <div className="flex border-b border-white/[0.06] bg-white/[0.02] relative" role="tablist">
      {TABS.map(tab => {
        const isActive = sidebarTab === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => setSidebarTab(tab.key)}
            className={`flex-1 py-3 text-xs font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/40 relative overflow-hidden`}
          >
            {isActive && (
              <div className="absolute inset-0 bg-cyan-500/[0.06]" />
            )}

            <div className="flex items-center justify-center gap-1 relative z-10">
              <span className={`font-serif text-sm transition-all ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                {tab.icon}
              </span>
              <span className={isActive ? 'text-gray-100' : 'text-gray-400'}>{tab.label}</span>
            </div>

            {isActive && (
              <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-cyan-500/80 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
