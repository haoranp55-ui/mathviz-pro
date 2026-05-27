// src/components/Controls/FunctionList.tsx
import { useState, memo, useCallback } from 'react';
import type { FC, KeyboardEvent, RefObject } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { EmptyState } from '../UI/EmptyState';
import { Eye, EyeOff, Trash2, TrendingUp, KeyRound, Plus, Percent, Sigma } from 'lucide-react';
import { simpsonIntegral } from '../../lib/integralSolver';
import type { ParsedFunction, Integral } from '../../types';
import { useInlineEdit } from '../../hooks/useInlineEdit';

interface FunctionItemProps {
  fn: ParsedFunction;
  integrals: Integral[];
  isEditing: boolean;
  editExpression: string;
  newPointX: string;
  onToggleVisibility: () => void;
  onToggleKeyPoints: () => void;
  onToggleDerivative: () => void;
  onToggleIntegralCurve: () => void;
  onRemove: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onEditExpressionChange: (value: string) => void;
  onEditKeyDown: (e: KeyboardEvent) => void;
  onNewPointXChange: (value: string) => void;
  onAddPoint: () => void;
  onUpdateCurveBasePoint: (value: number) => void;
  onUpdateMarkedPoint: (pointId: string, x: number) => void;
  onRemoveMarkedPoint: (pointId: string) => void;
  onAddIntegral: () => void;
  onRemoveIntegral: (integralId: string) => void;
  onUpdateIntegralBounds: (integralId: string, lower: number, upper: number) => void;
  onToggleIntegralAreaFill: (integralId: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

const FunctionItem = memo(function FunctionItem({
  fn,
  integrals,
  isEditing,
  editExpression,
  newPointX,
  onToggleVisibility,
  onToggleKeyPoints,
  onToggleDerivative,
  onToggleIntegralCurve,
  onRemove,
  onStartEdit,
  onSaveEdit,
  onEditExpressionChange,
  onEditKeyDown,
  onNewPointXChange,
  onAddPoint,
  onUpdateCurveBasePoint,
  onUpdateMarkedPoint,
  onRemoveMarkedPoint,
  onAddIntegral,
  onRemoveIntegral,
  onUpdateIntegralBounds,
  onToggleIntegralAreaFill,
  inputRef,
}: FunctionItemProps) {
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
              className={`btn-icon w-7 h-7 ${fn.showKeyPoints ? 'opacity-100 text-cyan-400 bg-cyan-500/10' : 'opacity-0 group-hover:opacity-100'}`}
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

          {!fn.error && (
            <button
              onClick={onToggleIntegralCurve}
              className={`btn-icon w-7 h-7 ${fn.showIntegralCurve ? 'opacity-100 text-green-400 bg-green-500/10' : 'opacity-0 group-hover:opacity-100'}`}
              title={fn.showIntegralCurve ? '隐藏积分曲线' : '显示积分曲线'}
            >
              <Sigma className="w-3.5 h-3.5" />
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

      {fn.visible && !fn.error && (
        <div className="mt-1 mx-1 p-2.5 panel-subtle space-y-2">
          {fn.showIntegralCurve && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748B] font-mono">∫ 起点x₀=</span>
              <input
                type="number"
                value={fn.curveBasePoint ?? 0}
                onChange={(e) => onUpdateCurveBasePoint(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 input-base text-xs text-center"
                placeholder="0"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B] font-mono">x =</span>
            <input
              type="text"
              placeholder="值"
              value={newPointX}
              onChange={(e) => onNewPointXChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddPoint()}
              className="flex-1 px-2 py-1 input-base text-xs"
            />
            <button
              onClick={onAddPoint}
              className="px-2.5 py-1 text-xs btn-primary flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              点
            </button>
          </div>

          {fn.markedPoints && fn.markedPoints.length > 0 && (
            <div className="space-y-1">
              {fn.markedPoints.map((point) => (
                <div key={point.id} className="flex items-center gap-2 text-xs p-1.5 panel-subtle group">
                  <input
                    type="number"
                    value={point.x}
                    onChange={(e) => onUpdateMarkedPoint(point.id, parseFloat(e.target.value) || 0)}
                    className="w-14 px-1 py-0.5 input-base text-center text-xs"
                  />
                  <span className="text-[#475569]">→</span>
                  <span className="text-[#E2E8F0] font-mono text-[11px]">
                    y={isNaN(point.y) ? '—' : point.y.toFixed(4)}
                  </span>
                  <span className="text-[#64748B] font-mono text-[10px]">
                    f'={isNaN(point.derivative) ? '—' : point.derivative.toFixed(4)}
                  </span>
                  <button
                    onClick={() => onRemoveMarkedPoint(point.id)}
                    className="ml-auto text-[#475569] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-red-400/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-white/[0.06] pt-2 mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#64748B]">积分区域</span>
              <button
                onClick={onAddIntegral}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                添加
              </button>
            </div>

            {integrals.map((integral) => (
              <div key={integral.id} className="p-2 panel-subtle space-y-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#64748B] font-mono">∫</span>
                  <input
                    type="number"
                    value={integral.lowerBound}
                    onChange={(e) => onUpdateIntegralBounds(integral.id, parseFloat(e.target.value) || 0, integral.upperBound)}
                    className="w-16 px-2 py-1 input-base text-xs text-center"
                    placeholder="a"
                  />
                  <span className="text-[#475569] text-xs">→</span>
                  <input
                    type="number"
                    value={integral.upperBound}
                    onChange={(e) => onUpdateIntegralBounds(integral.id, integral.lowerBound, parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 input-base text-xs text-center"
                    placeholder="b"
                  />
                  <button
                    onClick={() => onToggleIntegralAreaFill(integral.id)}
                    className={`px-2 py-1 text-xs rounded ${integral.showAreaFill ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-[#475569]'}`}
                    title={integral.showAreaFill ? '隐藏填充' : '显示填充'}
                  >
                    <Percent className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onRemoveIntegral(integral.id)}
                    className="text-[#475569] hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-xs text-[#64748B] font-mono">
                  值 = {simpsonIntegral(fn.compiled, integral.lowerBound, integral.upperBound).toFixed(6)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </li>
  );
});

export const FunctionList: FC = () => {
  const functions = useAppStore(s => s.functions);
  const integrals = useAppStore(s => s.integrals);
  const removeFunction = useAppStore(s => s.removeFunction);
  const toggleFunctionVisibility = useAppStore(s => s.toggleFunctionVisibility);
  const toggleFunctionDerivative = useAppStore(s => s.toggleFunctionDerivative);
  const toggleFunctionKeyPoints = useAppStore(s => s.toggleFunctionKeyPoints);
  const toggleFunctionIntegralCurve = useAppStore(s => s.toggleFunctionIntegralCurve);
  const updateFunctionCurveBasePoint = useAppStore(s => s.updateFunctionCurveBasePoint);
  const addMarkedPoint = useAppStore(s => s.addMarkedPoint);
  const removeMarkedPoint = useAppStore(s => s.removeMarkedPoint);
  const updateMarkedPoint = useAppStore(s => s.updateMarkedPoint);
  const updateFunctionExpression = useAppStore(s => s.updateFunctionExpression);
  const addIntegral = useAppStore(s => s.addIntegral);
  const removeIntegral = useAppStore(s => s.removeIntegral);
  const updateIntegralBounds = useAppStore(s => s.updateIntegralBounds);
  const toggleIntegralAreaFill = useAppStore(s => s.toggleIntegralAreaFill);

  const [newPointX, setNewPointX] = useState<Record<string, string>>({});
  const { editExpression, setEditExpression, inputRef, startEditing, saveEdit, handleKeyDown, isEditing: isItemEditing } = useInlineEdit();

  const handleAddPoint = useCallback((functionId: string) => {
    const xStr = newPointX[functionId] || '0';
    const x = parseFloat(xStr);
    if (!isNaN(x)) {
      addMarkedPoint(functionId, x, false);
      setNewPointX(prev => ({ ...prev, [functionId]: '' }));
    }
  }, [newPointX, addMarkedPoint]);

  if (functions.length === 0) {
    return (
      <EmptyState
        title="暂无函数"
        subtitle="输入表达式开始绘图"
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center gap-2 px-1 mb-3">
        <span className="text-[13px] text-[#94A3B8]">函数列表</span>
        <span className="badge">{functions.length}</span>
      </div>
      <ul className="space-y-1.5">
        {functions.map((fn) => (
          <FunctionItem
            key={fn.id}
            fn={fn}
            integrals={integrals.filter(i => i.functionId === fn.id && i.functionType === 'normal')}
            isEditing={isItemEditing(fn.id)}
            editExpression={editExpression}
            newPointX={newPointX[fn.id] || ''}
            onToggleVisibility={() => toggleFunctionVisibility(fn.id)}
            onToggleKeyPoints={() => toggleFunctionKeyPoints(fn.id)}
            onToggleDerivative={() => toggleFunctionDerivative(fn.id)}
            onToggleIntegralCurve={() => toggleFunctionIntegralCurve(fn.id)}
            onRemove={() => removeFunction(fn.id)}
            onStartEdit={() => startEditing(fn)}
            onSaveEdit={() => saveEdit(updateFunctionExpression)}
            onEditExpressionChange={setEditExpression}
            onEditKeyDown={(e) => handleKeyDown(e, updateFunctionExpression)}
            onNewPointXChange={(value) => setNewPointX(prev => ({ ...prev, [fn.id]: value }))}
            onAddPoint={() => handleAddPoint(fn.id)}
            onUpdateCurveBasePoint={(value) => updateFunctionCurveBasePoint(fn.id, value)}
            onUpdateMarkedPoint={(pointId, x) => updateMarkedPoint(fn.id, pointId, x, false)}
            onRemoveMarkedPoint={(pointId) => removeMarkedPoint(fn.id, pointId, false)}
            onAddIntegral={() => addIntegral(fn.id, 'normal')}
            onRemoveIntegral={(id) => removeIntegral(id)}
            onUpdateIntegralBounds={(id, lower, upper) => updateIntegralBounds(id, lower, upper)}
            onToggleIntegralAreaFill={(id) => toggleIntegralAreaFill(id)}
            inputRef={inputRef}
          />
        ))}
      </ul>
    </div>
  );
};