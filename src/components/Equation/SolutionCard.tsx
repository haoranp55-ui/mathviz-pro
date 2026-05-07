// src/components/Equation/SolutionCard.tsx
import React, { useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { FUNCTION_COLORS } from '../../types';
import type { Solution } from '../../types';

const formatValue = (value: number): string => {
  if (Math.abs(value) < 1e-10) return '0';
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.001) {
    return value.toExponential(6);
  }
  return value.toFixed(8).replace(/\.?0+$/, '');
};

interface SolutionCardProps {
  solution: Solution;
  variables: string[];
  index: number;
}

export const SolutionCard: React.FC<SolutionCardProps> = ({ solution, variables, index }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopy = useCallback(async (varName: string, value: number, idx: number) => {
    try {
      await navigator.clipboard.writeText(`${varName} = ${formatValue(value)}`);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="panel p-4 border-l-2 border-l-emerald-500/40 function-item">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center border border-emerald-500/15">
          <span className="text-emerald-400 text-xs font-bold">{index + 1}</span>
        </div>
        <span className="text-emerald-400/80 text-sm font-medium">解</span>
        {solution.type === 'exact' && (
          <span className="text-xs bg-emerald-500/10 text-emerald-300/80 px-2 py-0.5 rounded border border-emerald-500/15">
            精确解
          </span>
        )}
        {solution.type === 'approximate' && (
          <span className="text-xs bg-amber-500/10 text-amber-300/80 px-2 py-0.5 rounded border border-amber-500/15">
            近似解
          </span>
        )}
      </div>
      <div className="grid gap-2">
        {variables.map((v, i) => {
          const color = FUNCTION_COLORS[i % FUNCTION_COLORS.length];
          return (
            <div key={v} className="flex items-center gap-2 group">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-500 text-sm font-mono w-5 text-right">{v}</span>
              <span className="text-gray-600 text-sm">=</span>
              <span className="text-gray-100 text-base font-mono font-medium flex-1 min-w-0 truncate">
                {formatValue(solution.values[i])}
              </span>
              <button
                onClick={() => handleCopy(v, solution.values[i], i)}
                className="p-1.5 rounded-md text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                title="复制"
              >
                {copiedIndex === i ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex justify-between text-xs text-gray-600">
        <span>精度</span>
        <span className="font-mono">{solution.precision.toExponential(2)}</span>
      </div>
    </div>
  );
};
