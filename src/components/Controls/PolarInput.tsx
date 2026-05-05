// src/components/Controls/PolarInput.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { PolarHelp } from './PolarHelp';

const POLAR_FUNCTION_LIST = [
  { category: '玫瑰曲线', items: ['sin(3*x)', 'cos(2*x)', 'sin(4*x)', 'a*sin(n*x)'] },
  { category: '螺线', items: ['x', 'a*x', 'exp(x/10)', 'sqrt(x)'] },
  { category: '圆与心形', items: ['1', '1 + cos(x)', '1 - sin(x)', 'a*(1+cos(x))'] },
  { category: '双纽线', items: ['sqrt(cos(2*x))', 'sqrt(abs(cos(2*x)))', 'a*sqrt(cos(2*x))'] },
  { category: '其他曲线', items: ['1/sin(x)', '1/cos(x)', 'abs(sin(x)) + abs(cos(x))'] },
];

export const PolarInput: React.FC = () => {
  const [expression, setExpression] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const addPolarFunction = useAppStore(state => state.addPolarFunction);
  const polarFunctions = useAppStore(state => state.polarFunctions);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (expression.trim()) {
      addPolarFunction(expression.trim());
      setExpression('');
    }
  }, [expression, addPolarFunction]);

  const handleSelectFunction = (fn: string) => {
    setExpression(fn);
    setShowPicker(false);
  };

  useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPicker]);

  const canAdd = polarFunctions.length < 3;

  return (
    <div className="p-4 border-b border-white/[0.06] relative" ref={pickerRef}>
      <div className="text-xs text-gray-500 mb-2.5 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400/70"></div>
        <span className="text-gray-400">极坐标函数</span>
        <span className="text-cyan-400/80 font-serif text-sm">r = f(θ)</span>
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="w-5 h-5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400/80 hover:text-cyan-300 flex items-center justify-center transition-all border border-cyan-500/15"
          title="帮助"
        >
          <span className="text-xs">?</span>
        </button>
        <span className="ml-auto glass-subtle px-2 py-0.5 rounded-md text-[11px] text-gray-400 border border-white/[0.05]">
          {polarFunctions.length}/3
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="sin(3*x), 1+cos(x), x..."
            className="w-full px-3 py-2.5 input-glass text-sm pr-10 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!canAdd}
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
            aria-label="函数选择器"
          >
            <span className="font-serif">ρ</span>
            <span className={`text-xs transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {showPicker && (
            <div className="absolute top-full left-0 right-0 mt-1.5 glass-strong rounded-xl shadow-2xl z-20 max-h-64 overflow-y-auto border border-white/[0.08]">
              <div className="bg-cyan-500/5 px-3 py-2.5 border-b border-white/[0.06]">
                <span className="text-xs text-cyan-300/80 font-medium">选择极坐标曲线</span>
              </div>
              {POLAR_FUNCTION_LIST.map(group => (
                <div key={group.category}>
                  <div className="text-[11px] text-gray-500 px-3 py-1.5 bg-white/[0.02]">
                    {group.category}
                  </div>
                  <div className="grid grid-cols-1 gap-1 p-2">
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
          disabled={!canAdd || !expression.trim()}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            canAdd && expression.trim()
              ? 'btn-glass'
              : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
          }`}
        >
          添加
        </button>
      </form>

      {!canAdd && (
        <p className="text-xs text-amber-500/70 mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60"></span>
          已达到最大函数数量（3个）
        </p>
      )}

      <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
        <span>格式：</span>
        <span className="text-cyan-400/70 font-mono">r = f(x)</span>
        <span>，x 代表角度，支持参数</span>
        <span className="text-cyan-400/70 font-mono">a, n</span>
      </p>

      <PolarHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};
