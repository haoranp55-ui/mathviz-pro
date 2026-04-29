// src/components/Layout/MainLayout.tsx
import React from 'react';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { FunctionCanvas } from '../Canvas/FunctionCanvas';
import { FunctionInput } from '../Controls/FunctionInput';
import { FunctionList } from '../Controls/FunctionList';
import { ParameterPanel } from '../Controls/ParameterPanel';

export const MainLayout: React.FC = () => {
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
          <FunctionInput />
          <FunctionList />
          <ParameterPanel />
        </aside>
      </main>

      <StatusBar />
    </div>
  );
};
