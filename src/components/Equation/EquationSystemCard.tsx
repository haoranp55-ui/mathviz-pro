// src/components/Equation/EquationSystemCard.tsx
import React, { useState, useCallback } from 'react';
import { Trash2, Play, Minus, Plus, Copy, Check, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { SolutionCard } from './SolutionCard';
import type { EquationSystem } from '../../types';

interface EquationSystemCardProps {
  system: EquationSystem;
}

const statusConfig = {
  idle: {
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/15',
    label: '待求解',
    dot: 'bg-gray-500',
  },
  solving: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/15',
    label: '求解中...',
    dot: 'bg-amber-500',
  },
  solved: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/15',
    label: '已求解',
    dot: 'bg-emerald-500',
  },
  error: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/15',
    label: '求解失败',
    dot: 'bg-red-500',
  },
};

export const EquationSystemCard: React.FC<EquationSystemCardProps> = ({ system }) => {
  const {
    solveEquationSystem,
    removeEquationSystem,
    updateEquationSystemSearchRange,
    updateEquationExpression,
    clearEquationSystemSolutions,
  } = useAppStore();

  const [showRange, setShowRange] = useState(false);
  const [editingEquationId, setEditingEquationId] = useState<string | null>(null);
  const [editExpression, setEditExpression] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);

  const handleSolve = useCallback(() => {
    solveEquationSystem(system.id);
  }, [solveEquationSystem, system.id]);

  const handleRangeChange = useCallback(
    (index: number, field: 'min' | 'max', value: number) => {
      const range = system.searchRange[index];
      updateEquationSystemSearchRange(
        system.id,
        index,
        field === 'min' ? value : range.min,
        field === 'max' ? value : range.max
      );
    },
    [system.id, system.searchRange, updateEquationSystemSearchRange]
  );

  const handleCopyAll = useCallback(async () => {
    if (!system.solutions) return;
    const text = system.solutions
      .map(
        (sol, i) =>
          `解 ${i + 1}:\n` +
          system.variables.map((v, j) => `  ${v} = ${sol.values[j]}`).join('\n')
      )
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    } catch {
      // ignore
    }
  }, [system.solutions, system.variables]);

  const status = statusConfig[system.status];

  return (
    <div className="panel overflow-hidden function-item">
      {/* 头部 */}
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between group">
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              system.status === 'solving' ? 'animate-pulse' : ''
            } ${status.dot}`}
          />
          <span className="text-gray-300 text-base font-medium">
            {system.variables.length} 元方程组
          </span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-md ${status.bg} ${status.color} border ${status.border}`}
          >
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(system.status === 'solved' || system.status === 'error') && (
            <button
              onClick={() => clearEquationSystemSolutions(system.id)}
              className="p-2 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all opacity-0 group-hover:opacity-100"
              title="重新求解"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => removeEquationSystem(system.id)}
            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
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
                  onChange={(e) => setEditExpression(e.target.value)}
                  onKeyDown={(e) => {
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
                <span className="text-gray-600 text-sm mr-1">
                  ƒ<sub>{index + 1}</sub>({system.variables.join(',')}) =
                </span>
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
                  onChange={(e) =>
                    handleRangeChange(i, 'min', parseFloat(e.target.value) || -10)
                  }
                  className="flex-1 px-2 py-1.5 text-xs input-glass text-center"
                />
                <span className="text-gray-600 text-sm">~</span>
                <input
                  type="number"
                  value={system.searchRange[i]?.max ?? 10}
                  onChange={(e) =>
                    handleRangeChange(i, 'max', parseFloat(e.target.value) || 10)
                  }
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
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>找到 {system.solutions.length} 个解</span>
            <div className="flex-1 h-px bg-white/[0.04]" />
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1 text-gray-500 hover:text-cyan-400 transition-colors"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>复制全部</span>
                </>
              )}
            </button>
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
          disabled={system.status === 'solving' || system.equations.some((eq) => eq.error)}
          className="w-full py-3 rounded-xl btn-glass text-base font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {system.status === 'solving' ? (
            <>
              <div className="w-5 h-5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
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
