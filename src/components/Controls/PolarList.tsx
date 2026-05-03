// src/components/Controls/PolarList.tsx
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ParameterSlider } from './ParameterSlider';
import { EmptyState } from '../UI/EmptyState';
import { isPolarWebGLAvailable } from '../../lib/webgl/polarRendererManager';

export const PolarList: React.FC = () => {
  const polarFunctions = useAppStore(state => state.polarFunctions);
  const useGPURendering = useAppStore(state => state.useGPURendering);
  const toggleGPURendering = useAppStore(state => state.toggleGPURendering);
  const updatePolarParameter = useAppStore(state => state.updatePolarParameter);
  const togglePolarVisibility = useAppStore(state => state.togglePolarVisibility);
  const togglePolarKeyPoints = useAppStore(state => state.togglePolarKeyPoints);
  const removePolarFunction = useAppStore(state => state.removePolarFunction);

  const [gpuAvailable] = useState(() => isPolarWebGLAvailable());

  if (polarFunctions.length === 0) {
    return (
      <EmptyState
        title="暂无极坐标函数"
        subtitle="输入 sin(3*x) 添加曲线"
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="text-xs text-gray-500 px-2 mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
        <span className="text-gray-400">极坐标函数列表</span>
        <span className="text-amber-400 font-serif text-sm">r = f(x)</span>
        <span className="ml-auto glass-subtle px-2 py-0.5 rounded-md text-xs text-amber-300 border border-white/5">
          {polarFunctions.length}
        </span>
      </div>

      {/* GPU 着色器渲染开关 */}
      <div className="mx-1 mb-3 p-3 glass-card border-amber-500/10 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl font-mono text-amber-400">GPU</div>
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/25 to-orange-500/25 flex items-center justify-center border border-amber-500/20">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-amber-500 peer-checked:to-orange-500 peer-disabled:opacity-30 peer-disabled:cursor-not-allowed border border-white/10"></div>
          </label>
        </div>
        {!gpuAvailable && (
          <div className="text-xs text-yellow-500/80 mt-2 flex items-center gap-1 relative z-10">
            <span>⚠️</span>
            <span>WebGL2 不可用</span>
          </div>
        )}
        {gpuAvailable && useGPURendering && (
          <div className="text-xs text-amber-400/80 mt-2 flex items-center gap-1 relative z-10">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>GPU 并行采样，自适应渲染</span>
          </div>
        )}
      </div>

      <ul className="space-y-2">
        {polarFunctions.map((fn) => (
          <li key={fn.id}>
            <div className="function-item glass-card flex items-center gap-2.5 px-3 py-2.5 group cursor-pointer">
              {/* 颜色指示条 */}
              <div
                className="w-1.5 h-7 rounded-full flex-shrink-0 cursor-pointer transition-all duration-300 hover:scale-y-110"
                style={{
                  backgroundColor: fn.color,
                  boxShadow: `0 0 10px ${fn.color}60, 0 0 4px ${fn.color}40`
                }}
                onClick={() => togglePolarVisibility(fn.id)}
              />

              {/* 函数表达式 */}
              <button
                className={`text-sm flex-1 text-left font-mono truncate transition-all ${
                  fn.visible ? 'text-white' : 'text-gray-500 line-through'
                }`}
              >
                <span className="text-amber-400/80">r = </span>
                {fn.expression}
              </button>

              {/* 操作按钮组 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* 错误提示 */}
                {fn.error && (
                  <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-md border border-red-500/20" title={fn.error}>
                    错误
                  </span>
                )}

                {/* 显示/隐藏按钮 */}
                <button
                  onClick={() => togglePolarVisibility(fn.id)}
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

                {/* 关键点按钮 */}
                {!fn.error && (
                  <button
                    onClick={() => togglePolarKeyPoints(fn.id)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      fn.showKeyPoints
                        ? 'text-blue-400 bg-blue-400/15 hover:bg-blue-400/25 border border-blue-400/20'
                        : 'text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 opacity-0 group-hover:opacity-100'
                    }`}
                    title={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注'}
                    aria-label={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注'}
                  >
                    ◆
                  </button>
                )}

                {/* 删除按钮 */}
                <button
                  onClick={() => removePolarFunction(fn.id)}
                  className="text-gray-500 hover:text-red-400 hover:bg-red-400/15 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-400/20"
                  title="删除函数"
                  aria-label="删除函数"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 展开内容：参数滑钮 */}
            {fn.visible && !fn.error && fn.parameters.length > 0 && (
              <div className="mt-1.5 mx-1 p-2.5 glass-subtle rounded-xl border border-white/[0.04] space-y-2">
                {fn.parameters.map((param) => (
                  <ParameterSlider
                    key={param.name}
                    parameter={param}
                    onChange={(value) => updatePolarParameter(fn.id, param.name, value)}
                  />
                ))}
              </div>
            )}

            {/* 错误提示 */}
            {fn.error && (
              <div className="mt-1.5 mx-1 text-xs text-red-400 p-2 glass-subtle rounded-xl border border-red-500/20">
                {fn.error}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
