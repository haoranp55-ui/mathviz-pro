// src/components/Equation/DifferentialEquationInput.tsx
import { useState, useCallback, type FC } from 'react';
import { Play, Settings2, FileText, FunctionSquare, Timer } from 'lucide-react';
import { BUILTIN_FUNCTIONS } from '../../lib/differentialParser';

interface DifferentialEquationInputProps {
  yCoeffsInput: string;
  xCoeffsInput: string;
  xFuncInput: string;
  initialCondInput: string;
  diffError: string | null;
  onYCoeffsChange: (v: string) => void;
  onXCoeffsChange: (v: string) => void;
  onXFuncChange: (v: string) => void;
  onInitialCondChange: (v: string) => void;
  onSolve: () => void;
}

export const DifferentialEquationInput: FC<DifferentialEquationInputProps> = ({
  yCoeffsInput,
  xCoeffsInput,
  xFuncInput,
  initialCondInput,
  diffError,
  onYCoeffsChange,
  onXCoeffsChange,
  onXFuncChange,
  onInitialCondChange,
  onSolve,
}) => {
  const [showFuncPicker, setShowFuncPicker] = useState(false);

  const handleSelectFunction = useCallback(
    (func: string) => {
      onXFuncChange(xFuncInput + func);
      setShowFuncPicker(false);
    },
    [xFuncInput, onXFuncChange]
  );

  return (
    <div className="panel p-6 sticky top-0 space-y-4">
      {/* y 系数 */}
      <div>
        <label className="text-sm text-gray-400 mb-2 block font-medium flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-cyan-400/70" />
          y 系数（逗号分隔，从高阶到低阶）
        </label>
        <input
          type="text"
          value={yCoeffsInput}
          onChange={(e) => onYCoeffsChange(e.target.value)}
          placeholder="如 1,3,2 表示 y'' + 3y' + 2y"
          className="w-full px-4 py-3 input-glass text-base"
        />
        <p className="text-xs text-gray-500 mt-1">格式：a₂,a₁,a₀ 表示 a₂y'' + a₁y' + a₀y</p>
      </div>

      {/* x 系数 */}
      <div>
        <label className="text-sm text-gray-400 mb-2 block font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400/70" />
          x 系数（逗号分隔，通常只需输入 1）
        </label>
        <input
          type="text"
          value={xCoeffsInput}
          onChange={(e) => onXCoeffsChange(e.target.value)}
          placeholder="如 1 表示 x(t)，1,1 表示 x'+x"
          className="w-full px-4 py-3 input-glass text-base"
        />
        <p className="text-xs text-gray-500 mt-1">格式：b₀ 表示 x(t)，b₁,b₀ 表示 b₁x' + b₀x</p>
      </div>

      {/* x(t) 表达式 */}
      <div>
        <label className="text-sm text-gray-400 mb-2 block font-medium flex items-center gap-2">
          <FunctionSquare className="w-4 h-4 text-cyan-400/70" />
          x(t) 表达式
        </label>
        <div className="relative">
          <input
            type="text"
            value={xFuncInput}
            onChange={(e) => onXFuncChange(e.target.value)}
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
                {BUILTIN_FUNCTIONS.map((func) => (
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
      <div>
        <label className="text-sm text-gray-400 mb-2 block font-medium flex items-center gap-2">
          <Timer className="w-4 h-4 text-cyan-400/70" />
          初始条件
        </label>
        <input
          type="text"
          value={initialCondInput}
          onChange={(e) => onInitialCondChange(e.target.value)}
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
        onClick={onSolve}
        className="w-full py-3.5 rounded-xl btn-primary text-base font-medium flex items-center justify-center gap-2"
      >
        <Play className="w-5 h-5" />
        求解
      </button>

      {/* 错误显示 */}
      {diffError && (
        <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 border border-red-500/15 flex items-start gap-2">
          <span className="text-red-500 mt-0.5">●</span>
          <span>{diffError}</span>
        </div>
      )}
    </div>
  );
};
