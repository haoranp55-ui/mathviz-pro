// src/components/Controls/PolarList.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ParameterSlider } from './ParameterSlider';
import { EmptyState } from '../UI/EmptyState';
import { isPolarWebGLAvailable } from '../../lib/webgl/polarRendererManager';
import { Eye, EyeOff, Trash2, KeyRound, Zap, Check, Settings, ChevronUp } from 'lucide-react';

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
      <div className="flex items-center gap-2 px-1 mb-3">
        <span className="text-[13px] text-[#94A3B8]">函数列表</span>
        <span className="badge">{polarFunctions.length}</span>
      </div>

      <ul className="space-y-1.5">
        {polarFunctions.map((fn) => (
          <li key={fn.id}>
            <div className="function-item panel flex items-center gap-2.5 px-3 py-2.5 group">
              <div
                className="w-1 h-6 rounded-full flex-shrink-0 cursor-pointer transition-opacity"
                style={{ backgroundColor: fn.color, opacity: fn.visible ? 1 : 0.3 }}
                onClick={() => togglePolarVisibility(fn.id)}
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
                  <span className="text-[#64748B]">r = </span>
                  {fn.expression}
                </button>
              )}

              <div className="flex items-center gap-0.5 flex-shrink-0">
                {fn.error && (
                  <span className="text-[11px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-500/15" title={fn.error}>
                    错误
                  </span>
                )}

                {!fn.error && gpuAvailable && (
                  <button
                    onClick={() => togglePolarGPURendering(fn.id)}
                    className={`btn-icon w-7 h-7 ${fn.useGPURendering ? 'opacity-100 text-cyan-400 bg-cyan-500/10' : 'opacity-0 group-hover:opacity-100'}`}
                    title={fn.useGPURendering ? '关闭 GPU 渲染' : '开启 GPU 渲染'}
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => togglePolarVisibility(fn.id)}
                  className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100"
                  title={fn.visible ? '隐藏函数' : '显示函数'}
                >
                  {fn.visible ? <Eye className="w-3.5 h-3.5 text-[#34D399]" /> : <EyeOff className="w-3.5 h-3.5 text-[#475569]" />}
                </button>

                {!fn.error && (
                  <button
                    onClick={() => togglePolarKeyPoints(fn.id)}
                    className={`btn-icon w-7 h-7 ${fn.showKeyPoints ? 'opacity-100 text-[#60A5FA] bg-[#60A5FA]/10' : 'opacity-0 group-hover:opacity-100'}`}
                    title={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注'}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                )}

                {!fn.error && (
                  <button
                    onClick={() => setExpandedConfig(expandedConfig === fn.id ? null : fn.id)}
                    className={`btn-icon w-7 h-7 ${expandedConfig === fn.id ? 'opacity-100 text-cyan-400 bg-cyan-500/10' : 'opacity-0 group-hover:opacity-100'}`}
                    title="配置 theta 范围"
                  >
                    {expandedConfig === fn.id ? <ChevronUp className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
                  </button>
                )}

                <button
                  onClick={() => removePolarFunction(fn.id)}
                  className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10"
                  title="删除函数"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {fn.visible && !fn.error && fn.parameters.length > 0 && (
              <div className="mt-1 mx-1 p-2.5 panel-subtle space-y-2">
                {fn.parameters.map((param) => (
                  <ParameterSlider
                    key={param.name}
                    parameter={param}
                    onChange={(value) => updatePolarParameter(fn.id, param.name, value)}
                  />
                ))}
              </div>
            )}

            {fn.visible && !fn.error && fn.useGPURendering && (
              <div className="mt-1 mx-1 p-2 panel-subtle">
                <div className="text-xs text-green-400/80 flex items-center gap-1.5">
                  <Check className="w-3 h-3" />
                  <span>GPU 渲染已启用</span>
                </div>
              </div>
            )}

            {fn.visible && !fn.error && expandedConfig === fn.id && (
              <div className="mt-1 mx-1 p-2.5 panel-subtle space-y-2">
                <div className="text-xs text-[#94A3B8] mb-2 flex items-center gap-1">
                  <span>θ 范围</span>
                  <span className="text-cyan-400/70 font-mono">
                    [{(fn.thetaMin / Math.PI).toFixed(1)}π, {(fn.thetaMax / Math.PI).toFixed(1)}π]
                  </span>
                </div>

                <div className="flex gap-1.5 mb-2">
                  {THETA_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => updatePolarThetaRange(fn.id, 0, preset.value * Math.PI)}
                      className={`px-2 py-1 text-xs rounded transition-all ${
                        Math.abs(fn.thetaMax - preset.value * Math.PI) < 0.1
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-white/[0.03] text-[#64748B] hover:bg-white/[0.06] hover:text-[#94A3B8] border border-transparent'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-[#64748B]">
                    <span>最小:</span>
                    <input
                      type="number"
                      value={(fn.thetaMin / Math.PI).toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) * Math.PI;
                        if (!isNaN(val)) updatePolarThetaRange(fn.id, val, fn.thetaMax);
                      }}
                      className="w-14 px-1.5 py-0.5 input-base text-xs"
                      step="0.5"
                    />
                    <span className="text-[#475569]">π</span>
                  </label>
                  <label className="flex items-center gap-1 text-xs text-[#64748B]">
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
                      className="w-14 px-1.5 py-0.5 input-base text-xs"
                      step="0.5"
                      min={(fn.thetaMin / Math.PI) + 0.5}
                    />
                    <span className="text-[#475569]">π</span>
                  </label>
                </div>
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
