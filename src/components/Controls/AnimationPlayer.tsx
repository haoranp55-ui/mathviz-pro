// src/components/Controls/AnimationPlayer.tsx
import { useCallback, useRef, useState, type FC } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const AnimationPlayer: FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const parametricFunctions = useAppStore((state) => state.parametricFunctions);
  const updateParametricParameter = useAppStore((state) => state.updateParametricParameter);
  const setSliderActive = useAppStore((state) => state.setSliderActive);

  // 获取所有可动画的参数
  const animatableParams = parametricFunctions.flatMap((fn) =>
    fn.parameters.map((param) => ({
      functionId: fn.id,
      paramName: param.name,
      min: param.min,
      max: param.max,
      currentValue: param.currentValue,
    }))
  );

  const hasAnimatableParams = animatableParams.length > 0;

  const stopAnimation = useCallback(() => {
    setIsPlaying(false);
    setSliderActive(false);
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [setSliderActive]);

  const startAnimation = useCallback(() => {
    if (!hasAnimatableParams) return;

    setIsPlaying(true);
    setSliderActive(true);
    startTimeRef.current = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const period = 2 / speed; // 2秒周期，可调整
      const phase = (elapsed / period) % 1;

      // 更新所有参数
      animatableParams.forEach((param) => {
        const progress = (Math.sin(2 * Math.PI * phase) + 1) / 2;
        const value = param.min + progress * (param.max - param.min);
        updateParametricParameter(param.functionId, param.paramName, 'currentValue', value);
      });

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [hasAnimatableParams, speed, isPlaying, setSliderActive, updateParametricParameter, animatableParams]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopAnimation();
    } else {
      startAnimation();
    }
  }, [isPlaying, startAnimation, stopAnimation]);

  const resetAnimation = useCallback(() => {
    stopAnimation();
    // 重置所有参数到默认值
    animatableParams.forEach((param) => {
      updateParametricParameter(param.functionId, param.paramName, 'currentValue', (param.min + param.max) / 2);
    });
  }, [stopAnimation, animatableParams, updateParametricParameter]);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0.1 && val <= 10) {
      setSpeed(val);
    }
  }, []);

  if (!hasAnimatableParams) {
    return null;
  }

  return (
    <div className="p-3 border-t border-white/[0.06]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#94A3B8] font-medium">全局动画</span>
        <span className="text-[10px] text-[#475569]">
          {animatableParams.length} 个参数
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* 播放/暂停 */}
        <button
          onClick={togglePlay}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isPlaying
              ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
              : 'bg-white/[0.03] text-[#94A3B8] hover:bg-white/[0.06] hover:text-white'
          }`}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* 重置 */}
        <button
          onClick={resetAnimation}
          className="w-8 h-8 rounded-lg bg-white/[0.03] text-[#94A3B8] hover:bg-white/[0.06] hover:text-white flex items-center justify-center transition-colors"
          title="重置"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* 速度控制 */}
        <div className="flex items-center gap-1 flex-1">
          <span className="text-[10px] text-[#475569]">速度</span>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={speed}
            onChange={handleSpeedChange}
            className="flex-1"
          />
          <span className="text-[10px] text-[#475569] w-8 text-right">{speed.toFixed(1)}x</span>
        </div>
      </div>

      {/* 参数列表 */}
      <div className="mt-2 space-y-1">
        {animatableParams.map((param) => (
          <div
            key={`${param.functionId}-${param.paramName}`}
            className="flex items-center justify-between text-[10px] text-[#64748B]"
          >
            <span className="font-mono">{param.paramName}</span>
            <span className="font-mono">
              {param.currentValue.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
