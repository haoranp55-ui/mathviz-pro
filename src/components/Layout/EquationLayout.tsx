// src/components/Layout/EquationLayout.tsx
import React, { useState, useCallback } from 'react';
import { Sigma, HelpCircle, Trash2, Play, Plus, Minus, X, Activity } from 'lucide-react';
import { EquationBackground } from './EquationBackground';
import { useAppStore } from '../../store/useAppStore';
import type { VariableName, EquationSystem, Solution } from '../../types';
import { VARIABLE_NAMES } from '../../types';
import { BUILTIN_FUNCTIONS, parseCoefficients, parseXFunction, parseInitialConditions } from '../../lib/differentialParser';
import { solveDifferentialEquation, type DifferentialSolution } from '../../lib/differentialSolver';

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
  // 子系统切换
  const [activeTab, setActiveTab] = useState<'equation' | 'differential'>('equation');

  // 方程组状态
  const [variableCount, setVariableCount] = useState(2);
  const [expressions, setExpressions] = useState<string[]>(['', '']);
  const [showHelp, setShowHelp] = useState(false);

  // 微分方程状态
  const [yCoeffsInput, setYCoeffsInput] = useState('');
  const [xCoeffsInput, setXCoeffsInput] = useState('1');  // 默认只有常数项
  const [xFuncInput, setXFuncInput] = useState('t');
  const [initialCondInput, setInitialCondInput] = useState('');
  const [showFuncPicker, setShowFuncPicker] = useState(false);
  const [showDiffHelp, setShowDiffHelp] = useState(false);  // 微分方程帮助
  const [differentialResult, setDifferentialResult] = useState<DifferentialSolution | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  // 新增：显示模式切换
  const [displayMode, setDisplayMode] = useState<'approach1' | 'approach2'>('approach2');
  // approach1: 零输入响应 + 零状态响应 + 完全响应
  // approach2: 齐次解 + 特解 + 通解

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

  // 微分方程求解
  const handleDifferentialSolve = useCallback(() => {
    setDiffError(null);
    setDifferentialResult(null);

    const yCoeffs = parseCoefficients(yCoeffsInput, true);
    const xCoeffs = parseCoefficients(xCoeffsInput, false);  // x 系数可以是单个
    const xFunc = parseXFunction(xFuncInput);

    if (yCoeffs instanceof Error) {
      setDiffError(yCoeffs.message);
      return;
    }
    if (xCoeffs instanceof Error) {
      setDiffError(xCoeffs.message);
      return;
    }
    if (xFunc instanceof Error) {
      setDiffError(xFunc.message);
      return;
    }

    const order = (yCoeffs as number[]).length - 1;
    const { conditions, conditionType, error } = parseInitialConditions(initialCondInput, order);
    if (error) {
      setDiffError(error);
      return;
    }

    const result = solveDifferentialEquation(
      yCoeffs as number[],
      xCoeffs as number[],
      xFunc as string,
      conditions,
      conditionType
    );

    setDifferentialResult(result);
  }, [yCoeffsInput, xCoeffsInput, xFuncInput, initialCondInput]);

  // 选择内置函数
  const handleSelectFunction = (func: string) => {
    setXFuncInput(prev => prev + func);
    setShowFuncPicker(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0f172a] overflow-hidden relative">
      <EquationBackground />
      {/* 可滚动内容区 */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-[1440px] mx-auto px-8 py-6">
          {/* 顶部标题和Tab切换 */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/15">
                {activeTab === 'equation' ? (
                  <Sigma className="w-5 h-5 text-cyan-400" />
                ) : (
                  <Activity className="w-5 h-5 text-cyan-400" />
                )}
              </div>
              <div>
                <h1 className="text-base font-semibold text-white">
                  {activeTab === 'equation' ? '方程求解器' : '微分方程求解器'}
                </h1>
                <p className="text-[11px] text-gray-500">
                  {activeTab === 'equation' ? '支持 1-5 元非线性方程组' : '线性常系数微分方程'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Tab 切换 */}
              <div className="tab-switcher">
                <button
                  type="button"
                  onClick={() => setActiveTab('equation')}
                  className={`tab-switcher-btn ${activeTab === 'equation' ? 'active' : ''}`}
                >
                  方程组
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('differential')}
                  className={`tab-switcher-btn ${activeTab === 'differential' ? 'active' : ''}`}
                >
                  微分方程
                </button>
              </div>
              <button
                onClick={() => activeTab === 'equation' ? setShowHelp(true) : setShowDiffHelp(true)}
                className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-cyan-500/20 transition-all"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 方程组内容 */}
          {activeTab === 'equation' && (
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
          )}

          {/* 微分方程内容 */}
          {activeTab === 'differential' && (
            <div className="flex flex-col xl:flex-row gap-5">
              {/* 左侧：输入面板 */}
              <div className="w-full xl:w-[500px] xl:flex-shrink-0">
                <div className="panel p-6 sticky top-0">
                  {/* y 系数 */}
                  <div className="mb-4">
                    <label className="text-sm text-gray-400 mb-2 block font-medium">
                      y 系数（逗号分隔，从高阶到低阶）
                    </label>
                    <input
                      type="text"
                      value={yCoeffsInput}
                      onChange={(e) => setYCoeffsInput(e.target.value)}
                      placeholder="如 1,3,2 表示 y'' + 3y' + 2y"
                      className="w-full px-4 py-3 input-glass text-base"
                    />
                    <p className="text-xs text-gray-500 mt-1">格式：a₂,a₁,a₀ 表示 a₂y'' + a₁y' + a₀y</p>
                  </div>

                  {/* x 系数 */}
                  <div className="mb-4">
                    <label className="text-sm text-gray-400 mb-2 block font-medium">
                      x 系数（逗号分隔，通常只需输入 1）
                    </label>
                    <input
                      type="text"
                      value={xCoeffsInput}
                      onChange={(e) => setXCoeffsInput(e.target.value)}
                      placeholder="如 1 表示 x(t)，1,1 表示 x'+x"
                      className="w-full px-4 py-3 input-glass text-base"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      格式：b₀ 表示 x(t)，b₁,b₀ 表示 b₁x' + b₀x
                    </p>
                  </div>

                  {/* x(t) 表达式 */}
                  <div className="mb-4">
                    <label className="text-sm text-gray-400 mb-2 block font-medium">
                      x(t) 表达式
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={xFuncInput}
                        onChange={(e) => setXFuncInput(e.target.value)}
                        placeholder="t"
                        className="w-full px-4 py-3 input-glass text-base pr-24"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFuncPicker(!showFuncPicker)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all"
                      >
                        内置函数 ▼
                      </button>
                      {showFuncPicker && (
                        <div className="absolute top-full left-0 right-0 mt-1 glass-strong rounded-lg shadow-xl z-10 border border-white/[0.08] max-h-48 overflow-y-auto">
                          <div className="p-2 grid grid-cols-2 gap-1">
                            {BUILTIN_FUNCTIONS.map(func => (
                              <button
                                key={func.symbol}
                                type="button"
                                onClick={() => handleSelectFunction(func.symbol)}
                                className="text-xs text-gray-300 hover:text-white hover:bg-cyan-500/10 px-2 py-2 rounded text-left flex items-center gap-2"
                                title={func.desc}
                              >
                                <span className="font-mono text-cyan-400">{func.symbol}</span>
                                <span className="text-gray-500">{func.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 初始条件 */}
                  <div className="mb-4">
                    <label className="text-sm text-gray-400 mb-2 block font-medium">
                      初始条件
                    </label>
                    <input
                      type="text"
                      value={initialCondInput}
                      onChange={(e) => setInitialCondInput(e.target.value)}
                      placeholder="如 y(0-)=1, y'(0-)=0 或 y(0+)=1"
                      className="w-full px-4 py-3 input-glass text-base"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      支持 y(0-) 和 y(0+) 格式。0- 表示激励作用前，0+ 表示激励作用后
                    </p>
                  </div>

                  {/* 求解按钮 */}
                  <button
                    type="button"
                    onClick={handleDifferentialSolve}
                    className="w-full py-3.5 rounded-xl btn-primary text-base font-medium flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    求解
                  </button>

                  {/* 错误显示 */}
                  {diffError && (
                    <div className="mt-4 text-sm text-red-400 bg-red-500/10 rounded-lg p-3 border border-red-500/15">
                      {diffError}
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧：结果显示 */}
              <div className="flex-1 min-w-0">
                {differentialResult ? (
                  <div className="panel p-6 space-y-5">
                    {/* 特征方程 */}
                    <div className="py-1">
                      <h3 className="text-sm text-gray-400 mb-2 font-medium">特征方程</h3>
                      <p className="text-cyan-300/80 font-mono text-base">
                        {differentialResult.characteristicEquation}
                      </p>
                    </div>

                    {/* 特征根 */}
                    <div className="py-1">
                      <h3 className="text-sm text-gray-400 mb-2 font-medium">特征根</h3>
                      <p className="text-cyan-300/80 font-mono text-base">
                        r = {differentialResult.rootsDisplay}
                      </p>
                    </div>

                    {/* 没有初始条件时：只显示 h(t) */}
                    {!differentialResult.finalSolution && differentialResult.impulseResponse ? (
                      <>
                        {/* 单位冲激响应 h(t) */}
                        <div className="bg-indigo-500/10 rounded-lg p-4 border border-indigo-500/20 my-2">
                          <h3 className="text-sm text-indigo-400/80 mb-2 font-medium">
                            单位冲激响应 h(t)
                          </h3>
                          <p className="text-xs text-gray-500 mb-1">
                            系统对 δ(t) 的响应，初始条件为零
                          </p>
                          <p className="text-indigo-300/80 font-mono text-sm break-all">
                            h(t) = {differentialResult.impulseResponse.expression}
                          </p>
                        </div>

                        {/* 提示：需要初始条件才能计算其他响应 */}
                        <div className="bg-gray-500/10 rounded-lg p-4 border border-gray-500/20 my-2">
                          <p className="text-sm text-gray-400">
                            💡 未输入初始条件，仅显示单位冲激响应 h(t)
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            输入初始条件（如 y(0)=1, y'(0)=0）可计算零输入/零状态响应和最终解
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* 显示模式切换 */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs text-gray-500">显示模式：</span>
                          <div className="tab-switcher">
                            <button
                              type="button"
                              onClick={() => setDisplayMode('approach1')}
                              className={`tab-switcher-btn ${displayMode === 'approach1' ? 'active' : ''}`}
                            >
                              思路1: 响应分解
                            </button>
                            <button
                              type="button"
                              onClick={() => setDisplayMode('approach2')}
                              className={`tab-switcher-btn ${displayMode === 'approach2' ? 'active' : ''}`}
                            >
                              思路2: 解结构
                            </button>
                          </div>
                        </div>

                        {/* 展开后的激励 */}
                        {differentialResult.expandedExcitation && (
                          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20 my-1">
                            <h3 className="text-sm text-blue-400/80 mb-2 font-medium">展开后的激励函数</h3>
                            <p className="text-blue-300/80 font-mono text-sm break-all">
                              f(t) = {differentialResult.expandedExcitation}
                            </p>
                          </div>
                        )}

                        {/* 初始条件类型提示 */}
                        {differentialResult.conditionType && differentialResult.conditionType !== 'default' && (
                          <div className="bg-gray-500/10 rounded-lg p-3 border border-gray-500/20 my-1">
                            <p className="text-xs text-gray-400">
                              初始条件类型: <span className="text-cyan-400 font-mono">{differentialResult.conditionType}</span>
                              {differentialResult.initialConditionsPlus && (
                                <span className="ml-2 text-gray-500">
                                  → 已计算 0+ 条件
                                </span>
                              )}
                            </p>
                          </div>
                        )}

                        {/* 思路1: 零输入响应 + 零状态响应 + 完全响应 */}
                        {displayMode === 'approach1' && (
                          <>
                            {/* 单位冲激响应 h(t) */}
                            {differentialResult.impulseResponse && (
                              <div className="bg-indigo-500/10 rounded-lg p-4 border border-indigo-500/20 my-2">
                                <h3 className="text-sm text-indigo-400/80 mb-2 font-medium">
                                  单位冲激响应 h(t)
                                </h3>
                                <p className="text-xs text-gray-500 mb-1">
                                  系统对 δ(t) 的响应，初始条件为零
                                </p>
                                <p className="text-indigo-300/80 font-mono text-sm break-all">
                                  h(t) = {differentialResult.impulseResponse.expression}
                                </p>
                              </div>
                            )}

                            {/* 零输入响应 */}
                            {differentialResult.zeroInputResponse && (
                              <div className="bg-rose-500/10 rounded-lg p-4 border border-rose-500/20 my-2">
                                <h3 className="text-sm text-rose-400/80 mb-2 font-medium">
                                  零输入响应 y<sub>zi</sub>
                                </h3>
                                <p className="text-xs text-gray-500 mb-1">
                                  仅由初始条件引起，输入为 0
                                </p>
                                <p className="text-rose-300/80 font-mono text-sm break-all">
                                  y<sub>zi</sub> = {differentialResult.zeroInputResponse.expression}
                                </p>
                              </div>
                            )}

                            {/* 零状态响应 */}
                            {differentialResult.zeroStateResponse && (
                              <div className="bg-teal-500/10 rounded-lg p-4 border border-teal-500/20 my-2">
                                <h3 className="text-sm text-teal-400/80 mb-2 font-medium">
                                  零状态响应 y<sub>zs</sub>
                                </h3>
                                <p className="text-xs text-gray-500 mb-1">
                                  仅由输入引起，初始条件为 0
                                </p>
                                <p className="text-teal-300/80 font-mono text-sm break-all">
                                  y<sub>zs</sub> = {differentialResult.zeroStateResponse.expression}
                                </p>
                              </div>
                            )}

                            {/* 完全响应 */}
                            {differentialResult.completeResponse && (
                              <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/20 my-2">
                                <h3 className="text-sm text-cyan-400/80 mb-2 font-medium">
                                  完全响应 y
                                </h3>
                                <p className="text-xs text-gray-500 mb-1">
                                  y = y<sub>zi</sub> + y<sub>zs</sub>
                                </p>
                                <p className="text-cyan-300/80 font-mono text-sm break-all">
                                  y = {differentialResult.completeResponse}
                                </p>
                              </div>
                            )}

                            {/* 如果没有零输入/零状态响应，显示提示 */}
                            {!differentialResult.zeroInputResponse && !differentialResult.zeroStateResponse && (
                              <div className="bg-gray-500/10 rounded-lg p-4 border border-gray-500/20 my-2">
                                <p className="text-sm text-gray-400">
                                  零输入/零状态响应需要输入 0- 初始条件才能计算
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  请使用 y(0-)=值 格式输入初始条件
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {/* 思路2: 齐次解 + 特解 + 通解 */}
                        {displayMode === 'approach2' && (
                          <>
                            {/* 齐次解 */}
                            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20 my-2">
                              <h3 className="text-sm text-green-400/80 mb-2 font-medium">齐次解</h3>
                              <p className="text-green-300/80 font-mono text-sm break-all">
                                y<sub>h</sub> = {differentialResult.homogeneous}
                              </p>
                            </div>

                            {/* 特解 */}
                            <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20 my-2">
                              <h3 className="text-sm text-amber-400/80 mb-2 font-medium">特解</h3>
                              <p className="text-amber-300/80 font-mono text-sm break-all">
                                y<sub>p</sub> = {differentialResult.particular}
                              </p>
                            </div>

                            {/* 通解 */}
                            <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20 my-2">
                              <h3 className="text-sm text-purple-400/80 mb-2 font-medium">通解</h3>
                              <p className="text-purple-300/80 font-mono text-sm break-all">
                                y = {differentialResult.generalSolution}
                              </p>
                            </div>

                            {/* 最终解 */}
                            {differentialResult.coefficients.length > 0 && (
                              <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/20 my-2">
                                <h3 className="text-sm text-cyan-400/80 mb-2 font-medium">最终解（代入初始条件）</h3>
                                <p className="text-cyan-300/80 font-mono text-sm break-all">
                                  y = {differentialResult.finalSolution}
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {/* 待定系数 */}
                        {differentialResult.coefficients.length > 0 && (
                          <div className="py-2">
                            <h3 className="text-sm text-gray-400 mb-2 font-medium">齐次解系数</h3>
                            <div className="flex flex-wrap gap-2">
                              {differentialResult.coefficients.map((c, i) => (
                                <span key={i} className="text-xs bg-white/[0.03] px-2 py-1 rounded border border-white/[0.06] font-mono">
                                  C{i + 1} = {c.toFixed(4)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex items-center justify-center">
                    <div className="text-center py-12">
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-7 h-7 text-gray-600" />
                      </div>
                      <p className="text-gray-500 text-sm">输入方程参数后点击求解</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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

      {/* 微分方程帮助面板 */}
      {showDiffHelp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDiffHelp(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-6 max-w-2xl mx-4 border border-white/[0.08] shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">微分方程求解器帮助</h3>
              <button onClick={() => setShowDiffHelp(false)} className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">方程形式</p>
                <p className="text-gray-400 text-sm mb-2">支持线性常系数微分方程：</p>
                <code className="text-cyan-300/70 bg-white/[0.03] px-2 py-1 rounded text-sm block">aₙy⁽ⁿ⁾ + ... + a₁y' + a₀y = bₘx⁽ᵐ⁾ + ... + b₀x(t)</code>
                <p className="text-gray-500 text-xs mt-1">最高支持三阶微分方程</p>
              </div>

              <div>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">y 系数输入</p>
                <p className="text-gray-400 text-sm mb-2">逗号分隔，从高阶到低阶：</p>
                <div className="space-y-1 text-gray-400 text-sm">
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">1,1</code> → y' + y</p>
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">1,0,1</code> → y'' + y</p>
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">1,3,2</code> → y'' + 3y' + 2y</p>
                </div>
              </div>

              <div>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">x 系数输入</p>
                <p className="text-gray-400 text-sm mb-2">逗号分隔，从高阶到低阶：</p>
                <div className="space-y-1 text-gray-400 text-sm">
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">1</code> → x(t)</p>
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">2,3</code> → 2x' + 3x</p>
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">1,0,0</code> → x''</p>
                </div>
              </div>

              <div>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">x(t) 表达式</p>
                <p className="text-gray-400 text-sm mb-2">支持以下内置函数：</p>
                <div className="grid grid-cols-2 gap-2 text-gray-400 text-sm">
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">t</code> 时间变量</p>
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">u(t)</code> 单位阶跃</p>
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">δ(t)</code> 单位冲激</p>
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">sin(t)</code> 正弦函数</p>
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">cos(t)</code> 余弦函数</p>
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">e^(-t)</code> 指数函数</p>
                </div>
                <p className="text-gray-500 text-xs mt-2">组合示例：<code className="text-cyan-300/70 bg-white/[0.03] px-1 py-0.5 rounded">e^(-t)*u(t)</code> 衰减阶跃</p>
              </div>

              <div>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">初始条件</p>
                <p className="text-gray-400 text-sm mb-2">支持两种格式：</p>
                <div className="space-y-1 text-gray-400 text-sm">
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">y(0)=1, y'(0)=0</code> 默认/0+ 条件</p>
                  <p><code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">y(0-)=1, y'(0-)=0</code> 0- 条件（激励作用前）</p>
                </div>
                <p className="text-amber-400/70 text-xs mt-2">⚠ 当激励包含 δ(t) 或 u(t) 时，建议使用 0- 格式</p>
              </div>

              <div>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">显示模式</p>
                <div className="space-y-2 text-gray-400 text-sm">
                  <div>
                    <p className="text-emerald-400/80 font-medium">思路1：响应分解（信号与系统）</p>
                    <p className="text-gray-500 text-xs">h(t) → 零输入响应 → 零状态响应 → 完全响应</p>
                  </div>
                  <div>
                    <p className="text-emerald-400/80 font-medium">思路2：解结构（高等数学）</p>
                    <p className="text-gray-500 text-xs">齐次解 → 特解 → 通解 → 最终解</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">示例</p>
                <div className="space-y-2 text-gray-400 text-sm">
                  <div className="bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                    <p className="text-gray-500 text-xs mb-1">一阶齐次方程</p>
                    <p>y系数: <code className="text-cyan-300/70">1,1</code> | x系数: <code className="text-cyan-300/70">1</code> | x(t): <code className="text-cyan-300/70">0</code></p>
                    <p>初始条件: <code className="text-cyan-300/70">y(0)=1</code> → 解: y = e^(-t)</p>
                  </div>
                  <div className="bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                    <p className="text-gray-500 text-xs mb-1">阶跃响应</p>
                    <p>y系数: <code className="text-cyan-300/70">1,3,2</code> | x系数: <code className="text-cyan-300/70">1</code> | x(t): <code className="text-cyan-300/70">u(t)</code></p>
                    <p>初始条件: <code className="text-cyan-300/70">y(0-)=0, y'(0-)=0</code></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
