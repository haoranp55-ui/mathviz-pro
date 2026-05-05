// src/lib/equationSolver.ts
import type { SolverConfig, Solution } from '../types';
import {
  computeJacobian,
  computeDerivativeAdaptive,
  solveLinearSystem,
  vectorNorm,
  vectorSubtract,
  vectorAdd,
  matrixVectorMultiply,
} from './jacobian';

/**
 * 单变量方程求解 - 二分法
 * @param fn 目标函数 f(x) = 0
 * @param a 区间左端点
 * @param b 区间右端点
 * @param config 求解配置
 * @returns 解，如果找不到则返回 null
 */
export function bisection(
  fn: (x: number) => number,
  a: number,
  b: number,
  config: Partial<SolverConfig> = {}
): number | null {
  const tolerance = config.tolerance ?? 1e-10;
  const maxIterations = config.maxIterations ?? 100;

  let left = a;
  let right = b;

  let fLeft = fn(left);
  let fRight = fn(right);

  // 检查端点是否已经是解
  if (Math.abs(fLeft) < tolerance) return left;
  if (Math.abs(fRight) < tolerance) return right;

  // 检查是否有解（异号）
  if (fLeft * fRight > 0) {
    return null;
  }

  for (let i = 0; i < maxIterations; i++) {
    const mid = (left + right) / 2;
    const fMid = fn(mid);

    if (Math.abs(fMid) < tolerance) {
      return mid;
    }

    if (fLeft * fMid < 0) {
      right = mid;
      fRight = fMid;
    } else {
      left = mid;
      fLeft = fMid;
    }

    // 收敛检查
    if (Math.abs(right - left) < tolerance) {
      return mid;
    }
  }

  return (left + right) / 2;
}

/**
 * 单变量方程求解 - 牛顿法
 * @param fn 目标函数 f(x) = 0
 * @param x0 初始猜测
 * @param config 求解配置
 * @returns 解，如果不收敛则返回 null
 */
export function newton1D(
  fn: (x: number) => number,
  x0: number,
  config: Partial<SolverConfig> = {}
): number | null {
  const tolerance = config.tolerance ?? 1e-10;
  const maxIterations = config.maxIterations ?? 100;

  let x = x0;

  for (let i = 0; i < maxIterations; i++) {
    const fx = fn(x);

    if (Math.abs(fx) < tolerance) {
      return x;
    }

    const dfx = computeDerivativeAdaptive(fn, x);

    if (isNaN(dfx) || Math.abs(dfx) < 1e-15) {
      return null; // 导数为 0 或 NaN
    }

    const xNew = x - fx / dfx;

    if (Math.abs(xNew - x) < tolerance) {
      return xNew;
    }

    x = xNew;
  }

  return null;
}

/**
 * 单变量方程求解 - 寻找区间内所有解
 * @param fn 目标函数
 * @param xMin 搜索下限
 * @param xMax 搜索上限
 * @param config 求解配置
 * @returns 所有实数解
 */
export function findAllRoots1D(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  config: Partial<SolverConfig> = {}
): Solution[] {
  const tolerance = config.tolerance ?? 1e-10;
  const gridDensity = config.gridDensity ?? 20;
  const solutions: Solution[] = [];

  // 网格搜索
  const step = (xMax - xMin) / gridDensity;
  const intervals: [number, number][] = [];

  let prevX = xMin;
  let prevF = fn(prevX);

  for (let i = 1; i <= gridDensity; i++) {
    const currX = xMin + i * step;
    const currF = fn(currX);

    // 检查是否跨越零点
    if (prevF * currF < 0 || Math.abs(currF) < tolerance) {
      intervals.push([prevX, currX]);
    }

    prevX = currX;
    prevF = currF;
  }

  // 在每个区间内求解
  for (const [a, b] of intervals) {
    // 先尝试二分法
    let root = bisection(fn, a, b, config);

    // 如果二分法失败，尝试牛顿法
    if (root === null) {
      root = newton1D(fn, (a + b) / 2, config);
    }

    if (root !== null) {
      // 检查是否已存在相近的解
      const isDuplicate = solutions.some(s =>
        Math.abs(s.values[0] - root!) < tolerance * 100
      );

      if (!isDuplicate) {
        const precision = Math.abs(fn(root));
        solutions.push({
          values: [root],
          isReal: true,
          type: precision < 1e-12 ? 'exact' : 'approximate',
          precision,
        });
      }
    }
  }

  return solutions.sort((a, b) => a.values[0] - b.values[0]);
}

