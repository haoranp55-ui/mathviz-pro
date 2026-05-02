// src/components/Layout/Header.tsx
import React, { useState } from 'react';
import { FunctionHelp } from '../Controls/FunctionHelp';

export const Header: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <header className="h-12 bg-canvas-panel border-b border-gray-700 flex items-center px-4 justify-between select-none">
        <div className="flex items-center gap-2.5">
          <svg className="w-6 h-6 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-8 4 4 4-6" />
          </svg>
          <h1 className="text-lg font-semibold text-white tracking-tight">MathViz Pro</h1>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
          title="帮助"
          aria-label="帮助"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </header>
      {showHelp && <FunctionHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />}
    </>
  );
};
