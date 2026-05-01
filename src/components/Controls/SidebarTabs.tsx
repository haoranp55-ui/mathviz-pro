// src/components/Controls/SidebarTabs.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { SidebarTab } from '../../types';

const TABS: Array<{ key: SidebarTab; label: string; color: string }> = [
  { key: 'normal', label: '普通函数', color: 'blue' },
  { key: 'parametric', label: '参数化', color: 'purple' },
  { key: 'implicit', label: '隐函数', color: 'green' },
];

export const SidebarTabs: React.FC = () => {
  const sidebarTab = useAppStore(state => state.sidebarTab);
  const setSidebarTab = useAppStore(state => state.setSidebarTab);

  return (
    <div className="flex border-b border-gray-700/50">
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => setSidebarTab(tab.key)}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            sidebarTab === tab.key
              ? `text-white border-b-2 border-${tab.color}-500 bg-canvas-panelLight/50`
              : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
