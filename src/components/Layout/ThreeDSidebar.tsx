// src/components/Layout/ThreeDSidebar.tsx
// 3D 模式侧边栏（从 MainLayout 抽取，用于 React.lazy 懒加载）
import type { FC } from 'react';
import { Box, BoxSelect } from 'lucide-react';
import { ThreeDInput } from '../Controls/ThreeDInput';
import { ThreeDList } from '../Controls/ThreeDList';
import { Implicit3DInput } from '../Controls/Implicit3DInput';
import { Implicit3DList } from '../Controls/Implicit3DList';
import { getThreeDRenderManager } from '../../lib/threeD/threeDRenderManager';
import { useAppStore } from '../../store/useAppStore';

interface TabDef {
  key: 'explicit' | 'implicit';
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { key: 'explicit', label: '显函数', icon: <Box className="w-3.5 h-3.5" /> },
  { key: 'implicit', label: '隐函数', icon: <BoxSelect className="w-3.5 h-3.5" /> },
];

export const ThreeDSidebar: FC = () => {
  const threeDTab = useAppStore(state => state.threeDTab);
  const setThreeDTab = useAppStore(state => state.setThreeDTab);

  return (
    <>
      {/* 3D 侧边栏头部 — 与 SidebarTabs.tsx 风格一致 */}
      <div className="flex border-b border-white/[0.06] bg-white/[0.02] relative" role="tablist">
        {TABS.map(tab => {
          const isActive = threeDTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setThreeDTab(tab.key)}
              className="flex-1 py-3 text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/40 relative overflow-hidden"
            >
              {/* 背景高亮 - 带动画 */}
              <div
                className={`absolute inset-0 bg-cyan-500/[0.06] transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
              />

              {/* 内容 */}
              <div className="flex items-center justify-center gap-1 relative z-10">
                <span className={`transition-all duration-300 ${isActive ? 'text-cyan-400 scale-110' : 'text-gray-500'}`}>
                  {tab.icon}
                </span>
                <span className={`transition-colors duration-300 ${isActive ? 'text-gray-100' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </div>

              {/* 底部指示器 - 带动画 */}
              <div
                className={`absolute bottom-0 left-3 right-3 h-[2px] bg-cyan-500/80 rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}
              />
            </button>
          );
        })}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden relative">
        {threeDTab === 'explicit' ? (
          <>
            <ThreeDInput />
            <ThreeDList />
          </>
        ) : (
          <>
            <Implicit3DInput />
            <Implicit3DList />
          </>
        )}
      </div>

      {/* 相机灵敏度 */}
      <div className="px-4 py-2.5 border-t border-white/[0.05] bg-white/[0.01] space-y-2">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-gray-500">鼠标灵敏度</span>
            <span className="text-[10px] text-gray-400 tabular-nums" id="mouse-speed-val">1.0x</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="4"
            step="0.1"
            defaultValue={1}
            onChange={(e) => {
              getThreeDRenderManager().mouseSpeed = parseFloat(e.target.value);
              document.getElementById('mouse-speed-val')!.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
            }}
            className="w-full h-1 accent-cyan-500"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-gray-500">WASD 灵敏度</span>
            <span className="text-[10px] text-gray-400 tabular-nums" id="wasd-speed-val">1.0x</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="4"
            step="0.1"
            defaultValue={1}
            onChange={(e) => {
              getThreeDRenderManager().wasdSpeed = parseFloat(e.target.value);
              document.getElementById('wasd-speed-val')!.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
            }}
            className="w-full h-1 accent-cyan-500"
          />
        </div>
      </div>
    </>
  );
};
