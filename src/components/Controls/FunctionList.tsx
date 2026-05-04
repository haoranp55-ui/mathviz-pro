// src/components/Controls/FunctionList.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { EmptyState } from '../UI/EmptyState';

export const FunctionList: React.FC = () => {
  const {
    functions,
    removeFunction,
    toggleFunctionVisibility,
    toggleFunctionDerivative,
    toggleFunctionKeyPoints,
    addMarkedPoint,
    removeMarkedPoint,
    updateMarkedPoint,
    updateFunctionExpression,
  } = useAppStore();

  const [newPointX, setNewPointX] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editExpression, setEditExpression] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦编辑输入框
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  if (functions.length === 0) {
    return (
      <EmptyState
        title="暂无函数"
        subtitle="输入表达式开始绘图"
      />
    );
  }

  const handleAddPoint = (functionId: string) => {
    const xStr = newPointX[functionId] || '0';
    const x = parseFloat(xStr);
    if (!isNaN(x)) {
      addMarkedPoint(functionId, x, false);
      setNewPointX({ ...newPointX, [functionId]: '' });
    }
  };

  const startEditing = (fn: { id: string; expression: string }) => {
    setEditingId(fn.id);
    setEditExpression(fn.expression);
  };

  const saveEdit = () => {
    if (editingId && editExpression.trim()) {
      updateFunctionExpression(editingId, editExpression.trim());
    }
    setEditingId(null);
    setEditExpression('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditExpression('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="text-xs text-gray-500 px-2 mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
        <span className="text-gray-400">函数列表</span>
        <span className="text-blue-400 font-serif text-sm">y = ƒ(x)</span>
        <span className="ml-auto glass-subtle px-2 py-0.5 rounded-md text-xs text-blue-300 border border-white/5">
          {functions.length}
        </span>
      </div>
      <ul className="space-y-2">
        {functions.map((fn) => (
          <li key={fn.id}>
            <div className="function-item glass-card flex items-center gap-2.5 px-3 py-2.5 group cursor-pointer">
              {/* 颜色指示条 - 加宽并发光 */}
              <div
                className="w-1.5 h-7 rounded-full flex-shrink-0 cursor-pointer transition-all duration-300 hover:scale-y-110"
                style={{
                  backgroundColor: fn.color,
                  boxShadow: `0 0 10px ${fn.color}60, 0 0 4px ${fn.color}40`
                }}
                onClick={() => toggleFunctionVisibility(fn.id)}
              />

              {/* 函数表达式 / 编辑输入框 */}
              {editingId === fn.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editExpression}
                  onChange={(e) => setEditExpression(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={handleKeyDown}
                  className="flex-1 text-sm font-mono bg-white/10 px-2 py-1 rounded border border-blue-400/50 focus:outline-none focus:border-blue-400 text-white"
                  placeholder="输入表达式"
                />
              ) : (
                <button
                  className={`text-sm flex-1 text-left font-mono truncate transition-all ${
                    fn.visible ? 'text-white' : 'text-gray-500 line-through'
                  }`}
                  onClick={() => startEditing(fn)}
                  title="点击编辑"
                >
                  <span className="text-cyan-400/80">y = </span>
                  {fn.expression}
                </button>
              )}

              {/* 操作按钮组 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* 错误提示 */}
                {fn.error && (
                  <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-md border border-red-500/20" title={fn.error}>
                    错误
                  </span>
                )}

                {/* 显示/隐藏按钮 */}
                <button
                  onClick={() => toggleFunctionVisibility(fn.id)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    fn.visible
                      ? 'text-green-400 hover:text-green-300 hover:bg-green-400/10'
                      : 'text-gray-500 bg-white/5 hover:bg-white/10'
                  } opacity-0 group-hover:opacity-100`}
                  title={fn.visible ? '隐藏函数' : '显示函数'}
                  aria-label={fn.visible ? '隐藏函数' : '显示函数'}
                >
                  {fn.visible ? '◉' : '○'}
                </button>

                {/* 关键点按钮 */}
                {!fn.error && (
                  <button
                    onClick={() => toggleFunctionKeyPoints(fn.id)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      fn.showKeyPoints
                        ? 'text-blue-400 bg-blue-400/15 hover:bg-blue-400/25 border border-blue-400/20'
                        : 'text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 opacity-0 group-hover:opacity-100'
                    }`}
                    title={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注（零点、极值点）'}
                    aria-label={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注'}
                  >
                    ◆
                  </button>
                )}

                {/* 导数按钮 */}
                {!fn.error && (
                  <button
                    onClick={() => toggleFunctionDerivative(fn.id)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all font-bold ${
                      fn.showDerivative
                        ? 'text-purple-400 bg-purple-400/15 hover:bg-purple-400/25 border border-purple-400/20'
                        : 'text-gray-500 hover:text-purple-400 hover:bg-purple-400/10 opacity-0 group-hover:opacity-100'
                    }`}
                    title={fn.showDerivative ? '隐藏导数曲线' : '显示导数曲线'}
                    aria-label={fn.showDerivative ? '隐藏导数曲线' : '显示导数曲线'}
                  >
                    d
                  </button>
                )}

                {/* 删除按钮 */}
                <button
                  onClick={() => removeFunction(fn.id)}
                  className="text-gray-500 hover:text-red-400 hover:bg-red-400/15 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-400/20"
                  title="删除函数"
                  aria-label="删除函数"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 标记点列表 */}
            {fn.visible && !fn.error && (
              <div className="mt-1.5 mx-1 p-2.5 glass-subtle rounded-xl border border-white/[0.04] space-y-2">
                {/* 添加点输入 */}
                <div className="flex items-center gap-2">
                  <div className="text-xs text-blue-400 font-mono mr-1">x =</div>
                  <input
                    type="text"
                    placeholder="值"
                    value={newPointX[fn.id] || ''}
                    onChange={(e) => setNewPointX({ ...newPointX, [fn.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPoint(fn.id)}
                    className="flex-1 px-2 py-1 input-glass text-xs"
                  />
                  <button
                    onClick={() => handleAddPoint(fn.id)}
                    className="px-2.5 py-1 text-xs bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/15 border border-white/10"
                  >
                    + 点
                  </button>
                </div>

                {/* 已添加的点 */}
                {fn.markedPoints && fn.markedPoints.length > 0 && (
                  <div className="space-y-1">
                    {fn.markedPoints.map((point) => (
                      <div key={point.id} className="flex items-center gap-2 text-xs p-1.5 glass-subtle rounded-lg group border border-transparent hover:border-white/5">
                        <input
                          type="number"
                          value={point.x}
                          onChange={(e) => updateMarkedPoint(fn.id, point.id, parseFloat(e.target.value) || 0, false)}
                          className="w-14 px-1 py-0.5 input-glass text-center text-xs"
                        />
                        <span className="text-cyan-400/70">→</span>
                        <span className="text-white font-mono">
                          y={isNaN(point.y) ? '—' : point.y.toFixed(4)}
                        </span>
                        <span className="text-purple-400 font-mono text-[10px]">
                          f'={isNaN(point.derivative) ? '—' : point.derivative.toFixed(4)}
                        </span>
                        <button
                          onClick={() => removeMarkedPoint(fn.id, point.id, false)}
                          className="ml-auto text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all w-5 h-5 flex items-center justify-center rounded hover:bg-red-400/10"
                          aria-label="删除标记点"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
