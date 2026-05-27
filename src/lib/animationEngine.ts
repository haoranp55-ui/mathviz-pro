/**
 * 参数动画引擎
 *
 * 支持多种动画模式：
 * - sine: 正弦波循环 (min ↔ max)
 * - linear: 线性循环 (min → max → min)
 * - once: 单次变化 (min → max，或 max → min)
 * - none: 无动画
 *
 * 动画公式（t 为归一化时间 [0, 1]）：
 * - sine: value = min + (max - min) * (sin(2π * t + phase) + 1) / 2
 * - linear: value = min + (max - min) * t
 * - once: value = min + (max - min) * t (t 从 0 到 1 后停止)
 */

import type { AnimationMode, AnimationDirection, ParameterAnimation } from '../types';

/**
 * 计算动画值
 * @param mode 动画模式
 * @param direction 动画方向
 * @param min 最小值
 * @param max 最大值
 * @param t 归一化时间 [0, 1]
 * @param offset 相位偏移 [0, 1]
 * @returns 动画值
 */
export function computeAnimationValue(
  mode: AnimationMode,
  direction: AnimationDirection,
  min: number,
  max: number,
  t: number,
  offset: number = 0
): number {
  if (mode === 'none') return min;

  // 应用相位偏移
  const phaseT = (t + offset) % 1;

  let progress: number;

  switch (mode) {
    case 'sine': {
      // 正弦波: sin(2π * t) 从 -1 到 1，映射到 [0, 1]
      const sineValue = Math.sin(2 * Math.PI * phaseT);
      progress = (sineValue + 1) / 2;
      break;
    }
    case 'linear': {
      // 线性: t 直接映射
      progress = phaseT;
      break;
    }
    case 'once': {
      // 单次: t 从 0 到 1 后保持
      progress = Math.min(phaseT, 1);
      break;
    }
    default:
      progress = phaseT;
  }

  // 应用方向
  if (direction === 'backward') {
    progress = 1 - progress;
  } else if (direction === 'alternate') {
    // 交替: 前半段 forward，后半段 backward
    progress = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
  }

  return min + progress * (max - min);
}

/**
 * 计算动画的当前值
 * @param animation 动画配置
 * @param min 最小值
 * @param max 最大值
 * @param elapsedTime 已过去的时间（秒）
 * @param period 周期（秒）
 * @returns 当前动画值
 */
export function getAnimatedValue(
  animation: ParameterAnimation,
  min: number,
  max: number,
  elapsedTime: number,
  period: number
): number {
  if (animation.mode === 'none' || !animation.isPlaying) {
    return min; // 默认返回最小值
  }

  const t = (elapsedTime * animation.speed) / period;
  return computeAnimationValue(animation.mode, animation.direction, min, max, t, animation.offset);
}

/**
 * 创建动画循环
 * @param callback 每帧回调
 * @returns 停止动画的函数
 */
export function createAnimationLoop(callback: (elapsedTime: number) => void): () => void {
  let startTime = performance.now();
  let animationId: number | null = null;
  let isRunning = false;

  const loop = () => {
    if (!isRunning) return;
    const elapsed = (performance.now() - startTime) / 1000;
    callback(elapsed);
    animationId = requestAnimationFrame(loop);
  };

  const start = () => {
    if (isRunning) return;
    isRunning = true;
    startTime = performance.now();
    loop();
  };

  const stop = () => {
    isRunning = false;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };

  start();
  return stop;
}

/**
 * 动画缓动函数
 */
export const EasingFunctions = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => 1 - (1 - t) * (1 - t),
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  elastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
} as const;

export type EasingFunction = keyof typeof EasingFunctions;
