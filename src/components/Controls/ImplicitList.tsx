// src/components/Controls/ImplicitList.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ParameterSlider } from './ParameterSlider';
import { EmptyState } from '../UI/EmptyState';
import { isWebGLAvailable } from '../../lib/webgl/implicitRendererManager';
import { Eye, EyeOff, Trash2, KeyRound, Zap, Check, Monitor } from 'lucide-react';

export const ImplicitList: React.FC = () => {
  const implicitFunctions = useAppStore(state => state.implicitFunctions);
  const removeImplicitFunction = useAppStore(state => state.removeImplicitFunction);
  const toggleImplicitVisibility = useAppStore(state => state.toggleImplicitVisibility);
  const toggleImplicitKeyPoints = useAppStore(state => state.toggleImplicitKeyPoints);
  const toggleImplicitGPURendering = useAppStore(state => state.toggleImplicitGPURendering);
  const updateImplicitParameter = useAppStore(state => state.updateImplicitParameter);
  const updateImplicitExpression = useAppStore(state => state.updateImplicitExpression);

  const [gpuAvailable] = useState(() => isWebGLAvailable());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editExpression, setEditExpression] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEditing = (fn: { id: string; expression: string }) => {
    setEditingId(fn.id);
    setEditExpression(fn.expression);
  };

  const saveEdit = () => {
    if (editingId && editExpression.trim()) {
      updateImplicitExpression(editingId, editExpression.trim());
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

  if (implicitFunctions.length === 0) {
    return (
      <EmptyState
        title="暂无隐函数"
        subtitle="请添加隐函数"
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center gap-2 px-1 mb-3">
        <span className="text-[13px] text-[#94A3B8]">函数列表</span>
        <span className="badge">{implicitFunctions.length}</span>
      </div>

      <ul className="space-y-1.5">
        {implicitFunctions.map(fn => (
          <li key={fn.id}>
            <div className="function-item panel flex items-center gap-2.5 px-3 py-2.5 group">
              <div
                className="w-1 h-6 rounded-full flex-shrink-0 cursor-pointer transition-opacity"
                style={{ backgroundColor: fn.color, opacity: fn.visible ? 1 : 0.3 }}
                onClick={() => toggleImplicitVisibility(fn.id)}
              />

              {editingId === fn.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editExpression}
                  onChange={(e) => setEditExpression(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={handleKeyDown}
                  className="flex-1 text-[13px] font-mono bg-white/[0.05] px-2 py-1 rounded border border-cyan-500/40 focus:outline-none focus:border-cyan-500 text-[#E2E8F0]"
                  placeholder="输入表达式"
                />
              ) : (
                <button
                  className={`text-[13px] flex-1 text-left font-mono truncate transition-colors ${
                    fn.visible ? 'text-[#E2E8F0]' : 'text-[#475569] line-through'
                  }`}
                  onClick={() => startEditing(fn)}
                  title="点击编辑"
                >
                  {fn.expression}
                </button>
              )}

              <div className="flex items-center gap-0.5 flex-shrink-0">
                {fn.error && (
                  <span className="text-[11px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-500/15" title={fn.error}>
                    错误
                  </span>
                )}

                {!fn.error && gpuAvailable && !fn.requiresCPU && (
                  <button
                    onClick={() => toggleImplicitGPURendering(fn.id)}
                    className={`btn-icon w-7 h-7 ${fn.useGPURendering ? 'opacity-100 text-cyan-400 bg-cyan-500/10' : 'opacity-0 group-hover:opacity-100'}`}
                    title={fn.useGPURendering ? '关闭 GPU 渲染' : '开启 GPU 渲染'}
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => toggleImplicitVisibility(fn.id)}
                  className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100"
                  title={fn.visible ? '隐藏函数' : '显示函数'}
                >
                  {fn.visible ? <Eye className="w-3.5 h-3.5 text-[#34D399]" /> : <EyeOff className="w-3.5 h-3.5 text-[#475569]" />}
                </button>

                {!fn.error && (
                  <button
                    onClick={() => toggleImplicitKeyPoints(fn.id)}
                    className={`btn-icon w-7 h-7 ${fn.showKeyPoints ? 'opacity-100 text-[#60A5FA] bg-[#60A5FA]/10' : 'opacity-0 group-hover:opacity-100'}`}
                    title={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注'}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => removeImplicitFunction(fn.id)}
                  className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10"
                  title="删除函数"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {fn.visible && !fn.error && (
              <div className="mt-1 mx-1 p-2.5 panel-subtle space-y-2">
                {fn.transformedExpression && (
                  <div className="text-xs text-amber-400/80 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>已转换为: <code className="font-mono text-amber-300">{fn.transformedExpression} = 0</code></span>
                  </div>
                )}

                {fn.requiresCPU && (
                  <div className="text-xs text-blue-400/80 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5" />
                    <span>已自动切换到 CPU 渲染</span>
                  </div>
                )}

                {fn.useGPURendering && !fn.requiresCPU && (
                  <div className="text-xs text-green-400/80 flex items-center gap-1.5">
                    <Check className="w-3 h-3" />
                    <span>GPU 渲染已启用</span>
                  </div>
                )}

                {fn.parameters.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {fn.parameters.map(param => (
                      <ParameterSlider
                        key={param.name}
                        parameter={param}
                        onChange={(value) => updateImplicitParameter(fn.id, param.name, value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {fn.error && (
              <div className="mx-1 mt-1 text-xs text-red-400 p-2 panel-subtle">
                {fn.error}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
