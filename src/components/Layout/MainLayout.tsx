// src/components/Layout/MainLayout.tsx
import React from 'react';
import { Box } from 'lucide-react';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { FunctionCanvas } from '../Canvas/FunctionCanvas';
import { FunctionInput } from '../Controls/FunctionInput';
import { FunctionList } from '../Controls/FunctionList';
import { SidebarTabs } from '../Controls/SidebarTabs';
import { ParametricInput } from '../Controls/ParametricInput';
import { ParametricList } from '../Controls/ParametricList';
import { ImplicitInput } from '../Controls/ImplicitInput';
import { ImplicitList } from '../Controls/ImplicitList';
import { PolarInput } from '../Controls/PolarInput';
import { PolarList } from '../Controls/PolarList';
import { GlobalSettings } from '../Controls/GlobalSettings';
import { ThreeDInput } from '../Controls/ThreeDInput';
import { ThreeDList } from '../Controls/ThreeDList';
import { Implicit3DInput } from '../Controls/Implicit3DInput';
import { Implicit3DList } from '../Controls/Implicit3DList';
import { getThreeDRenderManager } from '../../lib/threeD/threeDRenderManager';
import { useAppStore } from '../../store/useAppStore';
import { EquationLayout } from './EquationLayout';

export const MainLayout: React.FC = () => {
  const sidebarTab = useAppStore(state => state.sidebarTab);
  const systemType = useAppStore(state => state.systemType);
  const threeDTab = useAppStore(state => state.threeDTab);
  const setThreeDTab = useAppStore(state => state.setThreeDTab);

  if (systemType === 'equation') {
    return (
      <div className="w-full h-full flex flex-col bg-[#0f172a]">
        <Header />
        <main className="flex-1 overflow-hidden">
          <EquationLayout />
        </main>
        <StatusBar />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#0f172a] relative overflow-hidden">
      <Header />

      <main className="flex-1 flex overflow-hidden relative z-10">
        {/* 主画布区域 */}
        <div className="flex-1 min-w-[480px] relative">
          <div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.03)'
            }}
          />
          <FunctionCanvas />
        </div>

        {/* 侧边栏 */}
        <aside className="w-80 bg-[#1e293b] border-l border-white/[0.06] flex flex-col overflow-hidden">
          {systemType === '2d' ? (
            <>
              <SidebarTabs />
              <div className="flex-1 overflow-hidden relative">
                {sidebarTab === 'normal' ? (
                  <>
                    <FunctionInput />
                    <FunctionList />
                  </>
                ) : sidebarTab === 'parametric' ? (
                  <>
                    <ParametricInput />
                    <ParametricList />
                  </>
                ) : sidebarTab === 'implicit' ? (
                  <>
                    <ImplicitInput />
                    <ImplicitList />
                  </>
                ) : (
                  <>
                    <PolarInput />
                    <PolarList />
                  </>
                )}
              </div>
            </>
          ) : systemType === '3d' ? (
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

              {/* WASD 移动灵敏度 */}
              <div className="px-4 py-2.5 border-t border-white/[0.05] bg-white/[0.01]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500">WASD 灵敏度</span>
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    {(() => {
                      const v = getThreeDRenderManager().wasdSpeed;
                      return v < 0.5 ? '🐢' : v > 2 ? '🐇' : '🚶';
                    })()}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="4"
                  step="0.1"
                  defaultValue={1}
                  onChange={(e) => {
                    getThreeDRenderManager().wasdSpeed = parseFloat(e.target.value);
                    e.target.title = `${e.target.value}x`;
                  }}
                  className="w-full h-1 accent-cyan-500"
                />
              </div>
            </>
          ) : null}

          <GlobalSettings />
        </aside>
      </main>

      <StatusBar />
    </div>
  );
};
