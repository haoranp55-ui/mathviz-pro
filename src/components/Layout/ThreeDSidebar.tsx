// src/components/Layout/ThreeDSidebar.tsx
// 3D 模式侧边栏（从 MainLayout 抽取，用于 React.lazy 懒加载）
import React from 'react';
import { Box } from 'lucide-react';
import { ThreeDInput } from '../Controls/ThreeDInput';
import { ThreeDList } from '../Controls/ThreeDList';
import { Implicit3DInput } from '../Controls/Implicit3DInput';
import { Implicit3DList } from '../Controls/Implicit3DList';
import { getThreeDRenderManager } from '../../lib/threeD/threeDRenderManager';
import { useAppStore } from '../../store/useAppStore';

export const ThreeDSidebar: React.FC = () => {
  const threeDTab = useAppStore(state => state.threeDTab);
  const setThreeDTab = useAppStore(state => state.setThreeDTab);

  return (
    <>
      {/* 3D 侧边栏头部 */}
      <div className="flex flex-col border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-cyan-400/70" />
            <span className="text-sm font-medium text-gray-300">3D 曲面</span>
          </div>
          <span className="ml-auto text-xs text-gray-500 font-mono">
            {threeDTab === 'explicit' ? 'z=f(x,y)' : 'f(x,y,z)=0'}
          </span>
        </div>
        {/* 子Tab */}
        <div className="flex border-t border-white/[0.04] bg-white/[0.01]">
          <button
            onClick={() => setThreeDTab('explicit')}
            className={`flex-1 py-2.5 text-xs font-medium transition-all duration-200 relative ${
              threeDTab === 'explicit'
                ? 'text-cyan-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {threeDTab === 'explicit' && (
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-cyan-500/70 rounded-full" />
            )}
            显函数 z=f(x,y)
          </button>
          <button
            onClick={() => setThreeDTab('implicit')}
            className={`flex-1 py-2.5 text-xs font-medium transition-all duration-200 relative ${
              threeDTab === 'implicit'
                ? 'text-cyan-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {threeDTab === 'implicit' && (
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-cyan-500/70 rounded-full" />
            )}
            隐函数 f(x,y,z)=0
          </button>
        </div>
      </div>
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
