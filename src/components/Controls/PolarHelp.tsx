// src/components/Controls/PolarHelp.tsx
import React, { useState } from 'react';

interface PolarHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const POLAR_RULES = [
  { rule: '格式要求', desc: '输入 r 的表达式，x 代表角度 θ', example: 'sin(3*x) 即 r = sin(3θ)' },
  { rule: '变量名', desc: 'x 代表角度（弧度制），不是横坐标', example: 'x 范围: 0 ~ 2π' },
  { rule: '最多3个函数', desc: '同时最多显示3个极坐标函数', example: '' },
  { rule: '参数支持', desc: '支持单字母参数，最多3个', example: 'a*sin(n*x)' },
];

const CURVE_TYPES = [
  { type: '玫瑰曲线', desc: '花瓣状曲线，花瓣数由系数决定', example: 'sin(n*x), cos(n*x)' },
  { type: '阿基米德螺线', desc: '等距螺线', example: 'a*x' },
  { type: '对数螺线', desc: '等角螺线', example: 'a*exp(b*x)' },
  { type: '心形线', desc: '心形曲线', example: 'a*(1+cos(x))' },
  { type: '双纽线', desc: '∞ 形曲线', example: 'a*sqrt(cos(2*x))' },
  { type: '圆', desc: '圆心在原点或圆周过原点', example: 'a, 2*a*cos(x)' },
];

const EXAMPLES = [
  { desc: '三叶玫瑰', expr: 'sin(3*x)' },
  { desc: '四叶玫瑰', expr: 'cos(2*x)' },
  { desc: '心形线', expr: '1 + cos(x)' },
  { desc: '阿基米德螺线', expr: 'x' },
  { desc: '对数螺线', expr: 'exp(x/10)' },
  { desc: '双纽线', expr: 'sqrt(cos(2*x))' },
  { desc: '可调玫瑰', expr: 'a*sin(n*x)' },
];

const THETA_CONFIG = [
  { preset: '1圈', range: '0 ~ 2π', desc: '标准圆周' },
  { preset: '2圈', range: '0 ~ 4π', desc: '螺线常用' },
  { preset: '3圈', range: '0 ~ 6π', desc: '多圈螺线' },
  { preset: '4圈', range: '0 ~ 8π', desc: '长螺线' },
];

const GPU_INFO = [
  { feature: 'GPU 渲染', desc: '点击 ⚡ 按钮启用 GPU 并行采样', note: '适合高精度曲线' },
  { feature: 'CPU 渲染', desc: '使用均匀采样，简单高效', note: '默认渲染方式' },
  { feature: 'θ 范围配置', desc: '点击 ⚙ 按钮调整角度范围', note: '螺线需要多圈' },
];

export const PolarHelp: React.FC<PolarHelpProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'examples' | 'config'>('rules');

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
            <span className="text-amber-400">📖</span>
            极坐标函数帮助
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
            { key: 'config', label: 'θ 范围配置' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-3 text-sm transition-all ${
                activeTab === tab.key
                  ? 'text-amber-400 border-b-2 border-amber-400 bg-canvas-panelLight/30'
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
                极坐标函数描述点到原点的距离 r 与角度 θ 的关系：r = f(θ)
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
                  {POLAR_RULES.map((r, i) => (
                    <tr key={i} className="border-b border-gray-700/50">
                      <td className="py-3 text-amber-400 font-medium">{r.rule}</td>
                      <td className="py-3 text-gray-300">{r.desc}</td>
                      <td className="py-3 text-gray-400 text-xs">{r.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 曲线类型 */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-amber-400 mb-3">常见曲线类型</h3>
                <div className="space-y-2">
                  {CURVE_TYPES.map(c => (
                    <div key={c.type} className="flex items-center gap-3 py-2 px-3 rounded bg-canvas-panelLight/30">
                      <span className="text-white text-sm w-20">{c.type}</span>
                      <span className="text-gray-400 text-xs flex-1">{c.desc}</span>
                      <code className="text-amber-300 text-xs font-mono">{c.example}</code>
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
              <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-300">
                  <strong>提示:</strong> 玫瑰曲线 r = sin(n*x) 的花瓣数：n 为奇数时有 n 瓣，n 为偶数时有 2n 瓣
                </p>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 mb-4">
                螺线等曲线需要多圈才能完整显示，点击函数列表中的 ⚙ 按钮配置 θ 范围
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="py-2 text-left">预设</th>
                    <th className="py-2 text-left">范围</th>
                    <th className="py-2 text-left">用途</th>
                  </tr>
                </thead>
                <tbody>
                  {THETA_CONFIG.map((t, i) => (
                    <tr key={i} className="border-b border-gray-700/50">
                      <td className="py-3 text-amber-400 font-medium">{t.preset}</td>
                      <td className="py-3 text-white font-mono">{t.range}</td>
                      <td className="py-3 text-gray-400">{t.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* GPU 渲染 */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-amber-400 mb-3">GPU 渲染</h3>
                <div className="space-y-2">
                  {GPU_INFO.map((g, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded bg-canvas-panelLight/30">
                      <span className="text-white text-sm w-24">{g.feature}</span>
                      <span className="text-gray-400 text-xs flex-1">{g.desc}</span>
                      <span className="text-amber-300 text-xs">{g.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 函数级别开关 */}
              <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-300">
                  <strong>函数级别控制:</strong> 每个极坐标函数可独立开启/关闭 GPU 渲染，点击函数列表中的 ⚡ 按钮切换
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
