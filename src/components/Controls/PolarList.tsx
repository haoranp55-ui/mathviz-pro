// src/components/Controls/PolarList.tsx
import { useState, memo } from 'react';
import type { FC, KeyboardEvent, RefObject } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ParameterSlider } from './ParameterSlider';
import { EmptyState } from '../UI/EmptyState';
import { isPolarWebGLAvailable } from '../../lib/webgl/polarRendererManager';
import { Eye, EyeOff, Trash2, KeyRound, Zap, Check, Settings, ChevronUp } from 'lucide-react';
import type { PolarFunction } from '../../types';
import { useInlineEdit } from '../../hooks/useInlineEdit';

const THETA_PRESETS = [
  { label: '1圈', value: 2 },
  { label: '2圈', value: 4 },
  { label: '3圈', value: 6 },
  { label: '4圈', value: 8 },
];

interface PolarItemProps {
  fn: PolarFunction;
  gpuAvailable: boolean;
  isExpanded: boolean;
  isEditing: boolean;
  editExpression: string;
  onToggleVisibility: () => void;
  onToggleKeyPoints: () => void;
  onToggleGPU: () => void;
  onRemove: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onEditExpressionChange: (value: string) => void;
  onEditKeyDown: (e: KeyboardEvent) => void;
  onToggleExpanded: () => void;
  onUpdateParameter: (paramName: string, value: number) => void;
  onUpdateParameterConfig: (functionId: string, paramName: string, field: 'min' | 'max' | 'step', value: number) => void;
  onUpdateThetaRange: (min: number, max: number) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

const PolarItem = memo(function PolarItem({
  fn,
  gpuAvailable,
  isExpanded,
  isEditing,
  editExpression,
  onToggleVisibility,
  onToggleKeyPoints,
  onToggleGPU,
  onRemove,
  onStartEdit,
  onSaveEdit,
  onEditExpressionChange,
  onEditKeyDown,
  onToggleExpanded,
  onUpdateParameter,
  onUpdateParameterConfig,
  onUpdateThetaRange,
  inputRef,
}: PolarItemProps) {
  return (
    <li>
      <div className="function-item panel flex items-center gap-2.5 px-3 py-2.5 group">
        <div
          className="w-1 h-6 rounded-full flex-shrink-0 cursor-pointer transition-opacity"
          style={{ backgroundColor: fn.color, opacity: fn.visible ? 1 : 0.3 }}
          onClick={onToggleVisibility}
        />

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editExpression}
            onChange={(e) => onEditExpressionChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={onEditKeyDown}
            className="flex-1 text-[13px] font-mono bg-white/[0.05] px-2 py-1 rounded border border-cyan-500/40 focus:outline-none focus:border-cyan-500 text-[#E2E8F0]"
            placeholder="输入表达式"
          />
        ) : (
          <button
            className={`text-[13px] flex-1 text-left font-mono truncate transition-colors ${
              fn.visible ? 'text-[#E2E8F0]' : 'text-[#475569] line-through'
            }`}
            onClick={onStartEdit}
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
              onClick={onToggleGPU}
              className={`btn-icon w-7 h-7 ${fn.useGPURendering ? 'opacity-100 text-cyan-400 bg-cyan-500/10' : 'opacity-0 group-hover:opacity-100'}`}
              title={fn.useGPURendering ? '关闭 GPU 渲染' : '开启 GPU 渲染'}
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onToggleVisibility}
            className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100"
            title={fn.visible ? '隐藏函数' : '显示函数'}
          >
            {fn.visible ? <Eye className="w-3.5 h-3.5 text-[#34D399]" /> : <EyeOff className="w-3.5 h-3.5 text-[#475569]" />}
          </button>

          {!fn.error && (
            <button
              onClick={onToggleKeyPoints}
              className={`btn-icon w-7 h-7 ${fn.showKeyPoints ? 'opacity-100 text-[#60A5FA] bg-[#60A5FA]/10' : 'opacity-0 group-hover:opacity-100'}`}
              title={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注'}
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          )}

          {!fn.error && (
            <button
              onClick={onToggleExpanded}
              className={`btn-icon w-7 h-7 ${isExpanded ? 'opacity-100 text-cyan-400 bg-cyan-500/10' : 'opacity-0 group-hover:opacity-100'}`}
              title="配置 theta 范围"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={onRemove}
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
              onChange={(value) => onUpdateParameter(param.name, value)}
              onConfigChange={onUpdateParameterConfig}
              functionId={fn.id}
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

      {fn.visible && !fn.error && isExpanded && (
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
                onClick={() => onUpdateThetaRange(0, preset.value * Math.PI)}
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
                  if (!isNaN(val)) onUpdateThetaRange(val, fn.thetaMax);
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
                  if (!isNaN(val) && val > fn.thetaMin) onUpdateThetaRange(fn.thetaMin, val);
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
  );
});

export const PolarList: FC = () => {
  const polarFunctions = useAppStore(state => state.polarFunctions);
  const updatePolarParameter = useAppStore(state => state.updatePolarParameter);
  const updatePolarParamConfig = useAppStore(state => state.updatePolarParamConfig);
  const updatePolarThetaRange = useAppStore(state => state.updatePolarThetaRange);
  const togglePolarVisibility = useAppStore(state => state.togglePolarVisibility);
  const togglePolarKeyPoints = useAppStore(state => state.togglePolarKeyPoints);
  const togglePolarGPURendering = useAppStore(state => state.togglePolarGPURendering);
  const removePolarFunction = useAppStore(state => state.removePolarFunction);
  const updatePolarExpression = useAppStore(state => state.updatePolarExpression);

  const [gpuAvailable] = useState(() => isPolarWebGLAvailable());
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);
  const { editExpression, setEditExpression, inputRef, startEditing, saveEdit, handleKeyDown, isEditing: isItemEditing } = useInlineEdit();

  if (polarFunctions.length === 0) {
    return <EmptyState title="暂无极坐标函数" subtitle="输入 sin(3*x) 添加曲线" />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center gap-2 px-1 mb-3">
        <span className="text-[13px] text-[#94A3B8]">函数列表</span>
        <span className="badge">{polarFunctions.length}</span>
      </div>

      <ul className="space-y-1.5">
        {polarFunctions.map((fn) => (
          <PolarItem
            key={fn.id}
            fn={fn}
            gpuAvailable={gpuAvailable}
            isExpanded={expandedConfig === fn.id}
            isEditing={isItemEditing(fn.id)}
            editExpression={editExpression}
            onToggleVisibility={() => togglePolarVisibility(fn.id)}
            onToggleKeyPoints={() => togglePolarKeyPoints(fn.id)}
            onToggleGPU={() => togglePolarGPURendering(fn.id)}
            onRemove={() => removePolarFunction(fn.id)}
            onStartEdit={() => startEditing(fn)}
            onSaveEdit={() => saveEdit(updatePolarExpression)}
            onEditExpressionChange={setEditExpression}
            onEditKeyDown={(e) => handleKeyDown(e, updatePolarExpression)}
            onToggleExpanded={() => setExpandedConfig(expandedConfig === fn.id ? null : fn.id)}
            onUpdateParameter={(name, value) => updatePolarParameter(fn.id, name, value)}
            onUpdateParameterConfig={updatePolarParamConfig}
            onUpdateThetaRange={(min, max) => updatePolarThetaRange(fn.id, min, max)}
            inputRef={inputRef}
          />
        ))}
      </ul>
    </div>
  );
};