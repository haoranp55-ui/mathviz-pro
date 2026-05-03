// src/lib/polarParser.ts
import { create, all } from 'mathjs';
import type { MathNode } from 'mathjs';
import type { PolarFunction } from '../types';
import { extractParameters, createDefaultParams, validateParamCount } from './paramParser';

const math = create(all);

// 极坐标采样缓存
interface PolarSampleCache {
  thetaMin: number;
  thetaMax: number;
  steps: number;
  params?: Record<string, number>;
  points: { x: number; y: number; r: number; theta: number }[];
  timestamp: number;
}

class PolarCacheManager {
  private cache = new Map<string, PolarSampleCache>();
  private maxSize = 30;

  get(
    cacheId: string,
    thetaMin: number,
    thetaMax: number,
    steps: number,
    params?: Record<string, number>
  ): { x: number; y: number; r: number; theta: number }[] | null {
    const cached = this.cache.get(cacheId);
    if (!cached) return null;

    const tolerance = 1e-9;
    if (
      Math.abs(cached.thetaMin - thetaMin) < tolerance &&
      Math.abs(cached.thetaMax - thetaMax) < tolerance &&
      cached.steps === steps
    ) {
      if (this.paramsMatch(cached.params, params, tolerance)) {
        cached.timestamp = Date.now();
        return cached.points;
      }
    }

    return null;
  }

  set(
    cacheId: string,
    thetaMin: number,
    thetaMax: number,
    steps: number,
    points: { x: number; y: number; r: number; theta: number }[],
    params?: Record<string, number>
  ): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(cacheId, {
      thetaMin,
      thetaMax,
      steps,
      params,
      points,
      timestamp: Date.now(),
    });
  }

  private paramsMatch(
    a?: Record<string, number>,
    b?: Record<string, number>,
    tolerance: number = 1e-9
  ): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!(key in b)) return false;
      if (Math.abs(a[key] - b[key]) > tolerance) return false;
    }
    return true;
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Infinity;

    for (const [key, value] of this.cache) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear(cacheId: string): void {
    this.cache.delete(cacheId);
  }
}

const polarCache = new PolarCacheManager();

// 允许的函数
const ALLOWED_FUNCTIONS = [
  // 三角函数
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'cot', 'sec', 'csc',
  'sinh', 'cosh', 'tanh',
  'coth', 'sech', 'csch',
  'asinh', 'acosh', 'atanh',
  'acot', 'acoth', 'asec', 'asech', 'acsc', 'acsch',
  'atan2',

  // 指数对数
  'exp', 'log', 'ln', 'log10', 'log2',
  'expm1', 'log1p',
  'sqrt', 'cbrt', 'nthRoot',
  'pow', 'cube', 'square',

  // 取整/符号
  'abs', 'floor', 'ceil', 'round', 'sign', 'fix',

  // 组合/排列/阶乘
  'factorial', 'combinations', 'permutations',

  // 特殊函数
  'gamma', 'erf',

  // 其他
  'hypot', 'gcd', 'lcm', 'mod',
];

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
    // 预处理
    let cleaned = expression.trim();

    // 替换 ln 为 log
    cleaned = cleaned.replace(/\bln\b/g, 'log');

    // 替换 θ 为 x
    cleaned = cleaned.replace(/θ/g, 'x');

    // 替换 theta 为 x
    cleaned = cleaned.replace(/\btheta\b/gi, 'x');

    // 替换 t 为 x（如果 t 是独立变量）
    cleaned = cleaned.replace(/\bt\b/g, 'x');

    // 处理 r = 前缀
    if (cleaned.toLowerCase().startsWith('r=') || cleaned.toLowerCase().startsWith('r =')) {
      cleaned = cleaned.replace(/^r\s*=\s*/i, '');
    }

    if (!cleaned) {
      return new Error('表达式不能为空');
    }

    // 解析表达式
    let node: MathNode;
    try {
      node = math.parse(cleaned);
    } catch (e) {
      return new Error(`语法错误: ${(e as Error).message}`);
    }

    // 收集使用的函数和变量
    const usedFunctions = new Set<string>();
    const usedVariables = new Set<string>();

    node.traverse((n: MathNode) => {
      if (n.type === 'FunctionNode') {
        const fn = (n as any).fn;
        if (typeof fn === 'string') {
          usedFunctions.add(fn);
        } else if (fn?.name) {
          usedFunctions.add(fn.name);
        }
      }
      if (n.type === 'SymbolNode') {
        usedVariables.add((n as any).name);
      }
    });

    // 检查函数是否允许
    for (const fn of usedFunctions) {
      if (!ALLOWED_FUNCTIONS.includes(fn)) {
        return new Error(`不支持的函数: ${fn}`);
      }
    }

    // 提取参数（排除 x，x 是角度变量）
    const variablesArray = Array.from(usedVariables).filter(v => v !== 'x');
    const validation = validateParamCount(variablesArray, maxParams);

    if (!validation.valid) {
      return new Error(
        `参数过多: 最多支持 ${maxParams} 个参数，当前检测到 ${validation.paramCount} 个（${validation.excessParams.join(', ')}）`
      );
    }

    const parameters = extractParameters(variablesArray, maxParams);

    // 编译为可执行函数
    const compiled = node.compile();

    // 创建带参数的求值函数（x 作为角度变量）
    const safeEval = (theta: number, params: Record<string, number> = {}): number => {
      try {
        const result = compiled.evaluate({ x: theta, ...params });
        if (typeof result !== 'number' || !isFinite(result)) {
          return NaN;
        }
        return result;
      } catch {
        return NaN;
      }
    };

    // 测试求值
    const defaultParams = createDefaultParams(parameters);
    try {
      safeEval(0, defaultParams);
      safeEval(Math.PI, defaultParams);
      safeEval(Math.PI / 2, defaultParams);
    } catch (e) {
      return new Error(`求值错误: ${(e as Error).message}`);
    }

    return {
      id: '',
      expression: cleaned,
      compiled: safeEval,
      color: '',
      visible: true,
      parameters,
      thetaMin: 0,
      thetaMax: 2 * Math.PI,
      thetaSteps: 200,  // 优化：减少默认采样点
    };

  } catch (e) {
    return new Error(`解析错误: ${(e as Error).message}`);
  }
}

