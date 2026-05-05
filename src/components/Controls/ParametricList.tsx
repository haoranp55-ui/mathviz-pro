// src/components/Controls/ParametricList.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ParameterSlider } from './ParameterSlider';
import { useLinkedParameters } from '../../hooks/useLinkedParameters';
import { EmptyState } from '../UI/EmptyState';
import { Eye, EyeOff, Trash2, Sigma, KeyRound, Plus } from 'lucide-react';

export const ParametricList: React.FC = () => {
  const parametricFunctions = useAppStore(state => state.parametricFunctions);
  const updateParameter = useAppStore(state => state.updateParameter);
  const updateParametricParameter = useAppStore(state => state.updateParametricParameter);
  const toggleParametricVisibility = useAppStore(state => state.toggleParametricVisibility);
  const toggleParametricDerivative = useAppStore(state => state.toggleParametricDerivative);
  const toggleParametricKeyPoints = useAppStore(state => state.toggleParametricKeyPoints);
  const removeParametricFunction = useAppStore(state => state.removeParametricFunction);
  const addMarkedPoint = useAppStore(state => state.addMarkedPoint);
  const removeMarkedPoint = useAppStore(state => state.removeMarkedPoint);
  const updateMarkedPoint = useAppStore(state => state.updateMarkedPoint);
  const updateParametricExpression = useAppStore(state => state.updateParametricExpression);

  const [newPointX, setNewPointX] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editExpression, setEditExpression] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const linkedParams = useLinkedParameters(parametricFunctions);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleAddPoint = (functionId: string) => {
    const xStr = newPointX[functionId] || '0';
    const x = parseFloat(xStr);
    if (!isNaN(x)) {
      addMarkedPoint(functionId, x, true);
      setNewPointX({ ...newPointX, [functionId]: '' });
    }
  };

  const startEditing = (fn: { id: string; expression: string }) => {
    setEditingId(fn.id);
    setEditExpression(fn.expression);
  };

  const saveEdit = () => {
    if (editingId && editExpression.trim()) {
      updateParametricExpression(editingId, editExpression.trim());
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

  if (parametricFunctions.length === 0) {
    return (
      <EmptyState
        title="暂无参数化函数"
        subtitle="在上方输入表达式添加"
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center gap-2 px-1 mb-3">
        <span className="text-[13px] text-[#94A3B8]">函数列表</span>
        <span className="badge">{parametricFunctions.length}</span>
      </div>
      <ul className="space-y-1.5">
        {parametricFunctions.map((fn) => (
          <li key={fn.id}>
            <div className="function-item panel flex items-center gap-2.5 px-3 py-2.5 group">
              <div
                className="w-1 h-6 rounded-full flex-shrink-0 cursor-pointer transition-opacity"
                style={{ backgroundColor: fn.color, opacity: fn.visible ? 1 : 0.3 }}
                onClick={() => toggleParametricVisibility(fn.id)}
              />

              {editingId === fn.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editExpression}
                  onChange={(e) => setEditExpression(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={handleKeyDown}
                  className="flex-1 text-[13px] font-mono bg-white/[0.05] px-2 py-1 rounded border border-[#A78BFA]/50 focus:outline-none focus:border-[#A78BFA] text-[#E2E8F0]"
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
                <button
                  onClick={() => toggleParametricVisibility(fn.id)}
                  className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100"
                  title={fn.visible ? '隐藏函数' : '显示函数'}
                >
                  {fn.visible ? <Eye className="w-3.5 h-3.5 text-[#34D399]" /> : <EyeOff className="w-3.5 h-3.5 text-[#475569]" />}
                </button>

                {!fn.error && (
                  <button
                    onClick={() => toggleParametricKeyPoints(fn.id)}
                    className={`btn-icon w-7 h-7 ${fn.showKeyPoints ? 'opacity-100 text-[#60A5FA] bg-[#60A5FA]/10' : 'opacity-0 group-hover:opacity-100'}`}
                    title={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注'}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                )}

                {!fn.error && (
                  <button
                    onClick={() => toggleParametricDerivative(fn.id)}
                    className={`btn-icon w-7 h-7 ${fn.showDerivative ? 'opacity-100 text-[#A78BFA] bg-[#A78BFA]/10' : 'opacity-0 group-hover:opacity-100'}`}
                    title={fn.showDerivative ? '隐藏导数曲线' : '显示导数曲线'}
                  >
                    <Sigma className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => removeParametricFunction(fn.id)}
                  className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10"
                  title="删除函数"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {fn.visible && !fn.error && (
              <div className="mt-1 mx-1 p-2.5 panel-subtle space-y-2">
                {fn.parameters.length > 0 && (
                  <div className="space-y-2">
                    {fn.parameters.map((param) => (
                      <ParameterSlider
                        key={param.name}
                        parameter={param}
                        functionId={fn.id}
                        onChange={(value) => updateParameter(fn.id, param.name, value)}
                        onConfigChange={updateParametricParameter}
                        linkedInfo={linkedParams.get(`${fn.id}:${param.name}`)}
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#64748B] font-mono">x =</span>
                  <input
                    type="text"
                    placeholder="值"
                    value={newPointX[fn.id] || ''}
                    onChange={(e) => setNewPointX({ ...newPointX, [fn.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPoint(fn.id)}
                    className="flex-1 px-2 py-1 input-base text-xs"
                  />
                  <button
                    onClick={() => handleAddPoint(fn.id)}
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
                          onChange={(e) => updateMarkedPoint(fn.id, point.id, parseFloat(e.target.value) || 0, true)}
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
                          onClick={() => removeMarkedPoint(fn.id, point.id, true)}
                          className="ml-auto text-[#475569] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-red-400/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
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
