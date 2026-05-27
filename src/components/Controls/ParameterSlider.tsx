// src/components/Controls/ParameterSlider.tsx
import { useCallback, useEffect, useRef, useState, type FC, type ChangeEvent } from 'react';
import type { Parameter, ParameterAnimation, AnimationMode, AnimationDirection } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import type { LinkedParameterInfo } from '../../hooks/useLinkedParameters';
import { Settings, Play, Pause, RotateCcw, Waves, ArrowRight, ArrowLeft, Repeat } from 'lucide-react';

interface ParameterSliderProps {
  parameter: Parameter;
  onChange: (value: number) => void;
  onConfigChange?: (functionId: string, paramName: string, field: 'min' | 'max' | 'step', value: number) => void;
  functionId?: string;
  linkedInfo?: LinkedParameterInfo;
  animation?: ParameterAnimation;
  onAnimationChange?: (animation: ParameterAnimation) => void;
}

export const ParameterSlider: FC<ParameterSliderProps> = ({
  parameter,
  onChange,
  onConfigChange,
  functionId,
  linkedInfo,
  animation,
  onAnimationChange,
}) => {
  const rafRef = useRef<number | null>(null);
  const pendingValueRef = useRef<number>(parameter.currentValue);
  const [showConfig, setShowConfig] = useState(false);
  const setSliderActive = useAppStore((state) => state.setSliderActive);

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const periodRef = useRef<number>(2);
  const [period, setPeriod] = useState(2);
  const [periodInput, setPeriodInput] = useState('2');
  const [animationMode, setAnimationMode] = useState<AnimationMode>(animation?.mode || 'none');
  const [animationDirection, setAnimationDirection] = useState<AnimationDirection>(animation?.direction || 'forward');

  // Refs for latest values (avoid stale closures in RAF)
  const onChangeRef = useRef(onChange);
  const paramRef = useRef({ min: parameter.min, max: parameter.max, step: parameter.step });
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    paramRef.current = { min: parameter.min, max: parameter.max, step: parameter.step };
  }, [parameter.min, parameter.max, parameter.step]);

  // Animation loop driven by useEffect (always reads latest refs)
  useEffect(() => {
    if (!isPlaying) return;

    startTimeRef.current = performance.now();
    const animate = (now: number) => {
      if (!isPlayingRef.current) return;
      const elapsed = (now - startTimeRef.current) / 1000;
      const periodVal = periodRef.current;
      const { min, max, step } = paramRef.current;
      const phase = (elapsed / periodVal) % 1;

      // 根据动画模式计算进度
      let progress: number;
      switch (animationMode) {
        case 'sine':
          progress = (Math.sin(2 * Math.PI * phase) + 1) / 2;
          break;
        case 'once':
          progress = Math.min(phase, 1);
          break;
        case 'linear':
        default:
          progress = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
          break;
      }

      // 应用方向
      if (animationDirection === 'backward') {
        progress = 1 - progress;
      } else if (animationDirection === 'alternate') {
        progress = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      }

      let value = min + progress * (max - min);
      if (step > 0) {
        value = Math.round(value / step) * step;
      }
      value = Math.max(min, Math.min(max, value));
      onChangeRef.current(value);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, animationMode, animationDirection]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    pendingValueRef.current = value;

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        onChange(pendingValueRef.current);
        rafRef.current = null;
      });
    }
  }, [onChange]);

  const stopAnimation = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setSliderActive(false);
    if (onAnimationChange) {
      onAnimationChange({
        mode: animationMode,
        direction: animationDirection,
        speed: 1,
        offset: 0,
        isPlaying: false,
      });
    }
  }, [setSliderActive, onAnimationChange, animationMode, animationDirection]);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      stopAnimation();
    } else {
      isPlayingRef.current = true;
      setIsPlaying(true);
      setSliderActive(true);
      if (onAnimationChange) {
        onAnimationChange({
          mode: animationMode,
          direction: animationDirection,
          speed: 1,
          offset: 0,
          isPlaying: true,
        });
      }
    }
  }, [setSliderActive, stopAnimation, onAnimationChange, animationMode, animationDirection]);

  const handleMouseDown = useCallback(() => {
    if (isPlayingRef.current) {
      stopAnimation();
    }
    setSliderActive(true);
  }, [setSliderActive, stopAnimation]);

  const handleMouseUp = useCallback(() => {
    setSliderActive(false);
  }, [setSliderActive]);

  const handlePeriodChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPeriodInput(raw);
    const val = parseFloat(raw);
    if (!isNaN(val) && val >= 0.5 && val <= 30) {
      periodRef.current = val;
      setPeriod(val);
    }
  }, []);

  useEffect(() => {
    const handleGlobalUp = () => {
      // 动画播放中不关闭，让 self-loop 持续触发 canvas 重绘
      if (!isPlayingRef.current) {
        setSliderActive(false);
      }
    };
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

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= parameter.min && value <= parameter.max) {
      onChange(value);
    }
  }, [onChange, parameter.min, parameter.max]);

  const handleConfigChange = useCallback((field: 'min' | 'max' | 'step', e: ChangeEvent<HTMLInputElement>) => {
    if (!onConfigChange || !functionId) return;
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onConfigChange(functionId, parameter.name, field, value);
    }
  }, [onConfigChange, functionId, parameter.name]);

  const canAnimate = parameter.min !== parameter.max;

  // 动画模式图标
  const getModeIcon = (mode: AnimationMode) => {
    switch (mode) {
      case 'sine': return <Waves className="w-3 h-3" />;
      case 'linear': return <Repeat className="w-3 h-3" />;
      case 'once': return <ArrowRight className="w-3 h-3" />;
      default: return null;
    }
  };

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
            title="配置参数范围和动画"
          >
            <Settings className="w-3 h-3" />
          </button>
          {canAnimate && (
            <button
              onClick={togglePlay}
              className={`p-0.5 rounded transition-colors ${
                isPlaying
                  ? 'text-cyan-400 hover:text-cyan-300'
                  : 'text-[#475569] hover:text-[#94A3B8]'
              }`}
              title={isPlaying ? '停止动画' : '播放动画'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          )}
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
        <div className="flex flex-col gap-2 mb-2 p-2 panel-subtle text-xs">
          {/* 参数范围配置 */}
          <div className="flex items-center gap-2">
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

          {/* 动画配置 */}
          {canAnimate && (
            <div className="flex items-center gap-2 border-t border-white/[0.05] pt-2">
              <span className="text-[#475569]">动画:</span>

              {/* 动画模式选择 */}
              <div className="flex items-center gap-1">
                {(['none', 'sine', 'linear', 'once'] as AnimationMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAnimationMode(mode)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      animationMode === mode
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-[#64748B] hover:text-[#94A3B8] border border-transparent'
                    }`}
                    title={
                      mode === 'sine' ? '正弦波' :
                      mode === 'linear' ? '线性循环' :
                      mode === 'once' ? '单次变化' : '无动画'
                    }
                  >
                    {getModeIcon(mode)}
                    <span className="ml-0.5">
                      {mode === 'sine' ? '正弦' :
                       mode === 'linear' ? '循环' :
                       mode === 'once' ? '单次' : '无'}
                    </span>
                  </button>
                ))}
              </div>

              {/* 方向选择 */}
              {animationMode !== 'none' && (
                <div className="flex items-center gap-1">
                  {(['forward', 'backward', 'alternate'] as AnimationDirection[]).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setAnimationDirection(dir)}
                      className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                        animationDirection === dir
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'text-[#64748B] hover:text-[#94A3B8]'
                      }`}
                      title={
                        dir === 'forward' ? '正向' :
                        dir === 'backward' ? '反向' : '交替'
                      }
                    >
                      {dir === 'forward' ? <ArrowRight className="w-3 h-3" /> :
                       dir === 'backward' ? <ArrowLeft className="w-3 h-3" /> :
                       <RotateCcw className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}

              {/* 周期设置 */}
              {animationMode !== 'none' && (
                <label className="flex items-center gap-1 text-[#64748B]">
                  <span>周期:</span>
                  <input
                    type="number"
                    value={periodInput}
                    onChange={handlePeriodChange}
                    onBlur={() => setPeriodInput(String(period))}
                    className="w-12 px-1 py-0.5 input-base text-xs"
                    step="0.5"
                    min="0.5"
                    max="30"
                  />
                  <span className="text-[#475569]">秒</span>
                </label>
              )}
            </div>
          )}
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
          className={`flex-1 ${isPlaying ? 'animating-slider' : ''}`}
        />
        <span className="text-[11px] text-[#475569] w-8 font-mono">{parameter.max}</span>
      </div>
    </div>
  );
};
