// src/lib/polarParser.ts
import type { PolarFunction } from '../types';
import { extractParameters, createDefaultParams } from './paramParser';
import {
  math,
  collectSymbols,
  validateFunctions,
  preprocessExpression,
  safeEvaluate,
  testEvaluation,
} from './parserUtils';
import { LRUCache, floatMatch } from './cacheUtils';

// 极坐标解析允许的额外变量
interface PolarSampleCache {
  thetaMin: number;
  thetaMax: number;
  steps: number;
  params?: Record<string, number>;
  points: { x: number; y: number; r: number; theta: number }[];
  timestamp: number;
}

const polarCache = new LRUCache<string, PolarSampleCache>(30);

/**
 * 解析极坐标函数表达式
 * 支持形式：
 *   - sin(3*x)  ← 推荐，x 代表角度变量
 *   - sin(3*t)  ← t 也支持
 *   - sin(3*theta) 或 sin(3θ)  ← 原始形式
 *   - r = sin(3*x)  (可省略 r =)
 */
export function parsePolarExpression(
  expression: string,
  maxParams: number = 3
): PolarFunction | Error {
  try {
    let cleaned = preprocessExpression(expression);

    // 替换 θ/theta/t 为 x
    cleaned = cleaned.replace(/[θΘ]/g, 'x');
    cleaned = cleaned.replace(/\btheta\b/gi, 'x');
    cleaned = cleaned.replace(/\bt\b/g, 'x');

    // 处理 r = 前缀
    if (cleaned.toLowerCase().startsWith('r=') || cleaned.toLowerCase().startsWith('r =')) {
      cleaned = cleaned.replace(/^r\s*=\s*/i, '');
    }

    if (!cleaned) return new Error('表达式不能为空');

    let node;
    try {
      node = math.parse(cleaned);
    } catch (e) {
      return new Error(`语法错误: ${(e as Error).message}`);
    }

    const { functions: usedFunctions, variables: usedVariables } = collectSymbols(node);

    const fnError = validateFunctions(usedFunctions);
    if (fnError) return fnError;

    // 提取参数（排除 x，x 是角度变量）
    const variablesArray = Array.from(usedVariables).filter(v => v !== 'x');
    const parameters = extractParameters(variablesArray, maxParams);
    const defaultParams = createDefaultParams(parameters);

    const compiled = node.compile();
    const safeEval = (theta: number, params: Record<string, number> = {}): number =>
      safeEvaluate(compiled, { x: theta, ...defaultParams, ...params });

    const evalError = testEvaluation(() => {
      safeEval(0, defaultParams);
      safeEval(Math.PI, defaultParams);
      safeEval(Math.PI / 2, defaultParams);
    });
    if (evalError) return evalError;

    return {
      id: '',
      expression: expression.trim(),
      compiled: safeEval,
      color: '',
      visible: true,
      parameters,
      thetaMin: 0,
      thetaMax: 2 * Math.PI,
      thetaSteps: 200,
      stepsPerRadian: 32,
    };
  } catch (e) {
    return new Error(`解析错误: ${(e as Error).message}`);
  }
}

/**
 * 极坐标转笛卡尔坐标
 */
export function polarToCartesian(r: number, theta: number): { x: number; y: number } {
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
}

/**
 * 采样极坐标函数，返回笛卡尔坐标点
 * 自适应采样：根据弧长变化率分配采样密度
 */
