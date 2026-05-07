// src/components/Equation/EquationHelp.tsx
import React from 'react';
import { X } from 'lucide-react';

interface EquationHelpProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'equation' | 'differential';
}

export const EquationHelp: React.FC<EquationHelpProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-[#1e293b] border-l border-white/[0.08] shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#1e293b]/95 backdrop-blur-sm border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-base font-semibold text-white">
            {type === 'equation' ? '方程求解器帮助' : '微分方程求解器帮助'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 text-sm">
          {type === 'equation' ? (
            <>
              <section>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">
                  使用步骤
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-400 text-sm">
                  <li>选择未知数数量（1-5元）</li>
                  <li>输入对应数量的方程</li>
                  <li>点击"添加方程组"</li>
                  <li>点击"求解"获取结果</li>
                </ol>
              </section>
              <section>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">
                  方程格式
                </p>
                <div className="space-y-1.5 text-gray-400 text-sm">
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">x + y = 3</code>
                  </p>
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">x^2 + y^2 = 1</code>
                  </p>
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">sin(x) + y = 0</code>
                  </p>
                </div>
              </section>
              <section>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">
                  支持的函数
                </p>
                <p className="text-gray-400 text-sm">sin, cos, tan, exp, log, sqrt, abs, factorial, gamma 等</p>
              </section>
            </>
          ) : (
            <>
              <section>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">
                  方程形式
                </p>
                <p className="text-gray-400 text-sm mb-2">支持线性常系数微分方程：</p>
                <code className="text-cyan-300/70 bg-white/[0.03] px-2 py-1.5 rounded text-sm block">
                  aₙy⁽ⁿ⁾ + ... + a₁y' + a₀y = bₘx⁽ᵐ⁾ + ... + b₀x(t)
                </code>
                <p className="text-gray-500 text-xs mt-1.5">最高支持三阶微分方程</p>
              </section>
              <section>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">
                  y 系数输入
                </p>
                <p className="text-gray-400 text-sm mb-2">逗号分隔，从高阶到低阶：</p>
                <div className="space-y-1.5 text-gray-400 text-sm">
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">1,1</code> → y' + y
                  </p>
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">1,0,1</code> → y'' + y
                  </p>
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">1,3,2</code> → y'' + 3y' + 2y
                  </p>
                </div>
              </section>
              <section>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">
                  x 系数输入
                </p>
                <p className="text-gray-400 text-sm mb-2">逗号分隔，从高阶到低阶：</p>
                <div className="space-y-1.5 text-gray-400 text-sm">
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">1</code> → x(t)
                  </p>
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">2,3</code> → 2x' + 3x
                  </p>
                </div>
              </section>
              <section>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">
                  x(t) 表达式
                </p>
                <p className="text-gray-400 text-sm mb-2">支持以下内置函数：</p>
                <div className="grid grid-cols-2 gap-2 text-gray-400 text-sm">
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">t</code> 时间变量
                  </p>
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">u(t)</code> 单位阶跃
                  </p>
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">δ(t)</code> 单位冲激
                  </p>
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">sin(t)</code> 正弦函数
                  </p>
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">cos(t)</code> 余弦函数
                  </p>
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">e^(-t)</code> 指数函数
                  </p>
                </div>
              </section>
              <section>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">
                  初始条件
                </p>
                <p className="text-gray-400 text-sm mb-2">支持两种格式：</p>
                <div className="space-y-1.5 text-gray-400 text-sm">
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">y(0)=1, y'(0)=0</code> 默认/0+ 条件
                  </p>
                  <p>
                    <code className="text-cyan-300/70 bg-white/[0.03] px-1.5 py-0.5 rounded">y(0-)=1, y'(0-)=0</code> 0- 条件
                  </p>
                </div>
                <p className="text-amber-400/70 text-xs mt-2">
                  ⚠ 当激励包含 δ(t) 或 u(t) 时，建议使用 0- 格式
                </p>
              </section>
              <section>
                <p className="text-cyan-400/80 font-medium mb-2 text-xs uppercase tracking-wider">
                  显示模式
                </p>
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
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
