// src/components/Controls/ParametricInput.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ParametricHelp } from './ParametricHelp';

const PARAMETRIC_FUNCTION_LIST = [
  { category: '直线方程', items: ['a*x + b', 'a*x', 'x + b'] },
  { category: '正弦波', items: ['a*sin(k*x)', 'a*sin(x + b)', 'sin(k*x)'] },
  { category: '余弦波', items: ['a*cos(k*x)', 'a*cos(x + b)', 'cos(k*x)'] },
  { category: '指数函数', items: ['a*exp(b*x)', 'a*exp(-k*x)', 'exp(a*x)'] },
  { category: '幂函数', items: ['a*x^b', 'a*x^n', 'x^a'] },
  { category: '二次函数', items: ['a*x^2 + b*x + c', 'a*x^2', 'x^2 + b'] },
  { category: '对数函数', items: ['a*ln(b*x)', 'ln(a*x + b)', 'a*log(x)'] },
  { category: '组合函数', items: ['a*x + b*sin(x)', 'a*sin(b*x) + c', 'a*exp(-b*x)*sin(k*x)'] },
];

export const ParametricInput: React.FC = () => {
  const [expression, setExpression] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const addParametricFunction = useAppStore(state => state.addParametricFunction);
  const parametricFunctions = useAppStore(state => state.parametricFunctions);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (expression.trim()) {
      addParametricFunction(expression.trim());
      setExpression('');
    }
  }, [expression, addParametricFunction]);

  const handleSelectFunction = (fn: string) => {
    setExpression(fn);
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

  const canAdd = parametricFunctions.length < 3;

  return (
    <div className="p-4 border-b border-white/[0.06] relative">
      {/* 标题栏 */}
      <div className="text-xs text-gray-500 mb-2.5 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
        <span className="text-gray-400">参数化函数</span>
        <span className="text-purple-400 font-serif text-sm">ξ(t)</span>
        <span className="ml-auto glass-subtle px-2 py-0.5 rounded-md text-xs text-purple-300 border border-white/5">
          {parametricFunctions.length}/3
        </span>
        <button
          onClick={() => setShowHelp(true)}
          className="w-5 h-5 rounded-md bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 hover:text-purple-300 flex items-center justify-center transition-all border border-purple-500/20"
          title="帮助"
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
            placeholder="a*x + b, sin(k*x)..."
            className="w-full px-3 py-2.5 input-glass text-sm pr-10 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!canAdd}
          />
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 flex items-center gap-0.5 rounded-md transition-all border ${
              showPicker 
                ? 'text-purple-400 bg-purple-500/20 border-purple-500/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'
            }`}
            title="函数选择器"
          >
            <span className="font-serif">ξ</span>
            <span className={`text-xs transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* 函数选择器下拉 */}
          {showPicker && (
            <div className="absolute top-full left-0 right-0 mt-1.5 glass-strong rounded-xl shadow-2xl z-20 max-h-64 overflow-y-auto border border-white/10">
              <div className="bg-gradient-to-r from-purple-600/15 to-pink-600/15 px-3 py-2.5 border-b border-white/[0.06]">
                <span className="text-xs text-purple-300 font-medium">选择参数化模板</span>
              </div>
              {PARAMETRIC_FUNCTION_LIST.map(group => (
                <div key={group.category}>
                  <div className="text-xs text-gray-500 px-3 py-1.5 bg-white/[0.03]">
                    {group.category}
                  </div>
                  <div className="grid grid-cols-1 gap-1 p-2">
                    {group.items.map(fn => (
                      <button
                        key={fn}
                        type="button"
                        onClick={() => handleSelectFunction(fn)}
                        className="text-xs text-gray-300 hover:text-white hover:bg-purple-500/15 px-2 py-1.5 rounded-lg text-left font-mono transition-all"
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
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 border border-white/10'
              : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
          }`}
        >
          添加
        </button>
      </form>

      {!canAdd && (
        <p className="text-xs text-yellow-500 mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]"></span>
          已达到最大函数数量（3个）
        </p>
      )}

      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
        <span className="text-gray-600">点击</span>
        <span className="text-purple-400 font-serif bg-purple-500/10 px-1.5 py-0.5 rounded-md border border-purple-500/15">ξ</span>
        <span className="text-gray-600">快速选择函数</span>
      </p>

      <ParametricHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};
