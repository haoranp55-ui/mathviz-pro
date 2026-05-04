// src/components/Controls/PolarList.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ParameterSlider } from './ParameterSlider';
import { EmptyState } from '../UI/EmptyState';
import { isPolarWebGLAvailable } from '../../lib/webgl/polarRendererManager';

// 预设 theta 范围
const THETA_PRESETS = [
  { label: '1圈', value: 2 },
  { label: '2圈', value: 4 },
  { label: '3圈', value: 6 },
  { label: '4圈', value: 8 },
];

export const PolarList: React.FC = () => {
  const polarFunctions = useAppStore(state => state.polarFunctions);
  const updatePolarParameter = useAppStore(state => state.updatePolarParameter);
  const updatePolarThetaRange = useAppStore(state => state.updatePolarThetaRange);
  const togglePolarVisibility = useAppStore(state => state.togglePolarVisibility);
  const togglePolarKeyPoints = useAppStore(state => state.togglePolarKeyPoints);
  const togglePolarGPURendering = useAppStore(state => state.togglePolarGPURendering);
  const removePolarFunction = useAppStore(state => state.removePolarFunction);
  const updatePolarExpression = useAppStore(state => state.updatePolarExpression);

  const [gpuAvailable] = useState(() => isPolarWebGLAvailable());
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);
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

  const startEditing = (fn: { id: string; expression: string }) => {
    setEditingId(fn.id);
    setEditExpression(fn.expression);
  };

  const saveEdit = () => {
    if (editingId && editExpression.trim()) {
      updatePolarExpression(editingId, editExpression.trim());
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

  if (polarFunctions.length === 0) {
    return (
      <EmptyState
        title="暂无极坐标函数"
        subtitle="输入 sin(3*x) 添加曲线"
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="text-xs text-gray-500 px-2 mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
        <span className="text-gray-400">极坐标函数列表</span>
        <span className="text-amber-400 font-serif text-sm">r = f(θ)</span>
        <span className="ml-auto glass-subtle px-2 py-0.5 rounded-md text-xs text-amber-300 border border-white/5">
          {polarFunctions.length}
        </span>
      </div>

      <ul className="space-y-2">
        {polarFunctions.map((fn) => (
          <li key={fn.id}>
            <div className="function-item glass-card flex items-center gap-2.5 px-3 py-2.5 group cursor-pointer">
              {/* 颜色指示条 */}
              <div
                className="w-1.5 h-7 rounded-full flex-shrink-0 cursor-pointer transition-all duration-300 hover:scale-y-110"
                style={{
                  backgroundColor: fn.color,
                  boxShadow: `0 0 10px ${fn.color}60, 0 0 4px ${fn.color}40`
                }}
                onClick={() => togglePolarVisibility(fn.id)}
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
                  className="flex-1 text-sm font-mono bg-white/10 px-2 py-1 rounded border border-amber-400/50 focus:outline-none focus:border-amber-400 text-white"
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
                  <span className="text-amber-400/80">r = </span>
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

                {/* GPU 渲染开关（函数级别） */}
                {!fn.error && gpuAvailable && (
                  <button
                    onClick={() => togglePolarGPURendering(fn.id)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      fn.useGPURendering
                        ? 'text-amber-400 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/20'
                        : 'text-gray-500 hover:text-amber-400 hover:bg-amber-400/10 opacity-0 group-hover:opacity-100'
                    }`}
                    title={fn.useGPURendering ? '关闭 GPU 渲染' : '开启 GPU 渲染（并行采样）'}
                    aria-label={fn.useGPURendering ? '关闭 GPU 渲染' : '开启 GPU 渲染'}
                  >
                    ⚡
                  </button>
                )}

                {/* 显示/隐藏按钮 */}
                <button
                  onClick={() => togglePolarVisibility(fn.id)}
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
                    onClick={() => togglePolarKeyPoints(fn.id)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      fn.showKeyPoints
                        ? 'text-blue-400 bg-blue-400/15 hover:bg-blue-400/25 border border-blue-400/20'
                        : 'text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 opacity-0 group-hover:opacity-100'
                    }`}
                    title={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注'}
                    aria-label={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注'}
                  >
                    ◆
                  </button>
                )}

                {/* 删除按钮 */}
                <button
                  onClick={() => removePolarFunction(fn.id)}
                  className="text-gray-500 hover:text-red-400 hover:bg-red-400/15 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-400/20"
                  title="删除函数"
                  aria-label="删除函数"
                >
                  ✕
                </button>

                {/* 范围配置按钮 */}
                {!fn.error && (
                  <button
                    onClick={() => setExpandedConfig(expandedConfig === fn.id ? null : fn.id)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      expandedConfig === fn.id
                        ? 'text-amber-400 bg-amber-400/15 border border-amber-400/20'
                        : 'text-gray-500 hover:text-amber-400 hover:bg-amber-400/10 opacity-0 group-hover:opacity-100'
                    }`}
                    title="配置 theta 范围"
                    aria-label="配置 theta 范围"
                  >
                    ⚙
                  </button>
                )}
              </div>
            </div>

            {/* 展开内容：参数滑钮 */}
            {fn.visible && !fn.error && fn.parameters.length > 0 && (
              <div className="mt-1.5 mx-1 p-2.5 glass-subtle rounded-xl border border-white/[0.04] space-y-2">
                {fn.parameters.map((param) => (
                  <ParameterSlider
                    key={param.name}
                    parameter={param}
                    onChange={(value) => updatePolarParameter(fn.id, param.name, value)}
                  />
                ))}
              </div>
            )}

            {/* GPU 渲染状态提示 */}
            {fn.visible && !fn.error && fn.useGPURendering && (
              <div className="mt-1.5 mx-1 p-2 glass-subtle rounded-xl border border-amber-500/10">
                <div className="text-xs text-amber-400/80 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>GPU 渲染已启用（并行采样）</span>
                </div>
              </div>
            )}

            {/* Theta 范围配置 */}
            {fn.visible && !fn.error && expandedConfig === fn.id && (
              <div className="mt-1.5 mx-1 p-2.5 glass-subtle rounded-xl border border-amber-500/10 space-y-2">
                <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <span>θ 范围</span>
                  <span className="text-amber-400 font-mono">
                    [{(fn.thetaMin / Math.PI).toFixed(1)}π, {(fn.thetaMax / Math.PI).toFixed(1)}π]
                  </span>
                </div>

                {/* 预设按钮 */}
                <div className="flex gap-1.5 mb-2">
                  {THETA_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => updatePolarThetaRange(fn.id, 0, preset.value * Math.PI)}
                      className={`px-2 py-1 text-xs rounded-lg transition-all ${
                        Math.abs(fn.thetaMax - preset.value * Math.PI) < 0.1
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-white/5 text-gray-400 hover:bg-amber-500/10 hover:text-amber-300 border border-transparent'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* 手动输入 */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-gray-400">
                    <span>最小:</span>
                    <input
                      type="number"
                      value={(fn.thetaMin / Math.PI).toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) * Math.PI;
                        if (!isNaN(val)) updatePolarThetaRange(fn.id, val, fn.thetaMax);
                      }}
                      className="w-14 px-1.5 py-0.5 input-glass text-xs"
                      step="0.5"
                    />
                    <span className="text-gray-500">π</span>
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-400">
                    <span>最大:</span>
                    <input
                      type="number"
                      value={(fn.thetaMax / Math.PI).toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) * Math.PI;
                        if (!isNaN(val) && val > fn.thetaMin) {
                          updatePolarThetaRange(fn.id, fn.thetaMin, val);
                        }
                      }}
                      className="w-14 px-1.5 py-0.5 input-glass text-xs"
                      step="0.5"
                      min={(fn.thetaMin / Math.PI) + 0.5}
                    />
                    <span className="text-gray-500">π</span>
                  </label>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {fn.error && (
              <div className="mt-1.5 mx-1 text-xs text-red-400 p-2 glass-subtle rounded-xl border border-red-500/20">
                {fn.error}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
