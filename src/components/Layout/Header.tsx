// src/components/Layout/Header.tsx
import React, { useState } from 'react';
import { FunctionHelp } from '../Controls/FunctionHelp';

export const Header: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <header className="h-14 bg-gradient-to-r from-canvas-panel via-gray-900 to-canvas-panel border-b border-gray-700/50 flex items-center px-4 justify-between select-none relative overflow-hidden">
        {/* 数学符号装饰背景 */}
        <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
          <div className="absolute left-[10%] top-1/2 -translate-y-1/2 text-4xl font-mono text-white">∫</div>
          <div className="absolute left-[25%] top-1/2 -translate-y-1/2 text-3xl font-mono text-white">∑</div>
          <div className="absolute left-[40%] top-1/2 -translate-y-1/2 text-4xl font-mono text-white">∂</div>
          <div className="absolute left-[55%] top-1/2 -translate-y-1/2 text-3xl font-mono text-white">∞</div>
          <div className="absolute left-[70%] top-1/2 -translate-y-1/2 text-4xl font-mono text-white">π</div>
          <div className="absolute left-[85%] top-1/2 -translate-y-1/2 text-3xl font-mono text-white">√</div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {/* 几何图形 Logo */}
          <div className="relative w-8 h-8">
            {/* 外圈 */}
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/60"></div>
            {/* 内圈 */}
            <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 opacity-80"></div>
            {/* 曲线 */}
            <svg className="absolute inset-0 w-8 h-8" viewBox="0 0 32 32" fill="none">
              <path
                d="M4 24 Q 8 8, 16 16 T 28 8"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                opacity="0.9"
              />
            </svg>
          </div>

          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-400 tracking-tight">
              MathViz Pro
            </h1>
            <span className="text-[10px] text-gray-500 tracking-wider -mt-0.5">MATHEMATICAL VISUALIZATION</span>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          {/* 帮助按钮 */}
          <button
            onClick={() => setShowHelp(true)}
            className="group relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-purple-500/20 border border-gray-700/50 hover:border-cyan-500/30 transition-all duration-300"
            title="函数帮助"
            aria-label="帮助"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="absolute inset-0 rounded-lg bg-cyan-400/0 group-hover:bg-cyan-400/10 transition-colors"></div>
          </button>

          {/* GitHub 链接 */}
          <a
            href="https://github.com/haoranp55-ui/mathviz-pro"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 hover:border-gray-600 transition-all"
            title="GitHub 仓库"
            aria-label="GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </header>
      {showHelp && <FunctionHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />}
    </>
  );
};
