// src/components/Controls/ImplicitList.tsx
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ParameterSlider } from './ParameterSlider';
import { EmptyState } from '../UI/EmptyState';
import { isWebGLAvailable } from '../../lib/webgl/implicitRendererManager';

export const ImplicitList: React.FC = () => {
  const implicitFunctions = useAppStore(state => state.implicitFunctions);
  const removeImplicitFunction = useAppStore(state => state.removeImplicitFunction);
  const toggleImplicitVisibility = useAppStore(state => state.toggleImplicitVisibility);
  const toggleImplicitKeyPoints = useAppStore(state => state.toggleImplicitKeyPoints);
  const toggleImplicitGPURendering = useAppStore(state => state.toggleImplicitGPURendering);
  const updateImplicitParameter = useAppStore(state => state.updateImplicitParameter);

  const [gpuAvailable] = useState(() => isWebGLAvailable());

  if (implicitFunctions.length === 0) {
    return (
      <EmptyState
        title="暂无隐函数"
        subtitle="请添加隐函数"
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="text-xs text-gray-500 px-2 mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-teal-400 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
        <span className="text-gray-400">隐函数列表</span>
        <span className="text-green-400 font-serif text-sm">F(x,y) = 0</span>
        <span className="ml-auto glass-subtle px-2 py-0.5 rounded-md text-xs text-green-300 border border-white/5">
          {implicitFunctions.length}
        </span>
      </div>

      <ul className="space-y-2">
      {implicitFunctions.map(fn => (
        <li key={fn.id}>
        <div className="function-item glass-card flex items-center gap-2.5 px-3 py-2.5 group">
          {/* 颜色指示条 */}
          <div
            className="w-1.5 h-7 rounded-full flex-shrink-0 cursor-pointer transition-all duration-300 hover:scale-y-110"
            style={{
              backgroundColor: fn.color,
              boxShadow: `0 0 10px ${fn.color}60, 0 0 4px ${fn.color}40`
            }}
            onClick={() => toggleImplicitVisibility(fn.id)}
          />

          {/* 表达式 */}
          <button
            className={`text-sm flex-1 text-left font-mono truncate transition-all ${
              fn.visible ? 'text-white' : 'text-gray-500 line-through'
            }`}
          >
            {fn.expression}
          </button>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {fn.error && (
              <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-md border border-red-500/20" title={fn.error}>
                错误
              </span>
            )}

            {/* GPU 渲染开关（函数级别） */}
            {!fn.error && gpuAvailable && !fn.requiresCPU && (
              <button
                onClick={() => toggleImplicitGPURendering(fn.id)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  fn.useGPURendering
                    ? 'text-green-400 bg-green-400/15 hover:bg-green-400/25 border border-green-400/20'
                    : 'text-gray-500 hover:text-green-400 hover:bg-green-400/10 opacity-0 group-hover:opacity-100'
                }`}
                title={fn.useGPURendering ? '关闭 GPU 渲染' : '开启 GPU 渲染（像素级精度）'}
                aria-label={fn.useGPURendering ? '关闭 GPU 渲染' : '开启 GPU 渲染'}
              >
                ⚡
              </button>
            )}

            <button
              onClick={() => toggleImplicitVisibility(fn.id)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                fn.visible
                  ? 'text-green-400 hover:text-green-300 hover:bg-green-400/10'
                  : 'text-gray-500 bg-white/5 hover:bg-white/10'
              } opacity-0 group-hover:opacity-100`}
              title={fn.visible ? '隐藏函数' : '显示函数'}
              aria-label={fn.visible ? '隐藏函数' : '显示函数'}
            >
              {fn.visible ? '◉' : '○'}
            </button>

            {!fn.error && (
              <button
                onClick={() => toggleImplicitKeyPoints(fn.id)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  fn.showKeyPoints
                    ? 'text-blue-400 bg-blue-400/15 hover:bg-blue-400/25 border border-blue-400/20'
                    : 'text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 opacity-0 group-hover:opacity-100'
                }`}
                title={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注（极值点、边界点）'}
                aria-label={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注'}
              >
                ◆
              </button>
            )}

            <button
              onClick={() => removeImplicitFunction(fn.id)}
              className="text-gray-500 hover:text-red-400 hover:bg-red-400/15 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-400/20"
              title="删除函数"
              aria-label="删除函数"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 展开内容：提示 + 参数 */}
        {fn.visible && !fn.error && (
          <div className="mt-1.5 mx-1 p-2.5 glass-subtle rounded-xl border border-white/[0.04] space-y-2">
            {fn.transformedExpression && (
              <div className="text-xs text-amber-400/80 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>已转换为稳定形式: <code className="font-mono text-amber-300">{fn.transformedExpression} = 0</code></span>
              </div>
            )}

            {fn.requiresCPU && (
              <div className="text-xs text-blue-400/80 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>已自动切换到 CPU 渲染（GLSL 不支持该函数）</span>
              </div>
            )}

            {fn.useGPURendering && !fn.requiresCPU && (
              <div className="text-xs text-green-400/80 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>GPU 渲染已启用（像素级精度）</span>
              </div>
            )}

            {fn.parameters.length > 0 && (
              <div className="space-y-2">
                {fn.parameters.map(param => (
                  <ParameterSlider
                    key={param.name}
                    parameter={param}
                    onChange={(value) => updateImplicitParameter(fn.id, param.name, value)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 错误提示 */}
        {fn.error && (
          <div className="mx-1 mt-1 text-xs text-red-400 p-2 glass-subtle rounded-xl border border-red-500/15">
            {fn.error}
          </div>
        )}
        </li>
      ))}
      </ul>
    </div>
  );
};
