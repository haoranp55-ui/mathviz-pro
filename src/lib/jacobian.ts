// src/lib/jacobian.ts

/**
 * 数值计算雅可比矩阵
 * J[i][j] = ∂f_i / ∂x_j
 *
 * 使用中心差分法:
 * ∂f/∂x ≈ (f(x+h) - f(x-h)) / (2h)
 */

/**
 * 计算雅可比矩阵
 * @param fns 函数数组，每个函数接受变量数组，返回函数值
 * @param point 当前点 [x, y, z, ...]
 * @param h 差分步长，默认 1e-8
 * @returns 雅可比矩阵 J[i][j] = ∂f_i/∂x_j
 */
export function computeJacobian(
  fns: ((vars: number[]) => number)[],
  point: number[],
  h: number = 1e-8
): number[][] {
  const n = fns.length;        // 函数数量
  const m = point.length;      // 变量数量
  const jacobian: number[][] = [];

  for (let i = 0; i < n; i++) {
    jacobian[i] = [];
    for (let j = 0; j < m; j++) {
      // 中心差分法
      const pointPlus = [...point];
      const pointMinus = [...point];
      pointPlus[j] += h;
      pointMinus[j] -= h;

      const fPlus = fns[i](pointPlus);
      const fMinus = fns[i](pointMinus);

      // 处理 NaN 情况
      if (isNaN(fPlus) || isNaN(fMinus)) {
        jacobian[i][j] = NaN;
      } else {
        jacobian[i][j] = (fPlus - fMinus) / (2 * h);
      }
    }
  }

  return jacobian;
}

/**
 * 计算雅可比矩阵（单变量优化版）
 * @param fn 单变量函数
 * @param x 当前点
 * @param h 差分步长
 * @returns 导数值
 */
export function computeDerivative(
  fn: (x: number) => number,
  x: number,
  h: number = 1e-8
): number {
  const fPlus = fn(x + h);
  const fMinus = fn(x - h);

  if (isNaN(fPlus) || isNaN(fMinus)) {
    return NaN;
  }

  return (fPlus - fMinus) / (2 * h);
}

/**
 * 使用自适应步长计算导数
 * 当函数值变化很小时自动调整步长
 */
export function computeDerivativeAdaptive(
  fn: (x: number) => number,
  x: number,
  initialH: number = 1e-8
): number {
  let h = initialH;
  let deriv = computeDerivative(fn, x, h);

  // 如果导数为 NaN 或 0，尝试调整步长
  for (let i = 0; i < 5; i++) {
    if (!isNaN(deriv) && Math.abs(deriv) > 1e-15) {
      break;
    }
    h *= 10;
    deriv = computeDerivative(fn, x, h);
  }

  return deriv;
}

/**
 * 求解线性方程组 J * x = b
 * 使用高斯消元法（带部分主元选取）
 * @param J 系数矩阵
 * @param b 右侧向量
 * @returns 解向量，如果无解或有无穷多解则返回 null
 */
export function solveLinearSystem(
  J: number[][],
  b: number[]
): number[] | null {
  const n = J.length;
  if (n === 0 || b.length !== n) return null;

  // 创建增广矩阵
  const aug: number[][] = J.map((row, i) => [...row, b[i]]);

  // 高斯消元（带部分主元选取）
  for (let col = 0; col < n; col++) {
    // 找主元
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    // 检查主元是否接近 0
    if (maxVal < 1e-15) {
      return null; // 矩阵奇异
    }

    // 交换行
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // 消元
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // 回代
  const x: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = sum / aug[i][i];
  }

  return x;
}

/**
 * 计算矩阵的逆
 * @param matrix 方阵
 * @returns 逆矩阵，如果不可逆则返回 null
 */
export function inverseMatrix(
  matrix: number[][]
): number[][] | null {
  const n = matrix.length;
  if (n === 0) return null;

  // 使用高斯-约旦消元法
  const aug: number[][] = matrix.map(row => [...row]);

  // 添加单位矩阵
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      aug[i].push(i === j ? 1 : 0);
    }
  }

  // 高斯-约旦消元
  for (let col = 0; col < n; col++) {
    // 找主元
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    if (maxVal < 1e-15) {
      return null;
    }

    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // 归一化主元行
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    // 消去其他行
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) {
          aug[row][j] -= factor * aug[col][j];
        }
      }
    }
  }

  // 提取逆矩阵
  const inv: number[][] = [];
  for (let i = 0; i < n; i++) {
    inv[i] = aug[i].slice(n);
  }

  return inv;
}

/**
 * 计算向量的范数
 */
export function vectorNorm(v: number[]): number {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

/**
 * 向量减法
 */
export function vectorSubtract(a: number[], b: number[]): number[] {
  return a.map((x, i) => x - b[i]);
}

/**
 * 向量加法
 */
export function vectorAdd(a: number[], b: number[]): number[] {
  return a.map((x, i) => x + b[i]);
}

/**
 * 矩阵向量乘法
 */
export function matrixVectorMultiply(A: number[][], x: number[]): number[] {
  return A.map(row => row.reduce((sum, a, i) => sum + a * x[i], 0));
}
