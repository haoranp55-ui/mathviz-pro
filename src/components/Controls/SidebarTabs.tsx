// src/components/Controls/SidebarTabs.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { SidebarTab } from '../../types';

const TABS: Array<{ key: SidebarTab; label: string; activeClass: string }> = [
  { key: 'normal', label: '普通函数', activeClass: 'border-blue-500 text-white bg-canvas-panelLight/50' },
  { key: 'parametric', label: '参数化', activeClass: 'border-purple-500 text-white bg-canvas-panelLight/50' },
  { key: 'implicit', label: '隐函数', activeClass: 'border-green-500 text-white bg-canvas-panelLight/50' },
];

export const SidebarTabs: React.FC = () => {
  const sidebarTab = useAppStore(state => state.sidebarTab);
  const setSidebarTab = useAppStore(state => state.setSidebarTab);

  return (
    <div className="flex border-b border-gray-700/50" role="tablist">
      {TABS.map(tab => {
        const isActive = sidebarTab === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => setSidebarTab(tab.key)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/50 ${
              isActive
                ? `border-b-2 ${tab.activeClass}`
                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
