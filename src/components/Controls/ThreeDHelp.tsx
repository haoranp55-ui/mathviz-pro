// src/components/Controls/ThreeDHelp.tsx
import React from 'react';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EXAMPLES = [
  { category: '曲面函数', items: [
    { expr: 'sin(sqrt(x^2 + y^2))', desc: '涟漪曲面 - 距离的正弦波' },
    { expr: 'cos(x) * sin(y)', desc: '棋盘格波浪' },
    { expr: 'sin(x) + cos(y)', desc: '斜向波浪' },
  ]},
  { category: '二次曲面', items: [
    { expr: 'x^2 + y^2', desc: '旋转抛物面（碗状）' },
    { expr: 'x^2 - y^2', desc: '马鞍面（双曲抛物面）' },
  ]},
  { category: '指数与高斯', items: [
    { expr: 'exp(-x^2 - y^2)', desc: '高斯钟形曲面' },
    { expr: 'exp(-(x^2 + y^2)) * 5', desc: '尖峰高斯' },
  ]},
  { category: '混合函数', items: [
    { expr: 'x * y / 5', desc: '双曲抛物面' },
    { expr: 'sin(x) * y / 2', desc: '正弦波纹斜坡' },
  ]},
];

export const ThreeDHelp: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="glass-strong rounded-2xl border border-white/10 shadow-2xl max-w-lg w-[90%] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.03]">
          <h2 className="text-base font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            3D 曲面帮助
          </h2>
          <button onClick={onClose} className="btn-icon-glass text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 交互操作说明 */}
        <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <h3 className="text-xs text-gray-400 mb-2 uppercase tracking-wider">交互操作</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-xs text-gray-300">旋转</span>
              <span className="text-[10px] text-gray-500">左键拖拽</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-xs text-gray-300">缩放</span>
              <span className="text-[10px] text-gray-500">鼠标滚轮</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              <span className="text-xs text-gray-300">平移</span>
              <span className="text-[10px] text-gray-500">Shift+拖拽 / 右键</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
              <div className="flex gap-0.5">
                <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[10px] text-purple-300 font-mono border border-white/[0.08]">W</span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[10px] text-purple-300 font-mono border border-white/[0.08]">A</span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[10px] text-purple-300 font-mono border border-white/[0.08]">S</span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[10px] text-purple-300 font-mono border border-white/[0.08]">D</span>
              </div>
              <span className="text-xs text-gray-300">水平移动</span>
              <span className="text-[10px] text-gray-500">前/后/左/右</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
              <div className="flex gap-0.5">
                <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[10px] text-purple-300 font-mono border border-white/[0.08]">Space</span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[10px] text-purple-300 font-mono border border-white/[0.08]">X</span>
              </div>
              <span className="text-xs text-gray-300">垂直移动</span>
              <span className="text-[10px] text-gray-500">上/下</span>
            </div>
          </div>
        </div>

        {/* 语法说明 */}
        <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <h3 className="text-xs text-gray-400 mb-2 uppercase tracking-wider">语法说明</h3>
          <div className="text-xs text-gray-300 space-y-1.5">
            <p>• 表达式形式：<span className="text-purple-300 font-mono">z = f(x, y)</span>，直接输入右侧即可</p>
            <p>• 坐标轴：<span className="text-red-400">X</span>(红) <span className="text-green-400">Y</span>(绿) 为底面，<span className="text-blue-400">Z</span>(蓝) 为高度</p>
            <p>• 支持函数：sin, cos, tan, exp, log, sqrt, abs, pow 等</p>
            <p>• 支持常量：<span className="text-purple-300 font-mono">pi</span>、<span className="text-purple-300 font-mono">e</span></p>
            <p>• 运算符：<span className="text-purple-300 font-mono">+ - * / ^</span></p>
          </div>
        </div>

        {/* 渲染精度说明 */}
        <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <h3 className="text-xs text-gray-400 mb-2 uppercase tracking-wider">渲染精度</h3>
          <div className="text-xs text-gray-300 space-y-1.5">
            <p>• 下方「全局设置 → 采样精度」联动控制 3D 网格分辨率</p>
            <p>• <span className="text-amber-300">快速</span> = 32, <span className="text-blue-300">标准</span> = 64, <span className="text-purple-300">精细</span> = 128, <span className="text-red-300">极致</span> = 256</p>
            <p>• 单个函数可在列表中单独调整网格密度</p>
            <p>• 线框模式可查看实际三角面分布</p>
          </div>
        </div>

        {/* 示例列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <h3 className="text-xs text-gray-400 mb-2 uppercase tracking-wider">示例曲面</h3>
          {EXAMPLES.map(group => (
            <div key={group.category} className="mb-3">
              <div className="text-xs text-gray-500 mb-1.5">{group.category}</div>
              <div className="space-y-1.5">
                {group.items.map(item => (
                  <div key={item.expr} className="flex flex-col px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.05] transition-colors">
                    <code className="text-xs text-purple-300 font-mono">{item.expr}</code>
                    <span className="text-[10px] text-gray-500 mt-0.5">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};
