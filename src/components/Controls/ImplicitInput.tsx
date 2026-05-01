// src/components/Controls/ImplicitInput.tsx
import React, { useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';

const IMPLICIT_FUNCTION_LIST = [
  { category: '圆与椭圆', items: ['x^2 + y^2 = 1', 'x^2/a^2 + y^2/b^2 = 1', 'x^2 + y^2 = r^2'] },
  { category: '双曲线', items: ['x^2 - y^2 = 1', 'x*y = 1', 'y^2 - x^2 = 1'] },
  { category: '抛物线', items: ['y^2 = x', 'y^2 = a*x', 'x^2 = y'] },
  { category: '其他曲线', items: ['y^2 = x^3 - x', 'x^3 + y^3 = 1', 'sin(x)*cos(y) = 0.5'] },
];

export const ImplicitInput: React.FC = () => {
  const [expression, setExpression] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const addImplicitFunction = useAppStore(state => state.addImplicitFunction);
  const implicitFunctions = useAppStore(state => state.implicitFunctions);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (expression.trim()) {
      addImplicitFunction(expression.trim());
      setExpression('');
    }
  }, [expression, addImplicitFunction]);

  const handleSelectFunction = (fn: string) => {
    setExpression(fn);
    setShowPicker(false);
  };

  const canAdd = implicitFunctions.length < 3;

  return (
    <div className="p-4 border-b border-gray-700/50">
      <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500"></span>
        隐函数 (F(x,y) = 0)
        <span className="ml-auto bg-canvas-panelLight px-2 py-0.5 rounded text-xs">
          {implicitFunctions.length}/3
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="x^2 + y^2 = 1"
            className="w-full px-3 py-2.5 bg-canvas-panelLight text-white rounded-lg border border-gray-600 input-glow focus:outline-none text-sm placeholder-gray-500 pr-10"
            disabled={!canAdd}
          />
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors px-2 py-1 flex items-center gap-0.5 ${showPicker ? 'text-white' : ''}`}
            title="函数选择器"
          >
            <span>ƒ</span>
            <span className={`text-xs transition-transform ${showPicker ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* 函数选择器下拉 */}
          {showPicker && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-canvas-panel border border-gray-600 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
              {IMPLICIT_FUNCTION_LIST.map(group => (
                <div key={group.category}>
                  <div className="text-xs text-gray-500 px-3 py-1.5 bg-canvas-panelLight/50 sticky top-0">
                    {group.category}
                  </div>
                  <div className="grid grid-cols-1 gap-1 p-2">
                    {group.items.map(fn => (
                      <button
                        key={fn}
                        type="button"
                        onClick={() => handleSelectFunction(fn)}
                        className="text-xs text-gray-300 hover:text-white hover:bg-green-500/20 px-2 py-1.5 rounded text-left font-mono transition-colors"
                      >
                        {fn}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!canAdd || !expression.trim()}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            canAdd && expression.trim()
              ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-500 hover:to-teal-500'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          添加
        </button>
      </form>

      {!canAdd && (
        <p className="text-xs text-yellow-500 mt-2">
          已达到最大函数数量（3个）
        </p>
      )}

      <p className="text-xs text-gray-500 mt-2">
        格式：F(x,y) = G(x,y)，支持参数 a, b, c
      </p>
    </div>
  );
};
