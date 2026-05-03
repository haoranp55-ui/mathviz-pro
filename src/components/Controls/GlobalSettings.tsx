// src/components/Controls/GlobalSettings.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SAMPLE_PRESETS } from '../../types';
import type { SamplePreset } from '../../types';
import { isWebGLAvailable } from '../../lib/webgl/implicitRendererManager';

const PRESET_ORDER: SamplePreset[] = ['fast', 'normal', 'fine', 'ultra'];

const PRESET_CONFIG: Record<SamplePreset, { label: string; icon: string; color: string }> = {
  fast: { label: '快速', icon: '⚡', color: 'from-yellow-500 to-amber-500' },
  normal: { label: '标准', icon: '◆', color: 'from-blue-500 to-cyan-500' },
  fine: { label: '精细', icon: '✦', color: 'from-purple-500 to-pink-500' },
  ultra: { label: '极致', icon: '✹', color: 'from-red-500 to-rose-500' },
};

export const GlobalSettings: React.FC = () => {
  const {
    viewPort,
    showGrid,
    samplePreset,
    useGPURendering,
    setViewPort,
    toggleGrid,
    setSamplePreset,
    toggleGPURendering,
    resetView,
    exportImage,
  } = useAppStore();

  const gpuAvailable = isWebGLAvailable();

  return (
    <div className="p-4 border-t border-white/[0.06] space-y-4 relative glass-subtle">
      {/* 标题 */}
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
        <span className="text-gray-400">全局设置</span>
        <span className="text-amber-400 font-serif text-sm">⚙</span>
      </div>

      {/* 坐标范围 */}
      <div className="space-y-3">
        {/* X 范围 */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-cyan-400/80 w-14 font-mono">X<sub className="text-[10px]">min/max</sub></label>
          <input
            type="number"
            value={viewPort.xMin}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setViewPort({ xMin: Number.isNaN(val) ? viewPort.xMin : val });
            }}
            className="w-16 px-2 py-1.5 input-glass text-xs text-center"
          />
          <span className="text-cyan-500/30 text-xs">→</span>
          <input
            type="number"
            value={viewPort.xMax}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setViewPort({ xMax: Number.isNaN(val) ? viewPort.xMax : val });
            }}
            className="w-16 px-2 py-1.5 input-glass text-xs text-center"
          />
        </div>

        {/* Y 范围 */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-green-400/80 w-14 font-mono">Y<sub className="text-[10px]">min/max</sub></label>
          <input
            type="number"
            value={viewPort.yMin}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setViewPort({ yMin: Number.isNaN(val) ? viewPort.yMin : val });
            }}
            className="w-16 px-2 py-1.5 input-glass text-xs text-center"
          />
          <span className="text-green-500/30 text-xs">→</span>
          <input
            type="number"
            value={viewPort.yMax}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setViewPort({ yMax: Number.isNaN(val) ? viewPort.yMax : val });
            }}
            className="w-16 px-2 py-1.5 input-glass text-xs text-center"
          />
        </div>
      </div>

      {/* 采样精度挡位 - 分段控制器风格 */}
      <div className="param-group">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">采样精度</label>
          <span className="text-xs text-cyan-400 font-mono">max: {SAMPLE_PRESETS[samplePreset].maxCount}</span>
        </div>
        <div className="flex gap-0.5 p-0.5 glass-subtle rounded-xl border border-white/[0.05]">
          {PRESET_ORDER.map((preset) => {
            const isActive = samplePreset === preset;
            const config = PRESET_CONFIG[preset];
            return (
              <button
                key={preset}
                onClick={() => setSamplePreset(preset)}
                className={`flex-1 py-2 text-xs rounded-lg transition-all duration-300 flex items-center justify-center gap-1 ${
                  isActive
                    ? `bg-gradient-to-r ${config.color} text-white shadow-lg`
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                style={isActive ? { boxShadow: `0 4px 15px rgba(0,0,0,0.3)` } : {}}
              >
                <span>{config.icon}</span>
                <span>{SAMPLE_PRESETS[preset].label}</span>
              </button>
            );
          })}
        </div>
        <div className="text-xs text-gray-500 mt-1.5 text-center">
          {samplePreset === 'ultra' && (
            <span className="text-amber-400/70">⚠️ 极致模式可能较慢</span>
          )}
        </div>
      </div>

      {/* 显示选项 */}
      <div className="param-group space-y-2.5">
        <div className="flex items-center gap-3 py-1">
          <input
            type="checkbox"
            id="showGrid"
            checked={showGrid}
            onChange={toggleGrid}
            className="custom-checkbox"
          />
          <label htmlFor="showGrid" className="text-xs text-gray-300 cursor-pointer flex items-center gap-1.5">
            <span className="text-cyan-400/70">▦</span>
            显示网格
          </label>
        </div>

        {/* GPU 渲染开关 */}
        {gpuAvailable && (
          <div className="flex items-center gap-3 py-1">
            <input
              type="checkbox"
              id="useGPU"
              checked={useGPURendering}
              onChange={toggleGPURendering}
              className="custom-checkbox"
            />
            <label htmlFor="useGPU" className="text-xs text-gray-300 cursor-pointer flex items-center gap-1.5">
              <span className="text-purple-400/70">⚡</span>
              GPU 着色器渲染
            </label>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="space-y-2 pt-1">
        <button
          onClick={resetView}
          className="w-full py-2.5 text-xs text-gray-300 btn-glass-secondary active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span className="text-cyan-400">↻</span>
          重置视图
        </button>

        <button
          onClick={() => exportImage()}
          className="w-full py-2.5 text-xs text-white btn-glass active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          导出图片
        </button>
      </div>
    </div>
  );
};
