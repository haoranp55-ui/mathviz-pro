// src/components/Equation/EquationEmptyState.tsx
import type { FC } from 'react';
import { Sigma, Activity } from 'lucide-react';

interface EquationEmptyStateProps {
  type: 'equation' | 'differential';
}

export const EquationEmptyState: FC<EquationEmptyStateProps> = ({ type }) => {
  const isEquation = type === 'equation';
  const Icon = isEquation ? Sigma : Activity;

  return (
    <div className="h-full min-h-[300px] flex items-center justify-center">
      <div className="text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-4 equation-empty-icon">
          <Icon className="w-7 h-7 text-gray-600" />
        </div>
        <p className="text-gray-500 text-sm">
          {isEquation ? '暂无方程组' : '输入方程参数后点击求解'}
        </p>
        <p className="text-gray-600 text-xs mt-1.5 max-w-[240px] mx-auto leading-relaxed">
          {isEquation
            ? '在左侧面板选择未知数数量并输入方程，或点击下方示例快速开始'
            : '在左侧面板输入微分方程的系数和初始条件'}
        </p>
      </div>
    </div>
  );
};
