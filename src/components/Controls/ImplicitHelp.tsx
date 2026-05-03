// src/components/Controls/ImplicitHelp.tsx
import React, { useState } from 'react';

interface ImplicitHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const IMPLICIT_RULES = [
  { rule: '格式要求', desc: '必须是等式形式 F(x,y) = G(x,y)', example: 'x^2 + y^2 = 1' },
  { rule: '变量名', desc: 'x 和 y 是坐标变量，区分大小写', example: 'X^2 ≠ x^2' },
  { rule: '最多3个函数', desc: '同时最多显示3个隐函数', example: '' },
  { rule: '参数支持', desc: '支持单字母参数，最多3个', example: 'x^2/a^2 + y^2/b^2 = 1' },
];

const CURVE_TYPES = [
  { type: '圆', desc: '到定点距离为定值', example: 'x^2 + y^2 = r^2' },
  { type: '椭圆', desc: '到两焦点距离之和为常数', example: 'x^2/a^2 + y^2/b^2 = 1' },
  { type: '双曲线', desc: '到两焦点距离之差为常数', example: 'x^2/a^2 - y^2/b^2 = 1' },
  { type: '抛物线', desc: '到焦点与准线等距', example: 'y^2 = 4*a*x' },
  { type: '心形线', desc: '心形曲线', example: '(x^2+y^2-a*x)^2 = a^2*(x^2+y^2)' },
];

const EXAMPLES = [
  { desc: '单位圆', expr: 'x^2 + y^2 = 1' },
  { desc: '椭圆', expr: 'x^2/4 + y^2/9 = 1' },
  { desc: '双曲线', expr: 'x^2 - y^2 = 1' },
  { desc: '抛物线', expr: 'y^2 = x' },
  { desc: '伯努利双纽线', expr: '(x^2 + y^2)^2 = 2*a^2*(x^2 - y^2)' },
  { desc: '卡西尼卵形线', expr: '(x^2+y^2-a^2)^2 = b^2*(x^2-y^2)' },
];

const GPU_INFO = [
  { feature: 'GPU 渲染', desc: '点击 ⚡ 按钮启用像素级精度渲染', note: '部分复杂函数自动降级 CPU' },
  { feature: 'CPU 渲染', desc: '使用 Marching Squares 算法', note: '支持所有 mathjs 函数' },
  { feature: '自动降级', desc: 'GLSL 不支持的函数自动切换 CPU', note: '如 gamma、erf 等' },
];

export const ImplicitHelp: React.FC<ImplicitHelpProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'examples' | 'gpu'>('rules');

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
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
            <span className="text-green-400">📖</span>
            隐函数帮助
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700/50"
          >
            ✕
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-gray-700">
          {[
            { key: 'rules', label: '输入规则' },
            { key: 'examples', label: '曲线示例' },
            { key: 'gpu', label: 'GPU 渲染' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-3 text-sm transition-all ${
                activeTab === tab.key
                  ? 'text-green-400 border-b-2 border-green-400 bg-canvas-panelLight/30'
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
                隐函数方程用于描述无法用 y = f(x) 显式表示的曲线，如圆、椭圆等
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
                  {IMPLICIT_RULES.map((r, i) => (
                    <tr key={i} className="border-b border-gray-700/50">
                      <td className="py-3 text-green-400 font-medium">{r.rule}</td>
                      <td className="py-3 text-gray-300">{r.desc}</td>
                      <td className="py-3 text-gray-400 font-mono text-xs">{r.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 曲线类型 */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-green-400 mb-3">常见曲线类型</h3>
                <div className="space-y-2">
                  {CURVE_TYPES.map(c => (
                    <div key={c.type} className="flex items-center gap-3 py-2 px-3 rounded bg-canvas-panelLight/30">
                      <span className="text-white text-sm w-16">{c.type}</span>
                      <span className="text-gray-400 text-xs flex-1">{c.desc}</span>
                      <code className="text-green-300 text-xs font-mono">{c.example}</code>
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
                    <span className="text-gray-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      点击复制
                    </span>
                  </div>
                ))}
              </div>

              {/* 提示 */}
              <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-300">
                  <strong>提示:</strong> 部分复杂函数（如含 tan(x*y)）会自动转换为等价形式以提高渲染稳定性
                </p>
              </div>
            </div>
          )}

          {activeTab === 'gpu' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 mb-4">
                GPU 着色器渲染提供像素级精度，适合精细曲线显示
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="py-2 text-left">功能</th>
                    <th className="py-2 text-left">说明</th>
                    <th className="py-2 text-left">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {GPU_INFO.map((g, i) => (
                    <tr key={i} className="border-b border-gray-700/50">
                      <td className="py-3 text-green-400 font-medium">{g.feature}</td>
                      <td className="py-3 text-gray-300">{g.desc}</td>
                      <td className="py-3 text-gray-400 text-xs">{g.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 函数级别开关 */}
              <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-300">
                  <strong>函数级别控制:</strong> 每个隐函数可独立开启/关闭 GPU 渲染，点击函数列表中的 ⚡ 按钮切换
                </p>
              </div>

              {/* 不支持函数 */}
              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-300">
                  <strong>自动降级:</strong> 当表达式包含 GLSL 不支持的函数（如 factorial、gamma、erf）时，系统自动切换到 CPU 渲染并显示提示
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
