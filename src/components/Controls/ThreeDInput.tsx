// src/components/Controls/ThreeDInput.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ThreeDHelp } from './ThreeDHelp';

const FUNCTION_LIST = [
  { category: '曲面函数', items: [
    'sin(sqrt(x^2 + y^2))',
    'cos(x) * sin(y)',
    'sin(x) + cos(y)',
    'sin(x) * cos(y) * 3',
  ]},
  { category: '二次曲面', items: [
    'x^2 + y^2',
    'x^2 - y^2',
    'sqrt(x^2 + y^2)',
  ]},
  { category: '指数与高斯', items: [
    'exp(-x^2 - y^2)',
    'exp(-(x^2 + y^2)) * 5',
  ]},
  { category: '混合函数', items: [
    'x * y / 5',
    'sin(x) * y / 2',
    'cos(sqrt(x^2 + y^2)) * 3',
  ]},
];

export const ThreeDInput: React.FC = () => {
  const [expression, setExpression] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const addThreeDFunction = useAppStore(state => state.addThreeDFunction);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (expression.trim()) {
      addThreeDFunction(expression.trim());
      setExpression('');
    }
  }, [expression, addThreeDFunction]);

  const handleSelectFunction = (fn: string) => {
    setExpression(fn);
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
      <div className="p-4 border-b border-white/[0.08] relative">
        <div className="text-xs text-gray-500 mb-2.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
          <span className="text-gray-400">3D 输入</span>
          <span className="text-purple-400 font-serif text-sm">z = f(x, y)</span>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="ml-auto w-5 h-5 rounded-md bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 hover:text-purple-300 flex items-center justify-center transition-all border border-purple-500/20"
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
              placeholder="sin(sqrt(x^2+y^2))..."
              className="w-full px-3 py-2.5 input-glass text-sm pr-10"
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
              <span className="font-serif">f(</span>
              <span className={`text-xs transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {showPicker && (
              <div className="absolute top-full left-0 right-0 mt-1.5 glass-strong rounded-xl shadow-2xl z-20 max-h-64 overflow-y-auto border border-white/10">
                <div className="bg-gradient-to-r from-purple-600/15 to-pink-600/15 px-3 py-2.5 border-b border-white/[0.08]">
                  <span className="text-xs text-purple-300 font-medium">选择曲面模板</span>
                </div>
                {FUNCTION_LIST.map(group => (
                  <div key={group.category}>
                    <div className="text-xs text-gray-500 px-3 py-1.5 bg-white/[0.03]">
                      {group.category}
                    </div>
                    <div className="p-2 space-y-1">
                      {group.items.map(fn => (
                        <button
                          key={fn}
                          type="button"
                          onClick={() => handleSelectFunction(fn)}
                          className="w-full text-xs text-gray-300 hover:text-white hover:bg-purple-500/15 px-2 py-1.5 rounded-lg text-left font-mono transition-all"
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
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <span className="text-gray-600">输入 z = f(x, y) 右侧表达式</span>
        </p>
      </div>

      <ThreeDHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
};
