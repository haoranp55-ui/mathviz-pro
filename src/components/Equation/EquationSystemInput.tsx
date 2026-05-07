// src/components/Equation/EquationSystemInput.tsx
import React, { useState, useCallback } from 'react';
import { Plus, Variable } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { VARIABLE_NAMES } from '../../types';
import type { VariableName } from '../../types';

const EXAMPLES: Record<number, string[][]> = {
  1: [['x^2 - 4 = 0']],
  2: [
    ['x + y = 3', 'x - y = 1'],
    ['x^2 + y^2 = 1', 'x + y = 0.5'],
  ],
  3: [
    ['x + y + z = 6', 'x - y = 0', 'y + z = 4'],
    ['x^2 + y^2 = 1', 'y^2 + z^2 = 1', 'x + z = 0.5'],
  ],
  4: [
    ['x + y = 1', 'y + z = 1', 'z + w = 1', 'w + x = 1'],
  ],
  5: [
    ['x + y = 1', 'y + z = 1', 'z + w = 1', 'w + v = 1', 'v + x = 1'],
  ],
};

export const EquationSystemInput: React.FC = () => {
  const [variableCount, setVariableCount] = useState(2);
  const [expressions, setExpressions] = useState<string[]>(['', '']);

  const addEquationSystem = useAppStore((state) => state.addEquationSystem);

  const handleVariableCountChange = (count: number) => {
    setVariableCount(count);
    if (expressions.length < count) {
      setExpressions([...expressions, ...Array(count - expressions.length).fill('')]);
    } else {
      setExpressions(expressions.slice(0, count));
    }
  };

  const handleExpressionChange = (index: number, value: string) => {
    const newExpressions = [...expressions];
    newExpressions[index] = value;
    setExpressions(newExpressions);
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const validExpressions = expressions.filter((expr) => expr.trim());
      if (validExpressions.length !== variableCount) return;
      const variables = VARIABLE_NAMES.slice(0, variableCount) as VariableName[];
      addEquationSystem(validExpressions, variables);
      setExpressions(Array(variableCount).fill(''));
    },
    [expressions, variableCount, addEquationSystem]
  );

  const handleFillExample = (example: string[]) => {
    setExpressions(example);
  };

  const currentVariables = VARIABLE_NAMES.slice(0, variableCount);
  const allFilled = expressions.filter((e) => e.trim()).length === variableCount;

  return (
    <div className="panel p-6 sticky top-0">
      {/* 变量数量选择 */}
      <div className="mb-5">
        <label className="text-sm text-gray-400 mb-3 block font-medium flex items-center gap-2">
          <Variable className="w-4 h-4 text-cyan-400/70" />
          未知数数量
        </label>
        <div className="tab-switcher">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleVariableCountChange(n)}
              className={`tab-switcher-btn ${variableCount === n ? 'active' : ''}`}
            >
              {n} 元
            </button>
          ))}
        </div>
      </div>

      {/* 方程输入 */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>输入方程</span>
          <span className="text-gray-600 font-mono">({currentVariables.join(', ')})</span>
        </div>

        {Array.from({ length: variableCount }).map((_, index) => (
          <div key={index} className="flex gap-3 items-center">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-500 text-sm font-mono">
              {index + 1}
            </div>
            <input
              type="text"
              value={expressions[index] || ''}
              onChange={(e) => handleExpressionChange(index, e.target.value)}
              placeholder={`${currentVariables[index]} + ${currentVariables[(index + 1) % variableCount]} = 1`}
              className="flex-1 px-4 py-3 input-glass text-base"
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={!allFilled}
          className="w-full py-3.5 rounded-xl btn-primary text-base font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          添加方程组
        </button>
      </form>

      {/* 示例 */}
      <div className="mt-5 pt-5 border-t border-white/[0.05]">
        <p className="text-xs text-gray-600 mb-2.5">快速示例</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES[variableCount]?.map((example, idx) => (
            <button
              key={idx}
              onClick={() => handleFillExample(example)}
              className="text-xs text-gray-500 bg-white/[0.02] px-2.5 py-1.5 rounded border border-white/[0.04] hover:border-cyan-500/20 hover:text-cyan-400/80 hover:bg-cyan-500/5 transition-all text-left"
              title={example.join(', ')}
            >
              {example[0].length > 20 ? example[0].slice(0, 20) + '...' : example[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
