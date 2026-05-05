// src/components/Controls/ParameterSlider.tsx
import React, { useCallback, useRef, useState } from 'react';
import type { Parameter } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import type { LinkedParameterInfo } from '../../hooks/useLinkedParameters';
import { Settings } from 'lucide-react';

interface ParameterSliderProps {
  parameter: Parameter;
  onChange: (value: number) => void;
  onConfigChange?: (functionId: string, paramName: string, field: 'min' | 'max' | 'step', value: number) => void;
  functionId?: string;
  linkedInfo?: LinkedParameterInfo;
}

export const ParameterSlider: React.FC<ParameterSliderProps> = ({
  parameter,
  onChange,
  onConfigChange,
  functionId,
  linkedInfo,
}) => {
  const rafRef = useRef<number | null>(null);
  const pendingValueRef = useRef<number>(parameter.currentValue);
  const [showConfig, setShowConfig] = useState(false);
  const setSliderActive = useAppStore((state) => state.setSliderActive);

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

  const handleMouseDown = useCallback(() => {
    setSliderActive(true);
  }, [setSliderActive]);

  const handleMouseUp = useCallback(() => {
    setSliderActive(false);
  }, [setSliderActive]);

  React.useEffect(() => {
    const handleGlobalUp = () => setSliderActive(false);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [setSliderActive]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= parameter.min && value <= parameter.max) {
      onChange(value);
    }
  }, [onChange, parameter.min, parameter.max]);

  const handleConfigChange = useCallback((field: 'min' | 'max' | 'step', e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onConfigChange || !functionId) return;
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onConfigChange(functionId, parameter.name, field, value);
    }
  }, [onConfigChange, functionId, parameter.name]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-[#94A3B8]">{parameter.name}</span>
          {linkedInfo?.isLinked && (
            <span
              className="inline-flex items-center gap-0.5"
              title={`共享参数 ${parameter.name}`}
            >
              {linkedInfo.linkedWith.map(linked => (
                <span
                  key={linked.functionId}
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ backgroundColor: linked.color }}
                />
              ))}
            </span>
          )}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-[#475569] hover:text-[#94A3B8] p-0.5 rounded transition-colors"
            title="配置参数范围"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>
        <input
          type="number"
          value={parameter.currentValue.toFixed(2)}
          onChange={handleInputChange}
          className="w-16 px-1.5 py-0.5 input-base text-center text-xs"
          step={parameter.step}
          min={parameter.min}
          max={parameter.max}
        />
      </div>

      {showConfig && (
        <div className="flex items-center gap-2 mb-2 p-2 panel-subtle text-xs">
          <label className="flex items-center gap-1 text-[#64748B]">
            <span>最小:</span>
            <input
              type="number"
              value={parameter.min}
              onChange={(e) => handleConfigChange('min', e)}
              className="w-12 px-1 py-0.5 input-base text-xs"
            />
          </label>
          <label className="flex items-center gap-1 text-[#64748B]">
            <span>最大:</span>
            <input
              type="number"
              value={parameter.max}
              onChange={(e) => handleConfigChange('max', e)}
              className="w-12 px-1 py-0.5 input-base text-xs"
            />
          </label>
          <label className="flex items-center gap-1 text-[#64748B]">
            <span>步长:</span>
            <input
              type="number"
              value={parameter.step}
              onChange={(e) => handleConfigChange('step', e)}
              className="w-12 px-1 py-0.5 input-base text-xs"
              step="any"
            />
          </label>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#475569] w-8 text-right font-mono">{parameter.min}</span>
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
          className="flex-1"
        />
        <span className="text-[11px] text-[#475569] w-8 font-mono">{parameter.max}</span>
      </div>
    </div>
  );
};
