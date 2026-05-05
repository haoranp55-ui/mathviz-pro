// src/components/Controls/ThreeDList.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { THREE_D_RESOLUTION_PRESETS } from '../../types';
import { EmptyState } from '../UI/EmptyState';

export const ThreeDList: React.FC = () => {
  const {
    threeDFunctions,
    removeThreeDFunction,
    toggleThreeDVisibility,
    toggleWireframe,
    updateThreeDResolution,
    updateThreeDExpression,
    updateThreeDDomain,
    updateThreeDZRange,
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

  if (threeDFunctions.length === 0) {
    return (
      <EmptyState
        title="暂无 3D 函数"
        subtitle="输入 z = f(x, y) 表达式开始绘制曲面"
      />
    );
  }

  const startEditing = (fn: { id: string; expression: string }) => {
    setEditingId(fn.id);
    setEditExpression(fn.expression);
  };

  const saveEdit = () => {
    if (editingId && editExpression.trim()) {
      updateThreeDExpression(editingId, editExpression.trim());
    }
    setEditingId(null);
    setEditExpression('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditExpression('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    else if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="text-xs text-gray-500 px-2 mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400/70"></div>
        <span className="text-gray-400">曲面列表</span>
        <span className="ml-auto text-gray-600">{threeDFunctions.length}/6</span>
      </div>

      <div className="space-y-2">
        {threeDFunctions.map((fn) => (
          <div
            key={fn.id}
            className="glass rounded-xl p-3 border border-white/[0.06] hover:border-white/[0.1] transition-all"
          >
            {/* 顶行: 颜色条 + 表达式 */}
            <div className="flex items-start gap-2.5">
              <button
                onClick={() => toggleThreeDVisibility(fn.id)}
                className="w-3 h-3 rounded-full mt-1 flex-shrink-0 transition-all hover:scale-110 border-2 border-white/15"
                style={{
                  backgroundColor: fn.visible ? fn.color : 'transparent',
                  boxShadow: fn.visible ? `0 0 8px ${fn.color}60` : 'none',
                }}
                title={fn.visible ? '点击隐藏' : '点击显示'}
              />

              <div className="flex-1 min-w-0">
                {editingId === fn.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editExpression}
                    onChange={(e) => setEditExpression(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyDown}
                    className="w-full px-2 py-1 input-glass text-xs font-mono"
                  />
                ) : (
                  <button
                    onClick={() => startEditing(fn)}
                    className="w-full text-left text-sm text-gray-200 font-mono truncate hover:text-white transition-colors"
                    title="点击编辑"
                  >
                    {fn.expression}
                  </button>
                )}
              </div>

              <button
                onClick={() => removeThreeDFunction(fn.id)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                title="删除"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 错误信息 */}
            {fn.error && (
              <div className="mt-1.5 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-md">
                {fn.error}
              </div>
            )}

            {/* 控件行 */}
            <div className="mt-2.5 flex items-center gap-4 text-xs">
              <button
                onClick={() => toggleWireframe(fn.id)}
                className={`flex items-center gap-1.5 transition-colors ${
                  fn.wireframe ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M9 21v-4m6 4v-4" />
                </svg>
                线框
              </button>

              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-gray-500">网格</span>
                <input
                  type="range"
                  min={0}
                  max={THREE_D_RESOLUTION_PRESETS.length - 1}
                  value={THREE_D_RESOLUTION_PRESETS.indexOf(fn.resolution as any)}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    updateThreeDResolution(fn.id, THREE_D_RESOLUTION_PRESETS[idx]);
                  }}
                  className="flex-1 h-1"
                />
                <span className="text-gray-400 w-7 text-right">{fn.resolution}</span>
              </div>
            </div>

            {/* 定义域编辑 */}
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-gray-500 w-3 font-mono">X</span>
                <input
                  type="number"
                  value={fn.xMin}
                  onChange={(e) => updateThreeDDomain(fn.id, { xMin: parseFloat(e.target.value) })}
                  className="w-12 px-1 py-0.5 input-glass text-[10px] text-center font-mono"
                  step="any"
                />
                <span className="text-gray-600">—</span>
                <input
                  type="number"
                  value={fn.xMax}
                  onChange={(e) => updateThreeDDomain(fn.id, { xMax: parseFloat(e.target.value) })}
                  className="w-12 px-1 py-0.5 input-glass text-[10px] text-center font-mono"
                  step="any"
                />
                <span className="text-gray-500 w-3 font-mono ml-1">Y</span>
                <input
                  type="number"
                  value={fn.yMin}
                  onChange={(e) => updateThreeDDomain(fn.id, { yMin: parseFloat(e.target.value) })}
                  className="w-12 px-1 py-0.5 input-glass text-[10px] text-center font-mono"
                  step="any"
                />
                <span className="text-gray-600">—</span>
                <input
                  type="number"
                  value={fn.yMax}
                  onChange={(e) => updateThreeDDomain(fn.id, { yMax: parseFloat(e.target.value) })}
                  className="w-12 px-1 py-0.5 input-glass text-[10px] text-center font-mono"
                  step="any"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-gray-500 w-3 font-mono">Z</span>
                <input
                  type="number"
                  value={fn.zMin ?? ''}
                  placeholder="min"
                  onChange={(e) => {
                    const val = e.target.value;
                    updateThreeDZRange(fn.id, val === '' ? undefined : parseFloat(val), fn.zMax);
                  }}
                  className="w-12 px-1 py-0.5 input-glass text-[10px] text-center font-mono"
                  step="any"
                />
                <span className="text-gray-600">—</span>
                <input
                  type="number"
                  value={fn.zMax ?? ''}
                  placeholder="max"
                  onChange={(e) => {
                    const val = e.target.value;
                    updateThreeDZRange(fn.id, fn.zMin, val === '' ? undefined : parseFloat(val));
                  }}
                  className="w-12 px-1 py-0.5 input-glass text-[10px] text-center font-mono"
                  step="any"
                />
                <span className="text-gray-500 text-[9px] ml-1">留空不裁剪</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
