// src/components/Controls/ParametricList.tsx
import { memo } from 'react';
import type { FC, KeyboardEvent, RefObject } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ParameterSlider } from './ParameterSlider';
import { EmptyState } from '../UI/EmptyState';
import { Eye, EyeOff, Trash2, KeyRound, TrendingUp } from 'lucide-react';
import type { ParametricFunction } from '../../types';
import { useInlineEdit } from '../../hooks/useInlineEdit';

interface ParametricItemProps {
  fn: ParametricFunction;
  isEditing: boolean;
  editExpression: string;
  onToggleVisibility: () => void;
  onToggleKeyPoints: () => void;
  onToggleDerivative: () => void;
  onRemove: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onEditExpressionChange: (value: string) => void;
  onEditKeyDown: (e: KeyboardEvent) => void;
  onUpdateParameter: (paramName: string, value: number) => void;
  onUpdateParameterConfig: (functionId: string, paramName: string, field: 'min' | 'max' | 'step', value: number) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

const ParametricItem = memo(function ParametricItem({
  fn,
  isEditing,
  editExpression,
  onToggleVisibility,
  onToggleKeyPoints,
  onToggleDerivative,
  onRemove,
  onStartEdit,
  onSaveEdit,
  onEditExpressionChange,
  onEditKeyDown,
  onUpdateParameter,
  onUpdateParameterConfig,
  inputRef,
}: ParametricItemProps) {
  return (
    <li>
      <div className="function-item panel flex items-center gap-2.5 px-3 py-2.5 group cursor-pointer">
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
            <span className="text-[#64748B]">y = </span>
            {fn.expression}
          </button>
        )}

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {fn.error && (
            <span className="text-[11px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-500/15" title={fn.error}>
              错误
            </span>
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
              onClick={onToggleDerivative}
              className={`btn-icon w-7 h-7 ${fn.showDerivative ? 'opacity-100 text-cyan-400 bg-cyan-500/10' : 'opacity-0 group-hover:opacity-100'}`}
              title={fn.showDerivative ? '隐藏导数曲线' : '显示导数曲线'}
            >
              <TrendingUp className="w-3.5 h-3.5" />
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

      {fn.error && (
        <div className="mx-1 mt-1 text-xs text-red-400 p-2 panel-subtle">
          {fn.error}
        </div>
      )}
    </li>
  );
});

export const ParametricList: FC = () => {
  const parametricFunctions = useAppStore(state => state.parametricFunctions);
  const updateParametricParameter = useAppStore(state => state.updateParametricParameter);
  const toggleParametricVisibility = useAppStore(state => state.toggleParametricVisibility);
  const toggleParametricKeyPoints = useAppStore(state => state.toggleParametricKeyPoints);
  const toggleParametricDerivative = useAppStore(state => state.toggleParametricDerivative);
  const removeParametricFunction = useAppStore(state => state.removeParametricFunction);
  const updateParametricExpression = useAppStore(state => state.updateParametricExpression);

  const { editExpression, setEditExpression, inputRef, startEditing, saveEdit, handleKeyDown, isEditing: isItemEditing } = useInlineEdit();

  if (parametricFunctions.length === 0) {
    return <EmptyState title="暂无参数化函数" subtitle="输入含参数的表达式" />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center gap-2 px-1 mb-3">
        <span className="text-[13px] text-[#94A3B8]">函数列表</span>
        <span className="badge">{parametricFunctions.length}</span>
      </div>

      <ul className="space-y-1.5">
        {parametricFunctions.map((fn) => (
          <ParametricItem
            key={fn.id}
            fn={fn}
            isEditing={isItemEditing(fn.id)}
            editExpression={editExpression}
            onToggleVisibility={() => toggleParametricVisibility(fn.id)}
            onToggleKeyPoints={() => toggleParametricKeyPoints(fn.id)}
            onToggleDerivative={() => toggleParametricDerivative(fn.id)}
            onRemove={() => removeParametricFunction(fn.id)}
            onStartEdit={() => startEditing(fn)}
            onSaveEdit={() => saveEdit(updateParametricExpression)}
            onEditExpressionChange={setEditExpression}
            onEditKeyDown={(e) => handleKeyDown(e, updateParametricExpression)}
            onUpdateParameter={(name, value) => updateParametricParameter(fn.id, name, 'currentValue', value)}
            onUpdateParameterConfig={updateParametricParameter}
            inputRef={inputRef}
          />
        ))}
      </ul>
    </div>
  );
};