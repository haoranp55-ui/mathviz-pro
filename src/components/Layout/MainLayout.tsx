// src/components/Layout/MainLayout.tsx
import { Suspense, lazy, type FC } from 'react';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { FunctionCanvas } from '../Canvas/FunctionCanvas';
import { FunctionInput } from '../Controls/FunctionInput';
import { FunctionList } from '../Controls/FunctionList';
import { SidebarTabs } from '../Controls/SidebarTabs';
import { GlobalSettings } from '../Controls/GlobalSettings';
import { useAppStore } from '../../store/useAppStore';

// 懒加载：方程模式（含微分求解器 1621行 + EquationBackground 动画）
const EquationLayout = lazy(() =>
  import('../Equation/EquationLayout').then(m => ({ default: m.EquationLayout }))
);

// 懒加载：3D侧边栏（含 ThreeDRenderManager → Three.js ~600KB）
const ThreeDSidebar = lazy(() =>
  import('./ThreeDSidebar').then(m => ({ default: m.ThreeDSidebar }))
);

// 懒加载：2D 非默认 Tab（参数化/隐函数/极坐标）
const ParametricSidebar = lazy(() =>
  import('./ParametricSidebar').then(m => ({ default: m.ParametricSidebar }))
);
const ImplicitSidebar = lazy(() =>
  import('./ImplicitSidebar').then(m => ({ default: m.ImplicitSidebar }))
);
const PolarSidebar = lazy(() =>
  import('./PolarSidebar').then(m => ({ default: m.PolarSidebar }))
);

// 侧边栏内容加载占位
const SidebarFallback: FC = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
  </div>
);

export const MainLayout: FC = () => {
  const sidebarTab = useAppStore(state => state.sidebarTab);
  const systemType = useAppStore(state => state.systemType);

  // 方程模式：完全独立的布局
  if (systemType === 'equation') {
    return (
      <div className="w-full h-full flex flex-col bg-[#0f172a]">
        <Header />
        <main className="flex-1 overflow-hidden">
          <Suspense fallback={<SidebarFallback />}>
            <EquationLayout />
          </Suspense>
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
                ) : (
                  <Suspense fallback={<SidebarFallback />}>
                    {sidebarTab === 'parametric' ? (
                      <ParametricSidebar />
                    ) : sidebarTab === 'implicit' ? (
                      <ImplicitSidebar />
                    ) : (
                      <PolarSidebar />
                    )}
                  </Suspense>
                )}
              </div>
            </>
          ) : systemType === '3d' ? (
            <Suspense fallback={<SidebarFallback />}>
              <ThreeDSidebar />
            </Suspense>
          ) : null}

          <GlobalSettings />
        </aside>
      </main>

      <StatusBar />
    </div>
  );
};
