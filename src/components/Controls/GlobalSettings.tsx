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
    <div className="p-4 border-t border-gray-700/50 space-y-4">
      {/* 标题 */}
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-curve-4"></span>
        全局设置
      </div>

      {/* 坐标范围 */}
      <div className="space-y-3">
        {/* X 范围 */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 w-14">X 范围</label>
          <input
            type="number"
            value={viewPort.xMin}
            onChange={(e) => setViewPort({ xMin: parseFloat(e.target.value) || -10 })}
            className="w-16 px-2 py-1.5 bg-canvas-panelLight text-white text-xs rounded-lg border border-gray-600 input-glow focus:outline-none text-center"
          />
          <span className="text-gray-600">→</span>
          <input
            type="number"
            value={viewPort.xMax}
            onChange={(e) => setViewPort({ xMax: parseFloat(e.target.value) || 10 })}
            className="w-16 px-2 py-1.5 bg-canvas-panelLight text-white text-xs rounded-lg border border-gray-600 input-glow focus:outline-none text-center"
          />
        </div>

        {/* Y 范围 */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 w-14">Y 范围</label>
          <input
            type="number"
            value={viewPort.yMin}
            onChange={(e) => setViewPort({ yMin: parseFloat(e.target.value) || -10 })}
            className="w-16 px-2 py-1.5 bg-canvas-panelLight text-white text-xs rounded-lg border border-gray-600 input-glow focus:outline-none text-center"
          />
          <span className="text-gray-600">→</span>
          <input
            type="number"
            value={viewPort.yMax}
            onChange={(e) => setViewPort({ yMax: parseFloat(e.target.value) || 10 })}
            className="w-16 px-2 py-1.5 bg-canvas-panelLight text-white text-xs rounded-lg border border-gray-600 input-glow focus:outline-none text-center"
          />
        </div>
      </div>

      {/* 采样精度挡位 */}
      <div className="param-group">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">采样精度</label>
        </div>
        <div className="flex gap-1">
          {PRESET_ORDER.map((preset) => (
            <button
              key={preset}
              onClick={() => setSamplePreset(preset)}
              className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                samplePreset === preset
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
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
          <label htmlFor="showGrid" className="text-xs text-gray-300 cursor-pointer">
            显示网格
          </label>
        </div>
      </div>

      {/* 重置按钮 */}
      <button
        onClick={resetView}
        className="w-full py-2.5 text-xs text-gray-300 border border-gray-600 rounded-lg hover:bg-canvas-panelLight hover:border-gray-500 transition-all active:scale-[0.98]"
      >
        ↻ 重置视图
      </button>

      {/* 导出图片按钮 */}
      <button
        onClick={() => exportImage()}
        className="w-full py-2.5 text-xs text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-500 hover:to-blue-500 transition-all active:scale-[0.98] shadow-lg shadow-purple-500/20"
      >
        📷 导出图片
      </button>
    </div>
  );
};