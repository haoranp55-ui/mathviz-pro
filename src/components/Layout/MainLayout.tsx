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
    <div className="w-full h-full flex flex-col bg-canvas-bg">
      <Header />

      <main className="flex-1 flex overflow-hidden">
        {/* 主画布区域 */}
        <div className="flex-1 min-w-[480px]">
          <FunctionCanvas />
        </div>

        {/* 侧边栏 */}
        <aside className="w-80 bg-canvas-panel border-l border-gray-700 flex flex-col overflow-hidden">
          <SidebarTabs />

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

          {/* 全局设置（所有 Tab 共用） */}
          <GlobalSettings />
        </aside>
      </main>

      <StatusBar />
    </div>
  );
};
