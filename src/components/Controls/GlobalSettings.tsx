// src/components/Controls/GlobalSettings.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SAMPLE_PRESETS } from '../../types';
import type { SamplePreset } from '../../types';

const PRESET_ORDER: SamplePreset[] = ['fast', 'normal', 'fine', 'ultra'];

export const GlobalSettings: React.FC = () => {
  const {
    viewPort,
    showGrid,
    samplePreset,
    setViewPort,
    toggleGrid,
    setSamplePreset,
    resetView,
    exportImage,
  } = useAppStore();

  return (
    <div className="p-4 border-t border-gray-700/50 space-y-4 relative">
      {/* 标题 */}
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 shadow-lg shadow-amber-500/30"></div>
        <span className="text-gray-400">全局设置</span>
        <span className="text-amber-400 font-serif text-sm">⚙</span>
      </div>

      {/* 坐标范围 */}
      <div className="space-y-3">
        {/* X 范围 */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-cyan-400 w-14 font-mono">X<sub className="text-[10px]">min/max</sub></label>
          <input
            type="number"
            value={viewPort.xMin}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setViewPort({ xMin: Number.isNaN(val) ? viewPort.xMin : val });
            }}
            className="w-16 px-2 py-1.5 bg-canvas-panelLight text-white text-xs rounded-lg border border-gray-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none text-center transition-all"
          />
          <span className="text-cyan-500/50">→</span>
          <input
            type="number"
            value={viewPort.xMax}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setViewPort({ xMax: Number.isNaN(val) ? viewPort.xMax : val });
            }}
            className="w-16 px-2 py-1.5 bg-canvas-panelLight text-white text-xs rounded-lg border border-gray-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none text-center transition-all"
          />
        </div>

        {/* Y 范围 */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-green-400 w-14 font-mono">Y<sub className="text-[10px]">min/max</sub></label>
          <input
            type="number"
            value={viewPort.yMin}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setViewPort({ yMin: Number.isNaN(val) ? viewPort.yMin : val });
            }}
            className="w-16 px-2 py-1.5 bg-canvas-panelLight text-white text-xs rounded-lg border border-gray-600 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 focus:outline-none text-center transition-all"
          />
          <span className="text-green-500/50">→</span>
          <input
            type="number"
            value={viewPort.yMax}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setViewPort({ yMax: Number.isNaN(val) ? viewPort.yMax : val });
            }}
            className="w-16 px-2 py-1.5 bg-canvas-panelLight text-white text-xs rounded-lg border border-gray-600 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 focus:outline-none text-center transition-all"
          />
        </div>
      </div>

      {/* 采样精度挡位 */}
      <div className="param-group">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">采样精度</label>
          <span className="text-xs text-cyan-400 font-mono">max: {SAMPLE_PRESETS[samplePreset].maxCount}</span>
        </div>
        <div className="flex gap-1">
          {PRESET_ORDER.map((preset) => (
            <button
              key={preset}
              onClick={() => setSamplePreset(preset)}
              className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                samplePreset === preset
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-canvas-panelLight text-gray-400 hover:text-white hover:bg-gray-600'
              }`}
            >
              {SAMPLE_PRESETS[preset].label}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-1.5 text-center">
          {samplePreset === 'ultra' && '⚠️ 极致模式可能较慢'}
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
            <span className="text-cyan-400">▦</span>
            显示网格
          </label>
        </div>
      </div>

      {/* 重置按钮 */}
      <button
        onClick={resetView}
        className="w-full py-2.5 text-xs text-gray-300 border border-gray-600 rounded-lg hover:bg-canvas-panelLight hover:border-gray-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <span className="text-cyan-400">↻</span>
        重置视图
      </button>

      {/* 导出图片按钮 */}
      <button
        onClick={() => exportImage()}
        className="w-full py-2.5 text-xs text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg hover:from-blue-500 hover:to-cyan-500 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
      >
        <span>📷</span>
        导出图片
      </button>
    </div>
  );
};