/**
 * 多变量方程组求解 - Newton-Raphson 方法
 * @param fns 函数数组 [f1, f2, ..., fn]
 * @param x0 初始猜测 [x1, x2, ..., xn]
 * @param config 求解配置
 * @returns 解向量，如果不收敛则返回 null
 */
export function newtonRaphson(
  fns: ((vars: number[]) => number)[],
  x0: number[],
  config: Partial<SolverConfig> = {}
): number[] | null {
  const tolerance = config.tolerance ?? 1e-10;
  const maxIterations = config.maxIterations ?? 100;

  let x = [...x0];

  for (let iter = 0; iter < maxIterations; iter++) {
    // 计算函数值向量
    const f = fns.map(fn => fn(x));

    // 检查是否已收敛
    const fNorm = vectorNorm(f);
    if (fNorm < tolerance) {
      return x;
    }

    // 计算雅可比矩阵
    const J = computeJacobian(fns, x);

    // 检查雅可比矩阵是否有效
    const hasNaN = J.some(row => row.some(val => isNaN(val)));
    if (hasNaN) {
      return null;
    }

    // 求解 J * delta = -f
    const negF = f.map(fi => -fi);
    const delta = solveLinearSystem(J, negF);

    if (delta === null) {
      return null; // 雅可比矩阵奇异
    }

    // 更新 x
    x = vectorAdd(x, delta);

    // 检查步长是否足够小
    const deltaNorm = vectorNorm(delta);
    if (deltaNorm < tolerance) {
      return x;
    }
  }

  return null;
}

/**
 * 多变量方程组求解 - Broyden 方法（拟牛顿法）
 * 不需要每次迭代都计算雅可比矩阵
 * @param fns 函数数组
 * @param x0 初始猜测
 * @param config 求解配置
 * @returns 解向量，如果不收敛则返回 null
 */
export function broyden(
  fns: ((vars: number[]) => number)[],
  x0: number[],
  config: Partial<SolverConfig> = {}
): number[] | null {
  const tolerance = config.tolerance ?? 1e-10;
  const maxIterations = config.maxIterations ?? 100;

  const n = fns.length;
  let x = [...x0];

  // 计算初始函数值
  let f = fns.map(fn => fn(x));

  // 检查初始点是否已是解
  if (vectorNorm(f) < tolerance) {
    return x;
  }

  // 计算初始雅可比矩阵的逆近似
  let B = computeJacobian(fns, x);

  // 检查是否有效
  if (B.some(row => row.some(val => isNaN(val)))) {
    return null;
  }

  // 使用单位矩阵作为初始逆雅可比近似
  let H: number[][] = [];
  for (let i = 0; i < n; i++) {
    H[i] = [];
    for (let j = 0; j < n; j++) {
      H[i][j] = i === j ? 1 : 0;
    }
  }

  // 简化版：直接使用牛顿法的雅可比更新
  for (let iter = 0; iter < maxIterations; iter++) {
    // 计算搜索方向: d = -H * f
    const d = matrixVectorMultiply(H, f.map(fi => -fi));

    // 线搜索（简化版：固定步长）
    let alpha = 1;
    let xNew = vectorAdd(x, d.map(di => di * alpha));
    let fNew = fns.map(fn => fn(xNew));

    // 回溯线搜索
    for (let bt = 0; bt < 10; bt++) {
      if (vectorNorm(fNew) < vectorNorm(f)) {
        break;
      }
      alpha *= 0.5;
      xNew = vectorAdd(x, d.map(di => di * alpha));
      fNew = fns.map(fn => fn(xNew));
    }

    // 更新 H（Broyden 更新公式）
    const deltaX = vectorSubtract(xNew, x);
    const deltaF = vectorSubtract(fNew, f);

    const deltaXNorm = vectorNorm(deltaX);
    if (deltaXNorm < tolerance) {
      return xNew;
    }

    // 简化的 Broyden 更新
    // H_new = H + (deltaX - H*deltaF) * deltaX^T / (deltaX^T * H * deltaF)
    const HdeltaF = matrixVectorMultiply(H, deltaF);
    const denominator = deltaX.reduce((sum, dxi, i) => sum + dxi * HdeltaF[i], 0);

    if (Math.abs(denominator) > 1e-15) {
      const factor = 1 / denominator;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          H[i][j] += (deltaX[i] - HdeltaF[i]) * deltaX[j] * factor;
        }
      }
    }

    x = xNew;
    f = fNew;

    // 收敛检查
    if (vectorNorm(f) < tolerance) {
      return x;
    }
  }

  return null;
}

