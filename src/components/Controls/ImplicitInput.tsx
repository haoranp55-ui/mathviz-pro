// src/components/Controls/ImplicitInput.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ImplicitHelp } from './ImplicitHelp';

const IMPLICIT_FUNCTION_LIST = [
  { category: '圆与椭圆', items: ['x^2 + y^2 = 1', 'x^2/a^2 + y^2/b^2 = 1', 'x^2 + y^2 = r^2'] },
  { category: '双曲线', items: ['x^2 - y^2 = 1', 'x*y = 1', 'y^2 - x^2 = 1'] },
  { category: '抛物线', items: ['y^2 = x', 'y^2 = a*x', 'x^2 = y'] },
  { category: '其他曲线', items: ['y^2 = x^3 - x', 'x^3 + y^3 = 1', 'sin(x)*cos(y) = 0.5'] },
];

export const ImplicitInput: React.FC = () => {
  const [expression, setExpression] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
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

  // 点击外部关闭选择器
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

  const canAdd = implicitFunctions.length < 3;

  return (
    <div className="p-4 border-b border-white/[0.08] relative" ref={pickerRef}>
      {/* 标题栏 */}
      <div className="text-xs text-gray-500 mb-2.5 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-teal-400 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
        <span className="text-gray-400">隐函数</span>
        <span className="text-green-400 font-serif text-sm">F(x,y) = 0</span>
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="text-gray-500 hover:text-green-400 hover:bg-green-500/10 w-5 h-5 rounded flex items-center justify-center transition-colors"
          title="帮助"
        >
          ?
        </button>
        <span className="ml-auto glass-subtle px-2 py-0.5 rounded-md text-xs text-green-300 border border-white/5">
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
            className="w-full px-3 py-2.5 input-glass text-sm pr-10 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!canAdd}
          />
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 flex items-center gap-0.5 rounded-md transition-all border ${
              showPicker 
                ? 'text-green-400 bg-green-500/20 border-green-500/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'
            }`}
            title="函数选择器"
            aria-label="函数选择器"
          >
            <span className="font-serif">∮</span>
            <span className={`text-xs transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* 函数选择器下拉 */}
          {showPicker && (
            <div className="absolute top-full left-0 right-0 mt-1.5 glass-strong rounded-xl shadow-2xl z-20 max-h-64 overflow-y-auto border border-white/10">
              <div className="bg-gradient-to-r from-green-600/15 to-teal-600/15 px-3 py-2.5 border-b border-white/[0.08]">
                <span className="text-xs text-green-300 font-medium">选择隐函数曲线</span>
              </div>
              {IMPLICIT_FUNCTION_LIST.map(group => (
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
                        className="text-xs text-gray-300 hover:text-white hover:bg-green-500/15 px-2 py-1.5 rounded-lg text-left font-mono transition-all"
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
              ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/30 border border-white/10'
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
        <span className="text-gray-600">格式：F(x,y) = G(x,y)，支持参数</span>
        <span className="text-green-400 font-mono bg-green-500/10 px-1.5 py-0.5 rounded-md border border-green-500/15">a, b, c</span>
      </p>

      <ImplicitHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};
