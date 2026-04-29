// src/components/Controls/FunctionInput.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FunctionHelp } from './FunctionHelp';

const FUNCTION_LIST = [
  { category: '三角函数', items: ['sin(x)', 'cos(x)', 'tan(x)', 'cot(x)', 'sec(x)', 'csc(x)'] },
  { category: '反三角', items: ['asin(x)', 'acos(x)', 'atan(x)', 'acot(x)'] },
  { category: '双曲函数', items: ['sinh(x)', 'cosh(x)', 'tanh(x)'] },
  { category: '指数对数', items: ['exp(x)', 'ln(x)', 'log10(x)', 'log2(x)'] },
  { category: '方根', items: ['sqrt(x)', 'cbrt(x)', 'nthRoot(x,n)'] },
  { category: '阶乘组合', items: ['factorial(x)', 'combinations(n,k)', 'permutations(n,k)'] },
  { category: '特殊函数', items: ['gamma(x)', 'erf(x)'] },
  { category: '取整', items: ['abs(x)', 'floor(x)', 'ceil(x)', 'round(x)'] },
  { category: '幂运算', items: ['x^n', 'pow(x,y)', 'square(x)', 'cube(x)'] },
];

export const FunctionInput: React.FC = () => {
  const [expression, setExpression] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const addFunction = useAppStore(state => state.addFunction);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (expression.trim()) {
      addFunction(expression.trim());
      setExpression('');
    }
  }, [expression, addFunction]);

  const handleSelectFunction = (fn: string) => {
    setExpression(prev => prev + fn);
    setShowPicker(false);
  };

  // 点击外部关闭选择器
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  return (
    <>
      <div className="p-4 border-b border-gray-700/50">
        <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-primary"></span>
          函数输入
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="text-accent-primary hover:text-accent-primaryHover transition-colors ml-1"
            title="查看帮助"
          >
            ?
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1" ref={pickerRef}>
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="sin(x), x^2, ln(x)..."
              className="w-full px-3 py-2.5 bg-canvas-panelLight text-white rounded-lg border border-gray-600 input-glow focus:outline-none text-sm placeholder-gray-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors px-2 py-1"
              title="函数选择器"
            >
              ƒ
            </button>

            {/* 函数选择器下拉 */}
            {showPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-canvas-panel border border-gray-600 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                {FUNCTION_LIST.map(group => (
                  <div key={group.category}>
                    <div className="text-xs text-gray-500 px-3 py-1.5 bg-canvas-panelLight/50 sticky top-0">
                      {group.category}
                    </div>
                    <div className="grid grid-cols-3 gap-1 p-2">
                      {group.items.map(fn => (
                        <button
                          key={fn}
                          type="button"
                          onClick={() => handleSelectFunction(fn)}
                          className="text-xs text-gray-300 hover:text-white hover:bg-accent-primary/20 px-2 py-1.5 rounded text-left font-mono transition-colors"
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
            className="px-5 py-2.5 btn-gradient text-white rounded-lg text-sm font-medium"
          >
            添加
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          点击输入框右侧 <span className="text-accent-primary">ƒ</span> 快速选择函数
        </p>
      </div>

      <FunctionHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
};
