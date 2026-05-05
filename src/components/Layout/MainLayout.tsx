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
import { useAppStore } from '../../store/useAppStore';

export const MainLayout: React.FC = () => {
  const sidebarTab = useAppStore(state => state.sidebarTab);
  const systemType = useAppStore(state => state.systemType);

  return (
    <div className="w-full h-full flex flex-col bg-[#0f172a] relative overflow-hidden">
      <Header />

      <main className="flex-1 flex overflow-hidden relative z-10">
        {/* 主画布区域 */}
        <div className="flex-1 min-w-[480px] relative">
          <div 
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04)'
            }}
          />
          <FunctionCanvas />
        </div>

        {/* 侧边栏 */}
        <aside className="w-80 bg-[#1e293b] border-l border-white/[0.08] flex flex-col overflow-hidden">
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
          ) : (
            <>
              <div className="flex items-center border-b border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-[#64748B]" />
                  <span className="text-sm font-medium text-[#94A3B8]">3D 曲面</span>
                </div>
                <span className="ml-auto text-xs text-[#475569] font-mono">z = f(x, y)</span>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <ThreeDInput />
                <ThreeDList />
              </div>
            </>
          )}

          <GlobalSettings />
        </aside>
      </main>

      <StatusBar />
    </div>
  );
};