export function samplePolarFunction(
  fn: (theta: number, params?: Record<string, number>) => number,
  params: Record<string, number>,
  thetaMin: number = 0,
  thetaMax: number = 2 * Math.PI,
  baseSteps: number = 200
): { x: number; y: number; r: number; theta: number }[] {
  // 第一遍：粗采样，估算曲率变化
  const coarseSteps = 40;
  const coarsePoints: { theta: number; r: number; x: number; y: number }[] = [];
  const dThetaCoarse = (thetaMax - thetaMin) / coarseSteps;

  for (let i = 0; i <= coarseSteps; i++) {
    const theta = thetaMin + i * dThetaCoarse;
    const r = fn(theta, params);
    if (isFinite(r)) {
      const { x, y } = polarToCartesian(r, theta);
      coarsePoints.push({ theta, r, x, y });
    }
  }

  // 计算每个区间的权重
  const intervals: { thetaStart: number; thetaEnd: number; weight: number }[] = [];
  for (let i = 0; i < coarsePoints.length - 1; i++) {
    const p0 = coarsePoints[i];
    const p1 = coarsePoints[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const arcLength = Math.sqrt(dx * dx + dy * dy);
    const weight = Math.min(arcLength * 2, 3);
    intervals.push({ thetaStart: p0.theta, thetaEnd: p1.theta, weight: Math.max(0.3, weight) });
  }

  // 第二遍：根据权重分配采样点
  const points: { x: number; y: number; r: number; theta: number }[] = [];
  let prevTheta = thetaMin;

  for (const interval of intervals) {
    const localSteps = Math.max(3, Math.floor(baseSteps / coarseSteps * interval.weight));
    const dTheta = (interval.thetaEnd - prevTheta) / localSteps;

    for (let j = 0; j < localSteps; j++) {
      const theta = prevTheta + j * dTheta;
      const r = fn(theta, params);
      if (isFinite(r)) {
        const { x, y } = polarToCartesian(r, theta);
        points.push({ x, y, r, theta });
      } else {
        points.push({ x: NaN, y: NaN, r: NaN, theta });
      }
    }
    prevTheta = interval.thetaEnd;
  }

  // 最后一个点
  const lastR = fn(thetaMax, params);
  if (isFinite(lastR)) {
    const { x, y } = polarToCartesian(lastR, thetaMax);
    points.push({ x, y, r: lastR, theta: thetaMax });
  }

  return points;
}

/**
 * 快速均匀采样（用于 GPU 模式或简单曲线）
 */
export function samplePolarFunctionFast(
  fn: (theta: number, params?: Record<string, number>) => number,
  params: Record<string, number>,
  thetaMin: number = 0,
  thetaMax: number = 2 * Math.PI,
  steps: number = 120
): { x: number; y: number; r: number; theta: number }[] {
  const points: { x: number; y: number; r: number; theta: number }[] = [];
  const dTheta = (thetaMax - thetaMin) / steps;

  for (let i = 0; i <= steps; i++) {
    const theta = thetaMin + i * dTheta;
    const r = fn(theta, params);
    if (isFinite(r)) {
      const { x, y } = polarToCartesian(r, theta);
      points.push({ x, y, r, theta });
    } else {
      points.push({ x: NaN, y: NaN, r: NaN, theta });
    }
  }

  return points;
}

/**
 * 带缓存的极坐标采样
 */
export function cachedSamplePolar(
  fn: (theta: number, params?: Record<string, number>) => number,
  cacheId: string,
  params: Record<string, number>,
  thetaMin: number = 0,
  thetaMax: number = 2 * Math.PI,
  steps: number = 200
): { x: number; y: number; r: number; theta: number }[] {
  const cached = polarCache.get(cacheId);
  if (cached) {
    const tolerance = 1e-9;
    if (
      floatMatch(cached.thetaMin, thetaMin, tolerance) &&
      floatMatch(cached.thetaMax, thetaMax, tolerance) &&
      cached.steps === steps &&
      paramsMatch(cached.params, params, tolerance)
    ) {
      return cached.points;
    }
  }

  const points = samplePolarFunction(fn, params, thetaMin, thetaMax, steps);
  polarCache.set(cacheId, { thetaMin, thetaMax, steps, params, points, timestamp: Date.now() });
  return points;
}

function paramsMatch(
  a?: Record<string, number>,
  b?: Record<string, number>,
  tolerance: number = 1e-9
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key, i) => {
    if (keysB[i] !== key) return false;
    return floatMatch(a[key], b[key], tolerance);
  });
}

export function clearPolarCache(_cacheId?: string): void {
  polarCache.clear();
}