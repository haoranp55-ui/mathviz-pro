// src/components/Controls/FunctionInput.tsx
import React, { useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const FunctionInput: React.FC = () => {
  const [expression, setExpression] = useState('');
  const addFunction = useAppStore(state => state.addFunction);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (expression.trim()) {
      addFunction(expression.trim());
      setExpression('');
    }
  }, [expression, addFunction]);

  return (
    <div className="p-3 border-b border-gray-700">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="输入函数，如 sin(x), x^2"
          className="flex-1 px-3 py-2 bg-canvas-input text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors text-sm font-medium"
        >
          添加
        </button>
      </form>
      <p className="text-xs text-gray-500 mt-2">
        支持: sin, cos, tan, exp, ln, sqrt, pow 等
      </p>
    </div>
  );
};
