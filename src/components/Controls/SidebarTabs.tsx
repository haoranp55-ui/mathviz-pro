// src/components/Controls/SidebarTabs.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { SidebarTab } from '../../types';

const TABS: Array<{ key: SidebarTab; label: string; icon: string; gradient: string; glowColor: string }> = [
  { key: 'normal', label: '普通函数', icon: 'ƒ', gradient: 'from-blue-500 to-cyan-500', glowColor: 'rgba(59,130,246,0.3)' },
  { key: 'parametric', label: '参数化', icon: 'ξ', gradient: 'from-purple-500 to-pink-500', glowColor: 'rgba(168,85,247,0.3)' },
  { key: 'implicit', label: '隐函数', icon: '∮', gradient: 'from-green-500 to-teal-500', glowColor: 'rgba(34,197,94,0.3)' },
  { key: 'polar', label: '极坐标', icon: 'ρ', gradient: 'from-amber-500 to-orange-500', glowColor: 'rgba(245,158,11,0.3)' },
];

export const SidebarTabs: React.FC = () => {
  const sidebarTab = useAppStore(state => state.sidebarTab);
  const setSidebarTab = useAppStore(state => state.setSidebarTab);

  return (
    <div className="flex border-b border-white/10 bg-white/[0.03] relative overflow-hidden" role="tablist">
      {TABS.map(tab => {
        const isActive = sidebarTab === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => setSidebarTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/50 relative overflow-hidden`}
          >
            {/* 活动背景 */}
            {isActive && (
              <div 
                className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} opacity-[0.08]`}
              />
            )}

            {/* Hover 背景 */}
            <div 
              className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} opacity-0 hover:opacity-[0.05] transition-opacity duration-300`}
            />

            <div className="flex items-center justify-center gap-1.5 relative z-10">
              <span className={`text-base font-serif transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-40'}`}
                style={isActive ? { 
                  background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                  backgroundImage: `linear-gradient(to right, ${tab.gradient.replace('from-', '').replace(' to-', ', ')})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                } : {}}
              >
                {tab.icon}
              </span>
              <span className={isActive ? 'text-white' : 'text-gray-400'}>{tab.label}</span>
            </div>

            {/* 活动指示器 - 底部发光条 */}
            {isActive && (
              <div className={`absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r ${tab.gradient} rounded-full`}
                style={{ boxShadow: `0 0 8px ${tab.glowColor}` }}
              />
            )}

            {/* 活动左侧高光线 */}
            {isActive && (
              <div className={`absolute left-0 top-2 bottom-2 w-[2px] bg-gradient-to-b ${tab.gradient} rounded-full`}
                style={{ boxShadow: `0 0 6px ${tab.glowColor}` }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
