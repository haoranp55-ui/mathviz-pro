// src/components/Equation/EquationLayout.tsx
import { useState, useCallback, type FC } from 'react';
import { Sigma, HelpCircle, Activity } from 'lucide-react';
import { EquationBackground } from '../Layout/EquationBackground';

import { EquationSystemInput } from './EquationSystemInput';
import { EquationSystemList } from './EquationSystemList';
import { DifferentialEquationInput } from './DifferentialEquationInput';
import { DifferentialEquationResult } from './DifferentialEquationResult';
import { EquationEmptyState } from './EquationEmptyState';
import { EquationHelp } from './EquationHelp';
import {
  parseCoefficients,
  parseXFunction,
  parseInitialConditions,
} from '../../lib/differentialParser';
import { solveDifferentialEquation } from '../../lib/differentialSolver';
import type { DifferentialSolution } from '../../lib/differentialSolver';

export const EquationLayout: FC = () => {
  const [activeTab, setActiveTab] = useState<'equation' | 'differential'>('equation');
  const [showHelp, setShowHelp] = useState(false);

  // 方程组状态（无本地状态，全部交给 store）

  // 微分方程状态
  const [yCoeffsInput, setYCoeffsInput] = useState('');
  const [xCoeffsInput, setXCoeffsInput] = useState('1');
  const [xFuncInput, setXFuncInput] = useState('t');
  const [initialCondInput, setInitialCondInput] = useState('');
  const [differentialResult, setDifferentialResult] = useState<DifferentialSolution | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'approach1' | 'approach2'>('approach2');

  const handleDifferentialSolve = useCallback(() => {
    setDiffError(null);
    setDifferentialResult(null);

    const yCoeffs = parseCoefficients(yCoeffsInput, true);
    const xCoeffs = parseCoefficients(xCoeffsInput, false);
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
                  {activeTab === 'equation'
                    ? '支持 1-5 元非线性方程组'
                    : '线性常系数微分方程'}
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
                onClick={() => setShowHelp(true)}
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
                <EquationSystemInput />
              </div>

              {/* 右侧：方程组列表 */}
              <div className="flex-1 min-w-0">
                <EquationSystemList />
              </div>
            </div>
          )}

          {/* 微分方程内容 */}
          {activeTab === 'differential' && (
            <div className="flex flex-col xl:flex-row gap-5">
              {/* 左侧：输入面板 */}
              <div className="w-full xl:w-[500px] xl:flex-shrink-0">
                <DifferentialEquationInput
                  yCoeffsInput={yCoeffsInput}
                  xCoeffsInput={xCoeffsInput}
                  xFuncInput={xFuncInput}
                  initialCondInput={initialCondInput}
                  diffError={diffError}
                  onYCoeffsChange={setYCoeffsInput}
                  onXCoeffsChange={setXCoeffsInput}
                  onXFuncChange={setXFuncInput}
                  onInitialCondChange={setInitialCondInput}
                  onSolve={handleDifferentialSolve}
                />
              </div>

              {/* 右侧：结果显示 */}
              <div className="flex-1 min-w-0">
                {differentialResult ? (
                  <>
                    {/* 显示模式切换 */}
                    <div className="flex items-center gap-3 mb-3">
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
                    <DifferentialEquationResult
                      result={differentialResult}
                      displayMode={displayMode}
                    />
                  </>
                ) : (
                  <EquationEmptyState type="differential" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 帮助面板 */}
      <EquationHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        type={activeTab}
      />
    </div>
  );
};
