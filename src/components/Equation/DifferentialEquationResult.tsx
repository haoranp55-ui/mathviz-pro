// src/components/Equation/DifferentialEquationResult.tsx
import React from 'react';
import type { DifferentialSolution } from '../../lib/differentialSolver';

interface TimelineStepProps {
  title: React.ReactNode;
  description?: string;
  expression: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  isLast?: boolean;
}

const TimelineStep: React.FC<TimelineStepProps> = ({
  title,
  description,
  expression,
  colorClass,
  bgClass,
  borderClass,
  isLast,
}) => {
  return (
    <div className="relative pl-7">
      {!isLast && <div className="timeline-line" />}
      <div
        className={`absolute left-0 top-1 w-5 h-5 rounded-full ${bgClass} border ${borderClass} flex items-center justify-center`}
      >
        <div className={`w-2 h-2 rounded-full ${colorClass.replace('text-', 'bg-').replace('/80', '')}`} />
      </div>
      <div className={`${bgClass} rounded-lg p-4 border ${borderClass}`}>
        <h3 className={`text-sm ${colorClass} mb-1 font-medium`}>{title}</h3>
        {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
        <p className={`${colorClass.replace('/80', '/70')} font-mono text-sm break-all`}>
          {expression}
        </p>
      </div>
    </div>
  );
};

interface DifferentialEquationResultProps {
  result: DifferentialSolution;
  displayMode: 'approach1' | 'approach2';
}

export const DifferentialEquationResult: React.FC<DifferentialEquationResultProps> = ({
  result,
  displayMode,
}) => {
  return (
    <div className="panel p-6 space-y-5">
      {/* 特征信息头部 */}
      <div className="flex flex-wrap items-center gap-4 py-2 px-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">特征方程</span>
          <span className="text-cyan-300/80 font-mono text-sm">{result.characteristicEquation}</span>
        </div>
        <div className="w-px h-4 bg-white/[0.06]" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">特征根</span>
          <span className="text-cyan-300/80 font-mono text-sm">r = {result.rootsDisplay}</span>
        </div>
      </div>

      {/* 没有初始条件时：只显示 h(t) */}
      {!result.finalSolution && result.impulseResponse ? (
        <>
          <TimelineStep
            title="单位冲激响应 h(t)"
            description="系统对 δ(t) 的响应，初始条件为零"
            expression={`h(t) = ${result.impulseResponse.expression}`}
            colorClass="text-indigo-400/80"
            bgClass="bg-indigo-500/10"
            borderClass="border-indigo-500/20"
            isLast
          />
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
          {/* 展开后的激励 */}
          {result.expandedExcitation && (
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <h3 className="text-sm text-blue-400/80 mb-2 font-medium">展开后的激励函数</h3>
              <p className="text-blue-300/80 font-mono text-sm break-all">
                f(t) = {result.expandedExcitation}
              </p>
            </div>
          )}

          {/* 初始条件类型提示 */}
          {result.conditionType && result.conditionType !== 'default' && (
            <div className="bg-gray-500/10 rounded-lg p-3 border border-gray-500/20">
              <p className="text-xs text-gray-400">
                初始条件类型: <span className="text-cyan-400 font-mono">{result.conditionType}</span>
                {result.initialConditionsPlus && (
                  <span className="ml-2 text-gray-500">→ 已计算 0+ 条件</span>
                )}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* 思路1: 零输入响应 + 零状态响应 + 完全响应 */}
            {displayMode === 'approach1' && (
              <>
                {result.impulseResponse && (
                  <TimelineStep
                    title="单位冲激响应 h(t)"
                    description="系统对 δ(t) 的响应，初始条件为零"
                    expression={`h(t) = ${result.impulseResponse.expression}`}
                    colorClass="text-indigo-400/80"
                    bgClass="bg-indigo-500/10"
                    borderClass="border-indigo-500/20"
                  />
                )}
                {result.zeroInputResponse && (
                  <TimelineStep
                    title={<>零输入响应 y<sub>zi</sub></>}
                    description="仅由初始条件引起，输入为 0"
                    expression={`y_{zi} = ${result.zeroInputResponse.expression}`}
                    colorClass="text-rose-400/80"
                    bgClass="bg-rose-500/10"
                    borderClass="border-rose-500/20"
                  />
                )}
                {result.zeroStateResponse && (
                  <TimelineStep
                    title={<>零状态响应 y<sub>zs</sub></>}
                    description="仅由输入引起，初始条件为 0"
                    expression={`y_{zs} = ${result.zeroStateResponse.expression}`}
                    colorClass="text-teal-400/80"
                    bgClass="bg-teal-500/10"
                    borderClass="border-teal-500/20"
                  />
                )}
                {result.completeResponse && (
                  <TimelineStep
                    title="完全响应 y"
                    description="y = y_{zi} + y_{zs}"
                    expression={`y = ${result.completeResponse}`}
                    colorClass="text-cyan-400/80"
                    bgClass="bg-cyan-500/10"
                    borderClass="border-cyan-500/20"
                    isLast
                  />
                )}
                {!result.zeroInputResponse && !result.zeroStateResponse && (
                  <div className="bg-gray-500/10 rounded-lg p-4 border border-gray-500/20">
                    <p className="text-sm text-gray-400">
                      零输入/零状态响应需要输入 0- 初始条件才能计算
                    </p>
                    <p className="text-xs text-gray-500 mt-1">请使用 y(0-)=值 格式输入初始条件</p>
                  </div>
                )}
              </>
            )}

            {/* 思路2: 齐次解 + 特解 + 通解 */}
            {displayMode === 'approach2' && (
              <>
                <TimelineStep
                  title="齐次解"
                  expression={`y_h = ${result.homogeneous}`}
                  colorClass="text-green-400/80"
                  bgClass="bg-green-500/10"
                  borderClass="border-green-500/20"
                />
                <TimelineStep
                  title="特解"
                  expression={`y_p = ${result.particular}`}
                  colorClass="text-amber-400/80"
                  bgClass="bg-amber-500/10"
                  borderClass="border-amber-500/20"
                />
                <TimelineStep
                  title="通解"
                  expression={`y = ${result.generalSolution}`}
                  colorClass="text-purple-400/80"
                  bgClass="bg-purple-500/10"
                  borderClass="border-purple-500/20"
                />
                {result.coefficients.length > 0 && (
                  <TimelineStep
                    title="最终解（代入初始条件）"
                    expression={`y = ${result.finalSolution}`}
                    colorClass="text-cyan-400/80"
                    bgClass="bg-cyan-500/10"
                    borderClass="border-cyan-500/20"
                    isLast
                  />
                )}
              </>
            )}
          </div>

          {/* 待定系数 */}
          {result.coefficients.length > 0 && (
            <div className="py-2">
              <h3 className="text-sm text-gray-400 mb-2 font-medium">齐次解系数</h3>
              <div className="flex flex-wrap gap-2">
                {result.coefficients.map((c, i) => (
                  <span
                    key={i}
                    className="text-xs bg-white/[0.03] px-2 py-1 rounded border border-white/[0.06] font-mono"
                  >
                    C{i + 1} = {c.toFixed(4)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
