// src/components/Controls/FunctionHelp.tsx
import React, { useState } from 'react';

interface FunctionHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPERATOR_PRECEDENCE = [
  { level: 1, operators: '()', desc: '括号（最高优先级）', example: '(1+2)*3 = 9' },
  { level: 2, operators: '^', desc: '幂运算（右结合）', example: '2^3^2 = 2^9 = 512' },
  { level: 3, operators: '-', desc: '一元负号', example: '-x, -2^2 = -4' },
  { level: 4, operators: '* / %', desc: '乘、除、取模', example: '2*x, x/2, x%3' },
  { level: 5, operators: '+ -', desc: '加、减（最低优先级）', example: 'x+1, x-1' },
];

const FUNCTION_CATEGORIES = [
  {
    name: '三角函数',
    functions: [
      { name: 'sin(x)', desc: '正弦' },
      { name: 'cos(x)', desc: '余弦' },
      { name: 'tan(x)', desc: '正切' },
      { name: 'cot(x)', desc: '余切' },
      { name: 'sec(x)', desc: '正割' },
      { name: 'csc(x)', desc: '余割' },
    ],
  },
  {
    name: '反三角函数',
    functions: [
      { name: 'asin(x)', desc: '反正弦' },
      { name: 'acos(x)', desc: '反余弦' },
      { name: 'atan(x)', desc: '反正切' },
      { name: 'acot(x)', desc: '反余切' },
    ],
  },
  {
    name: '双曲函数',
    functions: [
      { name: 'sinh(x)', desc: '双曲正弦' },
      { name: 'cosh(x)', desc: '双曲余弦' },
      { name: 'tanh(x)', desc: '双曲正切' },
    ],
  },
  {
    name: '指数与对数',
    functions: [
      { name: 'exp(x)', desc: 'e^x' },
      { name: 'ln(x)', desc: '自然对数' },
      { name: 'log10(x)', desc: '常用对数 lg(x)' },
      { name: 'log2(x)', desc: '二进制对数' },
      { name: 'pow(x, y)', desc: 'x^y' },
    ],
  },
  {
    name: '方根',
    functions: [
      { name: 'sqrt(x)', desc: '平方根 √x' },
      { name: 'cbrt(x)', desc: '立方根 ∛x' },
      { name: 'nthRoot(x, n)', desc: 'n次方根' },
    ],
  },
  {
    name: '阶乘与组合',
    functions: [
      { name: 'factorial(n)', desc: '阶乘 n!' },
      { name: 'combinations(n, k)', desc: '组合数 C(n,k)' },
      { name: 'permutations(n, k)', desc: '排列数 P(n,k)' },
    ],
  },
  {
    name: '特殊函数',
    functions: [
      { name: 'gamma(x)', desc: '伽马函数 Γ(x)' },
      { name: 'erf(x)', desc: '误差函数' },
    ],
  },
  {
    name: '取整函数',
    functions: [
      { name: 'abs(x)', desc: '绝对值 |x|' },
      { name: 'floor(x)', desc: '向下取整' },
      { name: 'ceil(x)', desc: '向上取整' },
      { name: 'round(x)', desc: '四舍五入' },
    ],
  },
];

const CONSTANTS = [
  { name: 'pi', value: '3.14159...', desc: '圆周率 π' },
  { name: 'e', value: '2.71828...', desc: '自然常数' },
  { name: 'tau', value: '6.28318...', desc: '2π' },
  { name: 'phi', value: '1.61803...', desc: '黄金比例' },
];

const EXAMPLES = [
  { desc: '多项式', expr: 'x^3 - 2*x^2 + x - 1' },
  { desc: '分式', expr: '(x+1)/(x-1)' },
  { desc: '复合函数', expr: 'sin(x^2)' },
  { desc: '指数衰减', expr: 'exp(-x^2)' },
  { desc: '隐式乘法', expr: '2x + 3(x+1)' },
  { desc: '对数函数', expr: 'ln(x)' },
];

export const FunctionHelp: React.FC<FunctionHelpProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'operators' | 'functions' | 'examples'>('functions');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
      <div
        className="bg-canvas-panel rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            函数输入帮助
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700/50"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-gray-700">
          {[
            { key: 'functions', label: '函数列表' },
            { key: 'operators', label: '运算符优先级' },
            { key: 'examples', label: '输入示例' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-3 text-sm transition-all ${
                activeTab === tab.key
                  ? 'text-accent-primary border-b-2 border-accent-primary bg-canvas-panelLight/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="p-5 overflow-y-auto max-h-[55vh]">
          {activeTab === 'operators' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 mb-4">
                运算符优先级从高到低排列，同一行的运算符优先级相同
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="py-2 text-left">优先级</th>
                    <th className="py-2 text-left">运算符</th>
                    <th className="py-2 text-left">说明</th>
                    <th className="py-2 text-left">示例</th>
                  </tr>
                </thead>
                <tbody>
                  {OPERATOR_PRECEDENCE.map(op => (
                    <tr key={op.level} className="border-b border-gray-700/50">
                      <td className="py-3 text-accent-primary font-mono">{op.level}</td>
                      <td className="py-3 text-white font-mono">{op.operators}</td>
                      <td className="py-3 text-gray-300">{op.desc}</td>
                      <td className="py-3 text-gray-400 font-mono text-xs">{op.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'functions' && (
            <div className="space-y-6">
              {FUNCTION_CATEGORIES.map(cat => (
                <div key={cat.name}>
                  <h3 className="text-sm font-medium text-accent-primary mb-2">{cat.name}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {cat.functions.map(fn => (
                      <div
                        key={fn.name}
                        className="flex items-center gap-3 py-1.5 px-3 rounded bg-canvas-panelLight/30"
                      >
                        <code className="text-white text-sm font-mono">{fn.name}</code>
                        <span className="text-gray-400 text-xs">{fn.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* 常量 */}
              <div>
                <h3 className="text-sm font-medium text-accent-primary mb-2">常量</h3>
                <div className="grid grid-cols-2 gap-2">
                  {CONSTANTS.map(c => (
                    <div
                      key={c.name}
                      className="flex items-center gap-3 py-1.5 px-3 rounded bg-canvas-panelLight/30"
                    >
                      <code className="text-white text-sm font-mono">{c.name}</code>
                      <span className="text-gray-400 text-xs">{c.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'examples' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 mb-4">
                点击示例可直接复制到输入框
              </p>
              <div className="space-y-3">
                {EXAMPLES.map(ex => (
                  <div
                    key={ex.expr}
                    className="flex items-center justify-between py-3 px-4 rounded-lg bg-canvas-panelLight/30 hover:bg-canvas-panelLight/50 transition-colors cursor-pointer group"
                    onClick={() => handleCopy(ex.expr)}
                  >
                    <div>
                      <span className="text-gray-400 text-sm">{ex.desc}:</span>
                      <code className="ml-2 text-white font-mono">{ex.expr}</code>
                    </div>
                    <span className={`text-xs transition-opacity ${
                      copied === ex.expr
                        ? 'text-green-400 opacity-100'
                        : 'text-gray-500 opacity-0 group-hover:opacity-100'
                    }`}>
                      {copied === ex.expr ? '✓ 已复制' : '点击复制'}
                    </span>
                  </div>
                ))}
              </div>

              {/* 提示 */}
              <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-300">
                  <strong>提示:</strong> 支持<strong>隐式乘法</strong>，如 <code className="text-white">2x</code> 等价于 <code className="text-white">2*x</code>，<code className="text-white">x(x+1)</code> 等价于 <code className="text-white">x*(x+1)</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
