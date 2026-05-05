// src/components/Controls/Implicit3DList.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { IMPLICIT3D_MC_PRESETS } from '../../types';
import { EmptyState } from '../UI/EmptyState';

export const Implicit3DList: React.FC = () => {
  const {
    implicit3DFunctions,
    removeImplicit3DFunction,
    toggleImplicit3DVisibility,
    toggleImplicit3DWireframe,
    updateImplicit3DResolution,
    updateImplicit3DExpression,
  } = useAppStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editExpression, setEditExpression] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  if (implicit3DFunctions.length === 0) {
    return <EmptyState title="暂无隐函数" subtitle="输入 f(x,y,z)=0 表达式" />;
  }

  const saveEdit = () => {
    if (editingId && editExpression.trim()) {
      updateImplicit3DExpression(editingId, editExpression.trim());
    }
    setEditingId(null);
    setEditExpression('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="text-xs text-gray-500 px-2 mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400/70"></div>
        <span className="text-gray-400">隐函数列表</span>
        <span className="ml-auto text-gray-600">{implicit3DFunctions.length}/6</span>
      </div>

      <div className="space-y-2">
        {implicit3DFunctions.map(fn => (
          <div key={fn.id} className="glass rounded-xl p-3 border border-white/[0.06] hover:border-white/[0.1] transition-all">
            <div className="flex items-start gap-2.5">
              <button
                onClick={() => toggleImplicit3DVisibility(fn.id)}
                className="w-3 h-3 rounded-full mt-1 flex-shrink-0 transition-all hover:scale-110 border-2 border-white/15"
                style={{
                  backgroundColor: fn.visible ? fn.color : 'transparent',
                  boxShadow: fn.visible ? `0 0 8px ${fn.color}60` : 'none',
                }}
              />

              <div className="flex-1 min-w-0">
                {editingId === fn.id ? (
                  <input ref={inputRef} value={editExpression}
                    onChange={e => setEditExpression(e.target.value)}
                    onBlur={saveEdit} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); else if (e.key === 'Escape') { setEditingId(null); setEditExpression(''); } }}
                    className="w-full px-2 py-1 input-glass text-xs font-mono"
                  />
                ) : (
                  <button onClick={() => { setEditingId(fn.id); setEditExpression(fn.expression); }}
                    className="w-full text-left text-sm text-gray-200 font-mono truncate hover:text-white transition-colors"
                  >{fn.expression}</button>
                )}
              </div>

              <button onClick={() => removeImplicit3DFunction(fn.id)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {fn.error && <div className="mt-1.5 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-md">{fn.error}</div>}

            <div className="mt-2.5 flex items-center gap-4 text-xs">
              <button onClick={() => toggleImplicit3DWireframe(fn.id)}
                className={`flex items-center gap-1.5 transition-colors ${fn.wireframe ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M9 21v-4m6 4v-4" />
                </svg>
                线框
              </button>

              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-gray-500">MC</span>
                <input type="range" min={0} max={IMPLICIT3D_MC_PRESETS.length - 1}
                  value={IMPLICIT3D_MC_PRESETS.indexOf(fn.resolution as any)}
                  onChange={e => updateImplicit3DResolution(fn.id, IMPLICIT3D_MC_PRESETS[parseInt(e.target.value)])}
                  className="flex-1 h-1"
                />
                <span className="text-gray-400 w-7 text-right">{fn.resolution}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
