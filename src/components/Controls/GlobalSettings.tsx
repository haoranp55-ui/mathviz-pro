// src/components/Controls/GlobalSettings.tsx
import React, { useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SAMPLE_PRESETS } from '../../types';
import { getThreeDRenderManager } from '../../lib/threeD/threeDRenderManager';
import type { SamplePreset } from '../../types';

const PRESET_ORDER: SamplePreset[] = ['fast', 'normal', 'fine', 'ultra'];

const PRESET_CONFIG: Record<SamplePreset, { label: string; icon: string }> = {
  fast: { label: '快速', icon: '⚡' },
  normal: { label: '标准', icon: '◆' },
  fine: { label: '精细', icon: '✦' },
  ultra: { label: '极致', icon: '✹' },
};

export const GlobalSettings: React.FC = () => {
  const {
    viewPort,
    showGrid,
    samplePreset,
    systemType,
    setViewPort,
    toggleGrid,
    setSamplePreset,
    bumpThreeDVersion,
    resetView,
    exportImage,
  } = useAppStore();

  const handleReset = useCallback(() => {
    if (systemType === '3d') {
      getThreeDRenderManager().resetCamera();
      bumpThreeDVersion();
    } else {
      resetView();
    }
  }, [systemType, resetView, bumpThreeDVersion]);

  return (
    <div className="p-4 border-t border-white/[0.06] space-y-4 relative glass-subtle">
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400/50"></div>
        <span className="text-gray-400">全局设置</span>
      </div>

      {/* 坐标范围 */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <label className="text-xs text-cyan-400/60 w-14 font-mono">X<sub className="text-[10px]">min/max</sub></label>
          <input
            type="number"
            value={viewPort.xMin}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setViewPort({ xMin: Number.isNaN(val) ? viewPort.xMin : val });
            }}
            className="w-16 px-2 py-1.5 input-glass text-xs text-center"
          />
          <span className="text-gray-600 text-xs">→</span>
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

        <div className="flex items-center gap-2">
          <label className="text-xs text-cyan-400/60 w-14 font-mono">Y<sub className="text-[10px]">min/max</sub></label>
          <input
            type="number"
            value={viewPort.yMin}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setViewPort({ yMin: Number.isNaN(val) ? viewPort.yMin : val });
            }}
            className="w-16 px-2 py-1.5 input-glass text-xs text-center"
          />
          <span className="text-gray-600 text-xs">→</span>
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

      {/* 采样精度挡位 */}
      <div className="param-group">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">采样精度</label>
          <span className="text-xs text-cyan-400/70 font-mono">max: {SAMPLE_PRESETS[samplePreset].maxCount}</span>
        </div>
        <div className="flex gap-0.5 p-0.5 glass rounded-xl border border-white/[0.05]">
          {PRESET_ORDER.map((preset) => {
            const isActive = samplePreset === preset;
            const config = PRESET_CONFIG[preset];
            return (
              <button
                key={preset}
                onClick={() => setSamplePreset(preset)}
                className={`flex-1 py-2 text-xs rounded-lg transition-all duration-200 flex items-center justify-center gap-1 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <span>{config.icon}</span>
                <span>{SAMPLE_PRESETS[preset].label}</span>
              </button>
            );
          })}
        </div>
        <div className="text-xs text-gray-600 mt-1.5 text-center">
          {samplePreset === 'ultra' && (
            <span className="text-amber-400/60">⚠️ 极致模式可能较慢</span>
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
            <span className="text-cyan-400/50">▦</span>
            显示网格
          </label>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-2 pt-1">
        <button
          onClick={handleReset}
          className="w-full py-2.5 text-xs text-gray-300 btn-glass-secondary active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span className="text-cyan-400/70">↻</span>
          重置视图
        </button>

        <button
          onClick={() => exportImage()}
          className="w-full py-2.5 text-xs text-cyan-200 btn-glass active:scale-[0.98] flex items-center justify-center gap-2"
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