/**
 * 极坐标转笛卡尔坐标
 * @param r 极径
 * @param theta 极角（弧度）
 * @returns {x, y} 笛卡尔坐标
 */
export function polarToCartesian(r: number, theta: number): { x: number; y: number } {
  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta),
  };
}

/**
 * 采样极坐标函数，返回笛卡尔坐标点
 * 优化：自适应采样 + GPU 友好数据结构
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

  // 计算每个区间的曲率（用弧长变化率估算）
  const intervals: { thetaStart: number; thetaEnd: number; weight: number }[] = [];

  for (let i = 0; i < coarsePoints.length - 1; i++) {
    const p0 = coarsePoints[i];
    const p1 = coarsePoints[i + 1];

    // 弧长估算：考虑 r 的变化和位置变化
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const arcLength = Math.sqrt(dx * dx + dy * dy);

    // 归一化权重：弧长越大，需要越多采样点
    // 限制最大权重避免过度采样
    const weight = Math.min(arcLength * 2, 3);
    intervals.push({
      thetaStart: p0.theta,
      thetaEnd: p1.theta,
      weight: Math.max(0.3, weight)  // 最小 0.3，避免空白
    });
  }

  // 第二遍：根据权重分配采样点
  const points: { x: number; y: number; r: number; theta: number }[] = [];
  let prevTheta = thetaMin;

  for (const interval of intervals) {
    // 根据权重计算该区间的采样数
    const localSteps = Math.max(3, Math.floor(baseSteps / coarseSteps * interval.weight));
    const dTheta = (interval.thetaEnd - prevTheta) / localSteps;

    for (let j = 0; j < localSteps; j++) {
      const theta = prevTheta + j * dTheta;
      const r = fn(theta, params);

      if (isFinite(r)) {
        const { x, y } = polarToCartesian(r, theta);
        points.push({ x, y, r, theta });
      } else {
        // 插入断点标记
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
 * 带缓存的极坐标采样（用于参数滑钮频繁更新场景）
 */
export function cachedSamplePolar(
  fn: (theta: number, params?: Record<string, number>) => number,
  cacheId: string,
  params: Record<string, number>,
  thetaMin: number = 0,
  thetaMax: number = 2 * Math.PI,
  steps: number = 200
): { x: number; y: number; r: number; theta: number }[] {
  // 尝试从缓存获取
  const cached = polarCache.get(cacheId, thetaMin, thetaMax, steps, params);
  if (cached) {
    return cached;
  }

  // 未命中缓存，执行采样
  const points = samplePolarFunction(fn, params, thetaMin, thetaMax, steps);

  // 存入缓存
  polarCache.set(cacheId, thetaMin, thetaMax, steps, points, params);

  return points;
}

/**
 * 清除指定函数的极坐标采样缓存
 */
export function clearPolarCache(cacheId: string): void {
  polarCache.clear(cacheId);
}
