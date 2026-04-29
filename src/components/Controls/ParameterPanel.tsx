// src/components/Controls/ParameterPanel.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ParameterPanel: React.FC = () => {
  const { viewPort, showGrid, showKeyPoints, sampleCount, setViewPort, toggleGrid, toggleKeyPoints, setSampleCount, resetView } = useAppStore();

  return (
    <div className="p-3 border-t border-gray-700 space-y-3">
      <div className="text-xs text-gray-500">参数控制</div>

      {/* X 范围 */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 w-16">X 范围:</label>
        <input
          type="number"
          value={viewPort.xMin}
          onChange={(e) => setViewPort({ xMin: parseFloat(e.target.value) || -10 })}
          className="w-16 px-2 py-1 bg-canvas-input text-white text-xs rounded border border-gray-600"
        />
        <span className="text-gray-500">~</span>
        <input
          type="number"
          value={viewPort.xMax}
          onChange={(e) => setViewPort({ xMax: parseFloat(e.target.value) || 10 })}
          className="w-16 px-2 py-1 bg-canvas-input text-white text-xs rounded border border-gray-600"
        />
      </div>

      {/* Y 范围 */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 w-16">Y 范围:</label>
        <input
          type="number"
          value={viewPort.yMin}
          onChange={(e) => setViewPort({ yMin: parseFloat(e.target.value) || -10 })}
          className="w-16 px-2 py-1 bg-canvas-input text-white text-xs rounded border border-gray-600"
        />
        <span className="text-gray-500">~</span>
        <input
          type="number"
          value={viewPort.yMax}
          onChange={(e) => setViewPort({ yMax: parseFloat(e.target.value) || 10 })}
          className="w-16 px-2 py-1 bg-canvas-input text-white text-xs rounded border border-gray-600"
        />
      </div>

      {/* 采样点数 */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 w-16">采样点:</label>
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={sampleCount}
          onChange={(e) => setSampleCount(parseInt(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs text-white w-10 text-right">{sampleCount}</span>
      </div>

      {/* 显示网格 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showGrid"
          checked={showGrid}
          onChange={toggleGrid}
          className="rounded"
        />
        <label htmlFor="showGrid" className="text-xs text-gray-400">
          显示网格
        </label>
      </div>

      {/* 显示关键点 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showKeyPoints"
          checked={showKeyPoints}
          onChange={toggleKeyPoints}
          className="rounded"
        />
        <label htmlFor="showKeyPoints" className="text-xs text-gray-400">
          显示关键点
        </label>
      </div>

      {/* 重置按钮 */}
      <button
        onClick={resetView}
        className="w-full py-1.5 text-xs text-gray-400 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
      >
        重置视图
      </button>
    </div>
  );
};
