// src/components/Controls/ImplicitList.tsx
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ParameterSlider } from './ParameterSlider';
import { EmptyState } from '../UI/EmptyState';
import { isWebGLAvailable } from '../../lib/webgl/implicitRendererManager';

export const ImplicitList: React.FC = () => {
  const implicitFunctions = useAppStore(state => state.implicitFunctions);
  const useGPURendering = useAppStore(state => state.useGPURendering);
  const toggleGPURendering = useAppStore(state => state.toggleGPURendering);
  const removeImplicitFunction = useAppStore(state => state.removeImplicitFunction);
  const toggleImplicitVisibility = useAppStore(state => state.toggleImplicitVisibility);
  const toggleImplicitKeyPoints = useAppStore(state => state.toggleImplicitKeyPoints);
  const updateImplicitParameter = useAppStore(state => state.updateImplicitParameter);

  const [gpuAvailable, setGpuAvailable] = useState(false);

  useEffect(() => {
    setGpuAvailable(isWebGLAvailable());
  }, []);

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
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-teal-400 shadow-lg shadow-green-500/30"></div>
        <span className="text-gray-400">隐函数列表</span>
        <span className="text-green-400 font-serif text-sm">F(x,y) = 0</span>
        <span className="ml-auto bg-green-500/20 px-2 py-0.5 rounded text-xs text-green-300">
          {implicitFunctions.length}
        </span>
      </div>

      {/* GPU 着色器渲染开关 - 仅隐函数支持 */}
      <div className="mx-2 mb-3 p-3 bg-gradient-to-r from-green-900/20 via-teal-900/20 to-cyan-900/20 rounded-lg border border-green-500/20 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl font-mono text-green-400">GPU</div>
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500/30 to-teal-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <span className="text-xs text-gray-300">GPU 着色器渲染</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useGPURendering}
              onChange={toggleGPURendering}
              disabled={!gpuAvailable}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-teal-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
          </label>
        </div>
        {!gpuAvailable && (
          <div className="text-xs text-yellow-500/80 mt-2 flex items-center gap-1 relative z-10">
            <span>⚠️</span>
            <span>WebGL2 不可用</span>
          </div>
        )}
        {gpuAvailable && useGPURendering && (
          <div className="text-xs text-green-400/80 mt-2 flex items-center gap-1 relative z-10">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>像素级精度，GPU 并行加速</span>
          </div>
        )}
      </div>

      <ul className="space-y-1.5">
      {implicitFunctions.map(fn => (
        <li key={fn.id}>
        <div
          className="function-item flex items-center gap-2 px-3 py-2.5 rounded-lg list-item group"
        >
          {/* 颜色指示条 */}
          <div
            className="w-1 h-6 rounded-full flex-shrink-0 cursor-pointer shadow-lg"
            style={{ backgroundColor: fn.color, boxShadow: `0 0 8px ${fn.color}50` }}
            onClick={() => toggleImplicitVisibility(fn.id)}
          />

          {/* 表达式 */}
          <button
            className={`text-sm flex-1 text-left font-mono truncate ${
              fn.visible ? 'text-white' : 'text-gray-500 line-through'
            }`}
          >
            {fn.expression}
          </button>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {fn.error && (
              <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-500/30" title={fn.error}>
                错误
              </span>
            )}

            <button
              onClick={() => toggleImplicitVisibility(fn.id)}
              className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                fn.visible
                  ? 'text-green-400 hover:text-green-300'
                  : 'text-gray-500 bg-gray-500/20 hover:bg-gray-500/30'
              } opacity-0 group-hover:opacity-100`}
              title={fn.visible ? '隐藏函数' : '显示函数'}
              aria-label={fn.visible ? '隐藏函数' : '显示函数'}
            >
              {fn.visible ? '◉' : '○'}
            </button>

            {!fn.error && (
              <button
                onClick={() => toggleImplicitKeyPoints(fn.id)}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                  fn.showKeyPoints
                    ? 'text-blue-400 bg-blue-400/20 hover:bg-blue-400/30'
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
              className="text-gray-500 hover:text-red-400 hover:bg-red-400/20 w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
              title="删除函数"
              aria-label="删除函数"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 展开内容：提示 + 参数 */}
        {fn.visible && !fn.error && (
          <div className="mx-3 mt-1 p-2 bg-gradient-to-r from-green-900/10 to-teal-900/10 rounded-lg border border-green-500/10 space-y-2">
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
          <div className="mx-3 mt-1 text-xs text-red-400 p-2 bg-red-900/20 rounded border border-red-500/20">
            {fn.error}
          </div>
        )}
        </li>
      ))}
      </ul>
    </div>
  );
};
