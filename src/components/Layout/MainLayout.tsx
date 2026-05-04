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
    <div className="w-full h-full flex flex-col bg-canvas-bg relative overflow-hidden">
      {/* 有机背景光晕装饰 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* 主光晕 - 左上 */}
        <div 
          className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full opacity-[0.07] animate-float"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)' }}
        />
        {/* 主光晕 - 右下 */}
        <div 
          className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.05] animate-float-slow"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }}
        />
        {/* 次光晕 - 右上 */}
        <div 
          className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full opacity-[0.04] animate-float-delayed"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.5) 0%, transparent 70%)' }}
        />
        {/* 次光晕 - 左下 */}
        <div 
          className="absolute bottom-[15%] left-[5%] w-[250px] h-[250px] rounded-full opacity-[0.05] animate-breathe"
          style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.4) 0%, transparent 70%)' }}
        />
        {/*  subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <Header />

      <main className="flex-1 flex overflow-hidden relative z-10">
        {/* 主画布区域 */}
        <div className="flex-1 min-w-[480px] relative">
          {/* 画布边缘微妙发光 */}
          <div 
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              boxShadow: 'inset 0 0 80px rgba(0,0,0,0.4)'
            }}
          />
          <FunctionCanvas />
        </div>

        {/* 侧边栏 - 玻璃拟态 */}
        <aside className="w-80 glass-strong border-l border-white/10 flex flex-col overflow-hidden relative">
          {/* 侧边栏顶部微妙光晕 */}
          <div 
            className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)'
            }}
          />

          {systemType === '2d' ? (
            <>
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
              {/* 3D 系统侧边栏头部 */}
              <div className="flex items-center border-b border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                  <span className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    3D 曲面
                  </span>
                </div>
                <span className="ml-auto text-xs text-gray-500">z = f(x, y)</span>
              </div>
              <div className="flex-1 overflow-hidden relative z-10">
                <ThreeDInput />
                <ThreeDList />
              </div>
            </>
          )}

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
