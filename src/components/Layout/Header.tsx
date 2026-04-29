// src/components/Layout/Header.tsx
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="h-12 bg-canvas-panel border-b border-gray-700 flex items-center px-4 justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xl">📈</span>
        <h1 className="text-lg font-semibold text-white">MathViz Pro</h1>
      </div>
      <button className="text-gray-400 hover:text-white transition-colors">
        <span className="text-lg">?</span>
      </button>
    </header>
  );
};