/**
 * 多起点搜索 - 寻找方程组的所有解
 * @param fns 函数数组
 * @param ranges 各变量的搜索范围
 * @param config 求解配置
 * @returns 所有解
 */
export function findAllSolutions(
  fns: ((vars: number[]) => number)[],
  ranges: { min: number; max: number }[],
  config: Partial<SolverConfig> = {}
): Solution[] {
  const tolerance = config.tolerance ?? 1e-10;
  const gridDensity = config.gridDensity ?? 5;
  const solutions: Solution[] = [];

  const n = fns.length;
  if (n === 0) return [];

  // 生成网格起点
  const generateGridPoints = (): number[][] => {
    if (n === 1) {
      const points: number[][] = [];
      const step = (ranges[0].max - ranges[0].min) / gridDensity;
      for (let i = 0; i <= gridDensity; i++) {
        points.push([ranges[0].min + i * step]);
      }
      return points;
    }

    // 多维网格
    const points: number[][] = [];
    const steps = ranges.map(r => (r.max - r.min) / gridDensity);

    const generateRecursive = (current: number[], dim: number) => {
      if (dim === n) {
        points.push([...current]);
        return;
      }
      for (let i = 0; i <= gridDensity; i++) {
        current[dim] = ranges[dim].min + i * steps[dim];
        generateRecursive(current, dim + 1);
      }
    };

    generateRecursive([], 0);
    return points;
  };

  const startPoints = generateGridPoints();

  // 从每个起点尝试求解
  for (const x0 of startPoints) {
    // 先尝试牛顿法
    let solution = newtonRaphson(fns, x0, config);

    // 如果牛顿法失败，尝试 Broyden 方法
    if (solution === null) {
      solution = broyden(fns, x0, config);
    }

    if (solution !== null) {
      // 检查解是否在搜索范围内
      const inRange = solution.every((val, i) =>
        val >= ranges[i].min - 1 && val <= ranges[i].max + 1
      );

      if (!inRange) continue;

      // 检查是否已存在相近的解
      const isDuplicate = solutions.some(s => {
        const dist = Math.sqrt(
          s.values.reduce((sum, v, i) => sum + (v - solution![i]) ** 2, 0)
        );
        return dist < tolerance * 1000;
      });

      if (!isDuplicate) {
        // 计算精度
        const fVals = fns.map(fn => fn(solution!));
        const precision = vectorNorm(fVals);

        solutions.push({
          values: solution,
          isReal: true,
          type: precision < 1e-12 ? 'exact' : 'approximate',
          precision,
        });
      }
    }
  }

  return solutions;
}

/**
 * 统一求解接口
 * @param fns 函数数组
 * @param ranges 搜索范围
 * @param config 求解配置
 * @returns 所有解
 */
export function solveEquationSystem(
  fns: ((vars: number[]) => number)[],
  ranges: { min: number; max: number }[],
  config: Partial<SolverConfig> = {}
): Solution[] {
  const n = fns.length;

  if (n === 1) {
    // 单变量情况
    return findAllRoots1D(
      (x) => fns[0]([x]),
      ranges[0].min,
      ranges[0].max,
      config
    );
  }

  // 多变量情况
  return findAllSolutions(fns, ranges, config);
}
