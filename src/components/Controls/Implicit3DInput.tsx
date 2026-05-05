// src/components/Controls/Implicit3DInput.tsx
import React, { useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';

const TEMPLATES = [
  { expr: 'x^2 + y^2 + z^2 - 1 = 0', desc: '球面' },
  { expr: 'x^2 + y^2 - z = 0', desc: '旋转抛物面' },
  { expr: 'x^2 + y^2 - z^2 - 1 = 0', desc: '单叶双曲面' },
  { expr: 'x^2 - y^2 - z^2 = 0', desc: '圆锥面' },
  { expr: 'x^2 + y^2 * z^2 - 1 = 0', desc: '特殊曲面' },
  { expr: 'sin(x) + sin(y) + sin(z) = 0', desc: '周期极小曲面' },
];

export const Implicit3DInput: React.FC = () => {
  const [expression, setExpression] = useState('');
  const addImplicit3DFunction = useAppStore(s => s.addImplicit3DFunction);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (expression.trim()) {
      addImplicit3DFunction(expression.trim());
      setExpression('');
    }
  }, [expression, addImplicit3DFunction]);

  return (
    <div className="p-4 border-b border-white/[0.06]">
      <div className="text-xs text-gray-500 mb-2.5 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
        <span className="text-gray-400">隐函数输入</span>
        <span className="text-amber-400 font-serif text-sm">f(x,y,z) = 0</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={expression}
          onChange={e => setExpression(e.target.value)}
          placeholder="x^2 + y^2 + z^2 - 1 = 0"
          className="flex-1 px-3 py-2.5 input-glass text-sm"
        />
        <button type="submit" className="px-5 py-2.5 btn-glass text-sm">添加</button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {TEMPLATES.map(t => (
          <button
            key={t.expr}
            onClick={() => setExpression(t.expr)}
            className="text-[10px] text-gray-400 hover:text-white hover:bg-amber-500/10 px-2 py-1 rounded-md border border-white/[0.04] transition-all"
            title={t.desc}
          >
            {t.desc}
          </button>
        ))}
      </div>
    </div>
  );
};
