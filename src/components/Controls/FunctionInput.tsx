// src/components/Controls/FunctionInput.tsx
import React, { useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FunctionHelp } from './FunctionHelp';

export const FunctionInput: React.FC = () => {
  const [expression, setExpression] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const addFunction = useAppStore(state => state.addFunction);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (expression.trim()) {
      addFunction(expression.trim());
      setExpression('');
    }
  }, [expression, addFunction]);

  return (
    <>
      <div className="p-4 border-b border-gray-700/50">
        <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-primary"></span>
            函数输入
          </div>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="text-gray-500 hover:text-accent-primary transition-colors"
            title="查看帮助"
          >
            ?
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="sin(x), x^2, exp(x)..."
            className="flex-1 px-3 py-2.5 bg-canvas-panelLight text-white rounded-lg border border-gray-600 input-glow focus:outline-none text-sm placeholder-gray-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 btn-gradient text-white rounded-lg text-sm font-medium"
          >
            添加
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          支持: 三角函数、指数对数、阶乘、组合数等，点击右上角 <span className="text-accent-primary">?</span> 查看完整帮助
        </p>
      </div>

      <FunctionHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
};
