// src/lib/derivative.ts

/**
 * 使用中心差分法计算数值导数
 * @param fn 原函数
 * @param x 求导点
 * @param h 步长（默认 1e-5）
 * @returns 导数值
 */
export function numericalDerivative(
  fn: (x: number) => number,
  x: number,
  h: number = 1e-5
): number {
  const yPlus = fn(x + h);
  const yMinus = fn(x - h);

  if (!isFinite(yPlus) || !isFinite(yMinus)) {
    return NaN;
  }

  return (yPlus - yMinus) / (2 * h);
}

/**
 * 创建导数函数
 * @param fn 原函数
 * @param h 步长
 * @returns 导数函数
 */
export function createDerivativeFunction(
  fn: (x: number) => number,
  h: number = 1e-5
): (x: number) => number {
  return (x: number) => numericalDerivative(fn, x, h);
}

/**
 * 创建二阶导数函数
 * @param fn 原函数
 * @param h 步长
 * @returns 二阶导数函数
 */
export function createSecondDerivativeFunction(
  fn: (x: number) => number,
  h: number = 1e-5
): (x: number) => number {
  return (x: number) => {
    const yPlus = fn(x + h);
    const y = fn(x);
    const yMinus = fn(x - h);

    if (!isFinite(yPlus) || !isFinite(y) || !isFinite(yMinus)) {
      return NaN;
    }

    return (yPlus - 2 * y + yMinus) / (h * h);
  };
}
