// src/components/Controls/ParameterPanel.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ParameterPanel: React.FC = () => {
  const { viewPort, showGrid, showKeyPoints, sampleCount, setViewPort, toggleGrid, toggleKeyPoints, setSampleCount, resetView } = useAppStore();

  return (
    <div className="p-4 border-t border-gray-700/50 space-y-4">
      {/* 标题 */}
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-curve-4"></span>
        参数控制
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

      {/* 采样点数 */}
      <div className="param-group">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">采样精度</label>
          <span className="text-xs text-white bg-canvas-panelLight px-2 py-0.5 rounded">{sampleCount}</span>
        </div>
        <input
          type="range"
          min={100}
          max={5000}
          step={100}
          value={sampleCount}
          onChange={(e) => setSampleCount(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>快速</span>
          <span>精细</span>
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

        <div className="flex items-center gap-3 py-1">
          <input
            type="checkbox"
            id="showKeyPoints"
            checked={showKeyPoints}
            onChange={toggleKeyPoints}
            className="custom-checkbox"
          />
          <label htmlFor="showKeyPoints" className="text-xs text-gray-300 cursor-pointer">
            显示关键点
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
    </div>
  );
};
