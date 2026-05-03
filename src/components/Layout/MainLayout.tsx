// src/components/Layout/MainLayout.tsx
import React from 'react';
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
import { GlobalSettings } from '../Controls/GlobalSettings';
import { useAppStore } from '../../store/useAppStore';

export const MainLayout: React.FC = () => {
  const sidebarTab = useAppStore(state => state.sidebarTab);

  return (
    <div className="w-full h-full flex flex-col bg-canvas-bg relative">
      {/* 全局背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.02]">
        <div className="absolute top-[10%] left-[15%] text-9xl font-mono text-white rotate-12">∫</div>
        <div className="absolute top-[30%] right-[20%] text-8xl font-mono text-white -rotate-12">∑</div>
        <div className="absolute bottom-[20%] left-[10%] text-7xl font-mono text-white rotate-6">∂</div>
        <div className="absolute top-[60%] right-[10%] text-8xl font-mono text-white -rotate-6">∞</div>
      </div>

      <Header />

      <main className="flex-1 flex overflow-hidden relative z-10">
        {/* 主画布区域 */}
        <div className="flex-1 min-w-[480px] relative">
          <FunctionCanvas />
        </div>

        {/* 侧边栏 */}
        <aside className="w-80 bg-gradient-to-b from-canvas-panel via-gray-900/95 to-canvas-panel border-l border-gray-700/50 flex flex-col overflow-hidden relative">
          {/* 侧边栏背景装饰 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
            <div className="absolute top-[20%] left-1/2 -translate-x-1/2 text-6xl font-mono text-white">π</div>
            <div className="absolute top-[50%] left-1/2 -translate-x-1/2 text-5xl font-mono text-white">e</div>
            <div className="absolute top-[80%] left-1/2 -translate-x-1/2 text-6xl font-mono text-white">φ</div>
          </div>

          <SidebarTabs />

          <div className="flex-1 overflow-hidden relative z-10">
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
            ) : (
              <>
                <ImplicitInput />
                <ImplicitList />
              </>
            )}
          </div>

          {/* 全局设置（所有 Tab 共用） */}
          <div className="relative z-10">
            <GlobalSettings />
          </div>
        </aside>
      </main>

      <StatusBar />
    </div>
  );
};
