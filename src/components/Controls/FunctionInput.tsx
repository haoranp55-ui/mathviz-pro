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
      <div className="p-4 border-b border-white/[0.06] relative">
        <div className="text-xs text-gray-500 mb-2.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400/70"></div>
          <span className="text-gray-400">函数输入</span>
          <span className="text-cyan-400/80 font-serif text-sm">y = ƒ(x)</span>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="ml-auto w-5 h-5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400/80 hover:text-cyan-300 flex items-center justify-center transition-all border border-cyan-500/15"
            title="查看帮助"
          >
            <span className="text-xs">?</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1" ref={pickerRef}>
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="sin(x), x^2, ln(x)..."
              className="w-full px-3 py-2.5 input-glass text-sm pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 flex items-center gap-0.5 rounded-md transition-all border ${
                showPicker
                  ? 'text-cyan-400 bg-cyan-500/15 border-cyan-500/25'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/5 border-transparent hover:border-white/10'
              }`}
              title="函数选择器"
            >
              <span className="font-serif">ƒ</span>
              <span className={`text-xs transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {showPicker && (
              <div className="absolute top-full left-0 right-0 mt-1.5 glass-strong rounded-xl shadow-2xl z-20 max-h-64 overflow-y-auto border border-white/[0.08]">
                <div className="bg-cyan-500/5 px-3 py-2.5 border-b border-white/[0.06]">
                  <span className="text-xs text-cyan-300/80 font-medium">选择函数模板</span>
                </div>
                {FUNCTION_LIST.map(group => (
                  <div key={group.category}>
                    <div className="text-[11px] text-gray-500 px-3 py-1.5 bg-white/[0.02]">
                      {group.category}
                    </div>
                    <div className="grid grid-cols-3 gap-1 p-2">
                      {group.items.map(fn => (
                        <button
                          key={fn}
                          type="button"
                          onClick={() => handleSelectFunction(fn)}
                          className="text-xs text-gray-300 hover:text-white hover:bg-cyan-500/10 px-2 py-1.5 rounded-lg text-left font-mono transition-all"
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
            className="px-5 py-2.5 btn-glass text-sm"
          >
            添加
          </button>
        </form>
        <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
          <span>点击</span>
          <span className="text-cyan-400/70 font-serif bg-cyan-500/10 px-1.5 py-0.5 rounded-md border border-cyan-500/15">ƒ</span>
          <span>快速选择函数</span>
        </p>
      </div>

      <FunctionHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
};
