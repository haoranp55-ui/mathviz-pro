// src/components/Controls/GlobalSettings.tsx
import { useCallback, useState, type FC, type KeyboardEvent } from 'react';
import { Zap, Diamond, Sparkles, Star, RotateCcw, ImageDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { SAMPLE_PRESETS } from '../../types';
import type { SamplePreset } from '../../types';

const PRESET_ORDER: SamplePreset[] = ['fast', 'normal', 'fine', 'ultra'];

const PRESET_CONFIG: Record<SamplePreset, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  fast: { label: '快速', Icon: Zap },
  normal: { label: '标准', Icon: Diamond },
  fine: { label: '精细', Icon: Sparkles },
  ultra: { label: '极致', Icon: Star },
};

export const GlobalSettings: FC = () => {
  const viewPort = useAppStore(s => s.viewPort);
  const showGrid = useAppStore(s => s.showGrid);
  const samplePreset = useAppStore(s => s.samplePreset);
  const systemType = useAppStore(s => s.systemType);
  const setViewPort = useAppStore(s => s.setViewPort);
  const toggleGrid = useAppStore(s => s.toggleGrid);
  const setSamplePreset = useAppStore(s => s.setSamplePreset);
  const bumpThreeDVersion = useAppStore(s => s.bumpThreeDVersion);
  const resetView = useAppStore(s => s.resetView);
  const exportImage = useAppStore(s => s.exportImage);

  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  const validateAndSet = useCallback((updates: Partial<typeof viewPort>) => {
    const next = { ...viewPort, ...updates };
    const errors: Record<string, boolean> = {};
    if (next.xMin >= next.xMax) errors.x = true;
    if (next.yMin >= next.yMax) errors.y = true;
    setValidationErrors(errors);
    if (Object.keys(errors).length === 0) setViewPort(updates);
  }, [viewPort, setViewPort]);

  const handleReset = useCallback(async () => {
    if (systemType === '3d') {
      const { getThreeDRenderManager } = await import('../../lib/threeD/threeDRenderManager');
      getThreeDRenderManager().resetCamera();
      bumpThreeDVersion();
    } else {
      resetView();
    }
  }, [systemType, resetView, bumpThreeDVersion]);

  const inputClass = (hasError: boolean) =>
    `w-16 px-2 py-1.5 input-glass text-xs text-center${hasError ? ' !border-red-500/60 !bg-red-500/10' : ''}`;

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
              if (!Number.isNaN(val)) validateAndSet({ xMin: val });
            }}
            className={inputClass(!!validationErrors.x)}
          />
          <span className="text-gray-600 text-xs">→</span>
          <input
            type="number"
            value={viewPort.xMax}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!Number.isNaN(val)) validateAndSet({ xMax: val });
            }}
            className={inputClass(!!validationErrors.x)}
          />
          {validationErrors.x && <span className="text-[10px] text-red-400">min&lt;max</span>}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-cyan-400/60 w-14 font-mono">Y<sub className="text-[10px]">min/max</sub></label>
          <input
            type="number"
            value={viewPort.yMin}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!Number.isNaN(val)) validateAndSet({ yMin: val });
            }}
            className={inputClass(!!validationErrors.y)}
          />
          <span className="text-gray-600 text-xs">→</span>
          <input
            type="number"
            value={viewPort.yMax}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!Number.isNaN(val)) validateAndSet({ yMax: val });
            }}
            className={inputClass(!!validationErrors.y)}
          />
          {validationErrors.y && <span className="text-[10px] text-red-400">min&lt;max</span>}
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
            const IconComponent = config.Icon;
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
                <IconComponent className="w-3.5 h-3.5" />
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
        <div
          className="flex items-center gap-3 py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:rounded-md"
          onClick={toggleGrid}
          role="checkbox"
          aria-checked={showGrid}
          aria-label="显示网格"
          tabIndex={0}
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === ' ' || e.key === 'Spacebar') {
              e.preventDefault();
              toggleGrid();
            }
          }}
        >
          <div
            className={`w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center ${
              showGrid
                ? 'bg-cyan-500/30 border-cyan-400/50'
                : 'bg-white/5 border-white/20'
            }`}
          >
            {showGrid && (
              <svg className="w-2.5 h-2.5 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span className="text-xs text-gray-300 flex items-center gap-1.5 select-none">
            <span className="text-cyan-400/50">▦</span>
            显示网格
          </span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-2 pt-1">
        <button
          onClick={handleReset}
          className="w-full py-2.5 text-xs text-gray-300 btn-glass-secondary active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4 text-cyan-400/70" />
          重置视图
        </button>

        <button
          onClick={() => exportImage()}
          className="w-full py-2.5 text-xs text-cyan-200 btn-glass active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <ImageDown className="w-4 h-4" />
          导出图片
        </button>
      </div>
    </div>
  );
};