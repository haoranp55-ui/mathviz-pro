// src/components/Layout/Header.tsx
import React, { useState } from 'react';
import { FunctionHelp } from '../Controls/FunctionHelp';
import { useAppStore } from '../../store/useAppStore';
import { LineChart, Box, HelpCircle, ExternalLink, Sigma } from 'lucide-react';

export const Header: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);
  const systemType = useAppStore(s => s.systemType);
  const setSystemType = useAppStore(s => s.setSystemType);

  return (
    <>
      <header className="h-12 bg-[#1e293b] border-b border-white/[0.06] flex items-center px-4 justify-between select-none relative z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#0f172a] border border-cyan-500/20 flex items-center justify-center">
            <LineChart className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-[15px] font-semibold text-[#E2E8F0] tracking-tight">
              MathViz Pro
            </h1>
            <span className="text-[11px] text-[#475569] hidden sm:inline">数学可视化</span>
          </div>
        </div>

        {/* 系统切换器 */}
        <div className="relative flex items-center p-1 rounded-xl bg-[#0f172a] border border-white/[0.08] w-[260px] h-9">
          <div
            className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-[#0ea5e9]/90 shadow-lg shadow-cyan-500/15 ${
              systemType === '2d'
                ? 'left-1'
                : systemType === '3d'
                ? 'left-[calc(33.33%+2px)]'
                : 'left-[calc(66.66%+2px)]'
            }`}
          />
          <button
            onClick={() => setSystemType('2d')}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium transition-colors duration-300 ${
              systemType === '2d' ? 'text-white' : 'text-[#475569] hover:text-[#94A3B8]'
            }`}
          >
            <LineChart className="w-4 h-4" />
            2D
          </button>
          <button
            onClick={() => setSystemType('3d')}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium transition-colors duration-300 ${
              systemType === '3d' ? 'text-white' : 'text-[#475569] hover:text-[#94A3B8]'
            }`}
          >
            <Box className="w-4 h-4" />
            3D
          </button>
          <button
            onClick={() => setSystemType('equation')}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium transition-colors duration-300 ${
              systemType === 'equation' ? 'text-white' : 'text-[#475569] hover:text-[#94A3B8]'
            }`}
          >
            <Sigma className="w-4 h-4" />
            方程
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="w-9 h-9 rounded-xl bg-[#0f172a] border border-white/[0.08] flex items-center justify-center text-[#64748B] hover:text-[#E2E8F0] hover:border-cyan-500/30 transition-all"
            title="函数帮助"
            aria-label="帮助"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <a
            href="https://github.com/haoranp55-ui/mathviz-pro"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-xl bg-[#0f172a] border border-white/[0.08] flex items-center justify-center text-[#64748B] hover:text-[#E2E8F0] hover:border-cyan-500/30 transition-all"
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
