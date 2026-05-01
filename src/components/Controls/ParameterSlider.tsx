// src/components/Controls/ParameterSlider.tsx
import React, { useCallback, useRef, useState } from 'react';
import type { Parameter } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface ParameterSliderProps {
  parameter: Parameter;
  onChange: (value: number) => void;
  onConfigChange?: (functionId: string, paramName: string, field: 'min' | 'max' | 'step', value: number) => void;
  functionId?: string;
}

export const ParameterSlider: React.FC<ParameterSliderProps> = ({
  parameter,
  onChange,
  onConfigChange,
  functionId,
}) => {
  const rafRef = useRef<number | null>(null);
  const pendingValueRef = useRef<number>(parameter.currentValue);
  const [showConfig, setShowConfig] = useState(false);
  const setSliderActive = useAppStore((state) => state.setSliderActive);

  // 使用 RAF 节流
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    pendingValueRef.current = value;

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        onChange(pendingValueRef.current);
        rafRef.current = null;
      });
    }
  }, [onChange]);

  // 滑动开始 - 设置活跃状态（用于优化隐函数渲染）
  const handleMouseDown = useCallback(() => {
    setSliderActive(true);
  }, [setSliderActive]);

  // 滑动结束 - 恢复状态
  const handleMouseUp = useCallback(() => {
    setSliderActive(false);
  }, [setSliderActive]);

  // 清理
  React.useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // 手动输入当前值
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= parameter.min && value <= parameter.max) {
      onChange(value);
    }
  }, [onChange, parameter.min, parameter.max]);

  // 配置输入
  const handleConfigChange = useCallback((field: 'min' | 'max' | 'step', e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onConfigChange || !functionId) return;
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onConfigChange(functionId, parameter.name, field, value);
    }
  }, [onConfigChange, functionId, parameter.name]);

  return (
    <div className="parameter-slider">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-gray-300">{parameter.name}</span>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-gray-500 hover:text-gray-300 text-xs px-1"
            title="配置参数范围"
          >
            ⚙
          </button>
        </div>
        <input
          type="number"
          value={parameter.currentValue.toFixed(2)}
          onChange={handleInputChange}
          className="w-16 px-1.5 py-0.5 bg-canvas-panelLight text-white text-xs rounded border border-gray-600 text-center"
          step={parameter.step}
          min={parameter.min}
          max={parameter.max}
        />
      </div>

      {/* 配置面板 */}
      {showConfig && (
        <div className="flex items-center gap-2 mb-1.5 p-1.5 bg-gray-800/50 rounded text-xs">
          <label className="flex items-center gap-1 text-gray-400">
            <span>最小:</span>
            <input
              type="number"
              value={parameter.min}
              onChange={(e) => handleConfigChange('min', e)}
              className="w-12 px-1 py-0.5 bg-canvas-panelLight text-white rounded border border-gray-600"
            />
          </label>
          <label className="flex items-center gap-1 text-gray-400">
            <span>最大:</span>
            <input
              type="number"
              value={parameter.max}
              onChange={(e) => handleConfigChange('max', e)}
              className="w-12 px-1 py-0.5 bg-canvas-panelLight text-white rounded border border-gray-600"
            />
          </label>
          <label className="flex items-center gap-1 text-gray-400">
            <span>步长:</span>
            <input
              type="number"
              value={parameter.step}
              onChange={(e) => handleConfigChange('step', e)}
              className="w-12 px-1 py-0.5 bg-canvas-panelLight text-white rounded border border-gray-600"
              step="any"
            />
          </label>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-8 text-right">{parameter.min}</span>
        <input
          type="range"
          min={parameter.min}
          max={parameter.max}
          step={parameter.step}
          value={parameter.currentValue}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          className="flex-1 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-thumb"
        />
        <span className="text-xs text-gray-500 w-8">{parameter.max}</span>
      </div>
    </div>
  );
};
