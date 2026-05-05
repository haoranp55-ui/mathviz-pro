// src/components/Layout/Header.tsx
import React, { useState } from 'react';
import { FunctionHelp } from '../Controls/FunctionHelp';
import { useAppStore } from '../../store/useAppStore';
import { LineChart, Box, HelpCircle, ExternalLink } from 'lucide-react';

export const Header: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);
  const systemType = useAppStore(s => s.systemType);
  const setSystemType = useAppStore(s => s.setSystemType);

  return (
    <>
      <header className="h-12 bg-[#1e293b] border-b border-white/[0.08] flex items-center px-4 justify-between select-none relative z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#273549] border border-white/[0.1] flex items-center justify-center">
            <LineChart className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-[15px] font-semibold text-[#E2E8F0] tracking-tight">
              MathViz Pro
            </h1>
            <span className="text-[11px] text-[#475569] hidden sm:inline">数学可视化</span>
          </div>
        </div>

        {/* 系统切换器 */}
        <div className="relative flex items-center p-1 rounded-xl bg-[#0f172a] border border-white/[0.1] w-[180px] h-9 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
          {/* 滑动指示器 */}
          <div
            className={`absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              systemType === '2d'
                ? 'left-1 w-[calc(50%-4px)] bg-[#2563EB] shadow-lg shadow-blue-500/25'
                : 'left-[calc(50%+2px)] w-[calc(50%-4px)] bg-[#7C3AED] shadow-lg shadow-purple-500/25'
            }`}
          />
          <button
            onClick={() => setSystemType('2d')}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-semibold transition-colors duration-300 ${
              systemType === '2d' ? 'text-white' : 'text-[#475569] hover:text-[#94A3B8]'
            }`}
          >
            <LineChart className="w-4 h-4" />
            2D
          </button>
          <button
            onClick={() => setSystemType('3d')}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-semibold transition-colors duration-300 ${
              systemType === '3d' ? 'text-white' : 'text-[#475569] hover:text-[#94A3B8]'
            }`}
          >
            <Box className="w-4 h-4" />
            3D
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="w-9 h-9 rounded-xl bg-[#273549] border border-white/[0.1] flex items-center justify-center text-[#64748B] hover:text-[#E2E8F0] hover:bg-[#334155] hover:border-white/[0.15] transition-all"
            title="函数帮助"
            aria-label="帮助"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <a
            href="https://github.com/haoranp55-ui/mathviz-pro"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-xl bg-[#273549] border border-white/[0.1] flex items-center justify-center text-[#64748B] hover:text-[#E2E8F0] hover:bg-[#334155] hover:border-white/[0.15] transition-all"
            title="GitHub 仓库"
            aria-label="GitHub"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </header>
      {showHelp && <FunctionHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />}
    </>
  );
};
