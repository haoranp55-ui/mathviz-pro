// src/components/Controls/ParametricHelp.tsx
import React, { useState } from 'react';

interface ParametricHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const PARAMETER_RULES = [
  { rule: '单字母变量', desc: '参数必须是单个字母（大小写区分）', example: 'a, b, k, A, B' },
  { rule: '排除 x/y', desc: 'x 和 y 是坐标变量，不能作为参数', example: 'a*x + b ✓，x*x ✗' },
  { rule: '最多3个参数', desc: '每个函数最多支持3个额外参数', example: 'a*x + b + c ✓' },
  { rule: '最多3个函数', desc: '同时最多显示3个参数化函数', example: '' },
  { rule: '参数关联', desc: '同名参数会同步变化，共享参数旁显示彩色关联标记', example: 'a*x 和 sin(a*x) 共享参数 a' },
];

const PARAMETER_CONFIG = [
  { field: '最小值', desc: '参数滑钮的最小范围', default: '-10' },
  { field: '最大值', desc: '参数滑钮的最大范围', default: '10' },
  { field: '步长', desc: '滑钮调节的精度', default: '0.1' },
];

const EXAMPLES = [
  { desc: '直线方程', expr: 'a*x + b', params: 'a: 斜率, b: 截距' },
  { desc: '正弦波', expr: 'a*sin(k*x)', params: 'a: 振幅, k: 频率' },
  { desc: '指数函数', expr: 'a*exp(b*x)', params: 'a: 系数, b: 增长率' },
  { desc: '幂函数', expr: 'a*x^b', params: 'a: 系数, b: 指数' },
  { desc: '抛物线', expr: 'a*x^2 + b*x + c', params: 'a, b, c: 系数' },
  { desc: '衰减函数', expr: 'a*exp(-k*x)', params: 'a: 初值, k: 衰减率' },
];

export const ParametricHelp: React.FC<ParametricHelpProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'examples' | 'config'>('rules');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-canvas-panel rounded-xl w-[680px] max-h-[80vh] overflow-hidden shadow-2xl border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-purple-400">📖</span>
            参数化函数帮助
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-gray-700">
          {[
            { key: 'rules', label: '参数规则' },
            { key: 'examples', label: '输入示例' },
            { key: 'config', label: '参数配置' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-3 text-sm transition-all ${
                activeTab === tab.key
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-canvas-panelLight/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="p-5 overflow-y-auto max-h-[55vh]">
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 mb-4">
                参数化函数允许您在表达式中使用可调节的参数，实时观察参数变化对函数图像的影响
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="py-2 text-left">规则</th>
                    <th className="py-2 text-left">说明</th>
                    <th className="py-2 text-left">示例</th>
                  </tr>
                </thead>
                <tbody>
                  {PARAMETER_RULES.map((r, i) => (
                    <tr key={i} className="border-b border-gray-700/50">
                      <td className="py-3 text-purple-400 font-medium">{r.rule}</td>
                      <td className="py-3 text-gray-300">{r.desc}</td>
                      <td className="py-3 text-gray-400 font-mono text-xs">{r.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 提示 */}
              <div className="mt-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <p className="text-sm text-purple-300">
                  <strong>提示:</strong> 参数会自动从表达式中提取，无需额外声明。输入 <code className="text-white">a*x + b</code> 后，系统会自动识别参数 a 和 b。
                </p>
              </div>

              {/* 参数关联 */}
              <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-300">
                  <strong>参数关联:</strong> 当多个函数有相同名称的参数时，调整其中一个会同步更新所有同名参数的值和范围。共享参数旁会显示彩色圆点标记，指示哪些函数共享该参数。例如：<code className="text-white">a*x</code> 和 <code className="text-white">sin(a*x)</code> 共享参数 a，滑动任一滑钮两者都会变化。
                </p>
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
                    onClick={() => {
                      navigator.clipboard.writeText(ex.expr);
                    }}
                  >
                    <div>
                      <span className="text-gray-400 text-sm">{ex.desc}:</span>
                      <code className="ml-2 text-white font-mono">{ex.expr}</code>
                      <span className="ml-3 text-purple-400 text-xs">{ex.params}</span>
                    </div>
                    <span className="text-gray-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      点击复制
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 mb-4">
                点击参数旁边的 ⚙ 按钮可以自定义参数的取值范围和步长
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="py-2 text-left">配置项</th>
                    <th className="py-2 text-left">说明</th>
                    <th className="py-2 text-left">默认值</th>
                  </tr>
                </thead>
                <tbody>
                  {PARAMETER_CONFIG.map((c, i) => (
                    <tr key={i} className="border-b border-gray-700/50">
                      <td className="py-3 text-purple-400 font-medium">{c.field}</td>
                      <td className="py-3 text-gray-300">{c.desc}</td>
                      <td className="py-3 text-white font-mono">{c.default}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 功能说明 */}
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-medium text-purple-400">其他功能</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>• <strong>显示/隐藏</strong>: 点击 👁 按钮切换函数可见性</p>
                  <p>• <strong>导数曲线</strong>: 点击 f' 按钮显示/隐藏导数</p>
                  <p>• <strong>标记点</strong>: 输入 x 值在曲线上标注特定点及其导数</p>
                  <p>• <strong>删除函数</strong>: 点击 ✕ 按钮移除该函数</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};