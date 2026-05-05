// src/components/Layout/EquationLayout.tsx
import React, { useState, useCallback } from 'react';
import { Sigma, HelpCircle, Trash2, Play, Plus, Minus, X } from 'lucide-react';
import { EquationBackground } from './EquationBackground';
import { useAppStore } from '../../store/useAppStore';
import type { VariableName, EquationSystem, Solution } from '../../types';
import { VARIABLE_NAMES } from '../../types';

const formatValue = (value: number): string => {
  if (Math.abs(value) < 1e-10) return '0';
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.001) {
    return value.toExponential(6);
  }
  return value.toFixed(8).replace(/\.?0+$/, '');
};

const SolutionCard: React.FC<{ solution: Solution; variables: string[]; index: number }> = ({
  solution,
  variables,
  index
}) => {
  return (
    <div className="panel p-4 border-l-2 border-l-emerald-500/40">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center border border-emerald-500/15">
          <span className="text-emerald-400 text-xs font-bold">{index + 1}</span>
        </div>
        <span className="text-emerald-400/80 text-sm font-medium">解</span>
        {solution.type === 'exact' && (
          <span className="text-xs bg-emerald-500/10 text-emerald-300/80 px-2 py-0.5 rounded border border-emerald-500/15">精确解</span>
        )}
      </div>
      <div className="grid gap-2">
        {variables.map((v, i) => (
          <div key={v} className="flex items-center gap-2">
            <span className="text-gray-500 text-sm font-mono w-5 text-right">{v}</span>
            <span className="text-gray-600 text-sm">=</span>
            <span className="text-gray-100 text-base font-mono font-medium">{formatValue(solution.values[i])}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex justify-between text-xs text-gray-600">
        <span>精度</span>
        <span className="font-mono">{solution.precision.toExponential(2)}</span>
      </div>
    </div>
  );
};

const EquationSystemCard: React.FC<{ system: EquationSystem }> = ({ system }) => {
  const { solveEquationSystem, removeEquationSystem, updateEquationSystemSearchRange, updateEquationExpression } = useAppStore();
  const [showRange, setShowRange] = useState(false);
  const [editingEquationId, setEditingEquationId] = useState<string | null>(null);
  const [editExpression, setEditExpression] = useState('');

  const handleSolve = () => {
    solveEquationSystem(system.id);
  };

  const handleRangeChange = (index: number, field: 'min' | 'max', value: number) => {
    const range = system.searchRange[index];
    updateEquationSystemSearchRange(
      system.id,
      index,
      field === 'min' ? value : range.min,
      field === 'max' ? value : range.max
    );
  };

  const statusConfig = {
    idle: { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/15', label: '待求解' },
    solving: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/15', label: '求解中...' },
    solved: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', label: '已求解' },
    error: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/15', label: '求解失败' },
  };

  const status = statusConfig[system.status];

  return (
    <div className="panel overflow-hidden">
      {/* 头部 */}
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            system.status === 'solved' ? 'bg-emerald-500' :
            system.status === 'error' ? 'bg-red-500' :
            system.status === 'solving' ? 'bg-amber-500 animate-pulse' :
            'bg-gray-500'
          }`}></div>
          <span className="text-gray-300 text-base font-medium">
            {system.variables.length} 元方程组
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-md ${status.bg} ${status.color} border ${status.border}`}>
            {status.label}
          </span>
        </div>
        <button
          onClick={() => removeEquationSystem(system.id)}
          className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 方程列表 */}
      <div className="p-5 space-y-2.5">
        {system.equations.map((eq, index) => (
          <div key={eq.id} className="flex items-center gap-3">
            <span className="text-gray-600 text-sm w-6 font-mono">{index + 1}.</span>
            {editingEquationId === eq.id ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={editExpression}
                  onChange={e => setEditExpression(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      updateEquationExpression(system.id, eq.id, editExpression);
                      setEditingEquationId(null);
                      setEditExpression('');
                    } else if (e.key === 'Escape') {
                      setEditingEquationId(null);
                      setEditExpression('');
                    }
                  }}
                  onBlur={() => {
                    updateEquationExpression(system.id, eq.id, editExpression);
                    setEditingEquationId(null);
                    setEditExpression('');
                  }}
                  autoFocus
                  className="flex-1 text-base font-mono input-glass px-4 py-2.5"
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingEquationId(eq.id);
                  setEditExpression(eq.expression);
                }}
                className="flex-1 text-left text-cyan-200/70 font-mono text-base bg-white/[0.02] px-4 py-2.5 rounded-lg border border-white/[0.04] hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all cursor-text"
                title="点击编辑"
              >
                {eq.expression}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 搜索范围 */}
      <div className="px-5 pb-4">
        <button
          onClick={() => setShowRange(!showRange)}
          className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1 transition-colors"
        >
          {showRange ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          搜索范围
        </button>
        {showRange && (
          <div className="mt-2.5 grid grid-cols-2 gap-3">
            {system.variables.map((v, i) => (
              <div key={v} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-4 font-mono">{v}</span>
                <input
                  type="number"
                  value={system.searchRange[i]?.min ?? -10}
                  onChange={(e) => handleRangeChange(i, 'min', parseFloat(e.target.value) || -10)}
                  className="flex-1 px-2 py-1.5 text-xs input-glass text-center"
                />
                <span className="text-gray-600 text-sm">~</span>
                <input
                  type="number"
                  value={system.searchRange[i]?.max ?? 10}
                  onChange={(e) => handleRangeChange(i, 'max', parseFloat(e.target.value) || 10)}
                  className="flex-1 px-2 py-1.5 text-xs input-glass text-center"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 解的展示 */}
      {system.solutions && system.solutions.length > 0 && (
        <div className="px-5 pb-5 space-y-3">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>找到 {system.solutions.length} 个解</span>
            <div className="flex-1 h-px bg-white/[0.04]"></div>
          </div>
          {system.solutions.map((solution, index) => (
            <SolutionCard
              key={index}
              solution={solution}
              variables={system.variables}
              index={index}
            />
          ))}
        </div>
      )}

      {/* 错误信息 */}
      {system.error && (
        <div className="px-5 pb-5">
          <div className="text-base text-red-400 bg-red-500/10 rounded-lg p-3.5 border border-red-500/15">
            {system.error}
          </div>
        </div>
      )}

      {/* 求解按钮 */}
      <div className="px-5 pb-5">
        <button
          onClick={handleSolve}
          disabled={system.status === 'solving' || system.equations.some(eq => eq.error)}
          className="w-full py-3 rounded-xl btn-glass text-base font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {system.status === 'solving' ? (
            <>
              <div className="w-5 h-5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin"></div>
              求解中...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              求解
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export const EquationLayout: React.FC = () => {
  const [variableCount, setVariableCount] = useState(2);
  const [expressions, setExpressions] = useState<string[]>(['', '']);
  const [showHelp, setShowHelp] = useState(false);

  const addEquationSystem = useAppStore(state => state.addEquationSystem);
  const equationSystems = useAppStore(state => state.equationSystems);

  const handleVariableCountChange = (count: number) => {
    setVariableCount(count);
    if (expressions.length < count) {
      setExpressions([...expressions, ...Array(count - expressions.length).fill('')]);
    } else {
      setExpressions(expressions.slice(0, count));
    }
  };

  const handleExpressionChange = (index: number, value: string) => {
    const newExpressions = [...expressions];
    newExpressions[index] = value;
    setExpressions(newExpressions);
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const validExpressions = expressions.filter(expr => expr.trim());
    if (validExpressions.length !== variableCount) return;
    const variables = VARIABLE_NAMES.slice(0, variableCount) as VariableName[];
    addEquationSystem(validExpressions, variables);
    setExpressions(Array(variableCount).fill(''));
  }, [expressions, variableCount, addEquationSystem]);

  const currentVariables = VARIABLE_NAMES.slice(0, variableCount);
  const allFilled = expressions.filter(e => e.trim()).length === variableCount;

  return (
    <div className="w-full h-full flex flex-col bg-[#0f172a] overflow-hidden relative">
      <EquationBackground />
      {/* 可滚动内容区 */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-[1440px] mx-auto px-8 py-6">
          {/* 顶部标题 */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/15">
                <Sigma className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-white">方程求解器</h1>
                <p className="text-[11px] text-gray-500">支持 1-5 元非线性方程组</p>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-cyan-500/20 transition-all"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {/* 主内容：左输入 + 右结果 */}
          <div className="flex flex-col xl:flex-row gap-5">
            {/* 左侧：输入面板 */}
            <div className="w-full xl:w-[460px] xl:flex-shrink-0">
              <div className="panel p-6 sticky top-0">
                {/* 变量数量选择 */}
                <div className="mb-5">
                  <label className="text-sm text-gray-400 mb-3 block font-medium">未知数数量</label>
                  <div className="tab-switcher">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleVariableCountChange(n)}
                        className={`tab-switcher-btn ${variableCount === n ? 'active' : ''}`}
                      >
                        {n} 元
                      </button>
                    ))}
                  </div>
                </div>

                {/* 方程输入 */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>输入方程</span>
                    <span className="text-gray-600 font-mono">({currentVariables.join(', ')})</span>
                  </div>

                  {Array.from({ length: variableCount }).map((_, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-500 text-sm font-mono">
                        {index + 1}
                      </div>
                      <input
                        type="text"
                        value={expressions[index] || ''}
                        onChange={(e) => handleExpressionChange(index, e.target.value)}
                        placeholder={`${currentVariables[index]} + ${currentVariables[(index + 1) % variableCount]} = 1`}
                        className="flex-1 px-4 py-3 input-glass text-base"
                      />
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={!allFilled}
                    className="w-full py-3.5 rounded-xl btn-primary text-base font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                    添加方程组
                  </button>
                </form>

                {/* 示例 */}
                <div className="mt-5 pt-5 border-t border-white/[0.05]">
                  <p className="text-xs text-gray-600 mb-2.5">示例</p>
                  <div className="flex flex-wrap gap-2">
                    {variableCount === 1 && (
                      <code className="text-xs text-gray-500 bg-white/[0.02] px-2.5 py-1.5 rounded border border-white/[0.04]">x^2 - 4 = 0</code>
                    )}
                    {variableCount === 2 && (
                      <>
                        <code className="text-xs text-gray-500 bg-white/[0.02] px-2.5 py-1.5 rounded border border-white/[0.04]">x + y = 3</code>
                        <code className="text-xs text-gray-500 bg-white/[0.02] px-2.5 py-1.5 rounded border border-white/[0.04]">x - y = 1</code>
                      </>
                    )}
                    {variableCount >= 3 && (
                      <>
                        <code className="text-xs text-gray-500 bg-white/[0.02] px-2.5 py-1.5 rounded border border-white/[0.04]">x + y + z = 6</code>
                        <code className="text-xs text-gray-500 bg-white/[0.02] px-2.5 py-1.5 rounded border border-white/[0.04]">x - y = 0</code>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：方程组列表 */}
            <div className="flex-1 min-w-0">
              {equationSystems.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>方程组列表</span>
                    <div className="flex-1 h-px bg-white/[0.04]"></div>
                    <span className="text-[11px] bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05]">{equationSystems.length} 个</span>
                  </div>
                  <div className="space-y-3">
                    {equationSystems.map(system => (
                      <EquationSystemCard key={system.id} system={system} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex items-center justify-center">
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-4">
                      <Sigma className="w-7 h-7 text-gray-600" />
                    </div>
                    <p className="text-gray-500 text-sm">暂无方程组</p>
                    <p className="text-gray-600 text-xs mt-1">在左侧面板输入方程开始求解</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 帮助面板 */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowHelp(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-6 max-w-lg mx-4 border border-white/[0.08] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">方程求解器帮助</h3>
              <button onClick={() => setShowHelp(false)} className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">使用步骤</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-400 text-sm">
                  <li>选择未知数数量（1-5元）</li>
                  <li>输入对应数量的方程</li>
                  <li>点击"添加方程组"</li>
                  <li>点击"求解"获取结果</li>
                </ol>
              </div>
              <div>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">方程格式</p>
                <div className="space-y-1 text-gray-400 text-sm">
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">x + y = 3</code></p>
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">x^2 + y^2 = 1</code></p>
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">sin(x) + y = 0</code></p>
                </div>
              </div>
              <div>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">支持的函数</p>
                <p className="text-gray-400 text-sm">sin, cos, tan, exp, log, sqrt, abs, factorial, gamma 等</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
