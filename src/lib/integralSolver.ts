// src/lib/integralSolver.ts
// 数值积分（Simpson's rule）

export function simpsonIntegral(
  fn: (x: number) => number,
  a: number,
  b: number,
  n: number = 1000,
): number {
  if (a === b) return 0;
  if (n % 2 !== 0) n++;
  const h = (b - a) / n;
  let sum = fn(a) + fn(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    const y = fn(x);
    sum += (i % 2 === 0 ? 2 : 4) * (isFinite(y) ? y : 0);
  }
  return (h / 3) * sum;
}

// 批量计算不定积分 F(x) = ∫_{basePoint}^{x} f(t) dt
// 使用累积梯形法，O(n) 复杂度而非逐点 O(n*m)
export function batchAntiderivative(
  fn: (x: number) => number,
  xValues: Float64Array,
  basePoint: number = 0,
): Float64Array {
  const n = xValues.length;
  const result = new Float64Array(n);
  if (n === 0) return result;

  // 找到 basePoint 的插入位置
  let baseIdx = 0;
  for (let i = 0; i < n; i++) {
    if (xValues[i] >= basePoint) { baseIdx = i; break; }
    if (i === n - 1) baseIdx = n;
  }

  // 从 basePoint 向右累积
  let integral = 0;
  let prevX = basePoint;
  let prevY = fn(basePoint);
  for (let i = baseIdx; i < n; i++) {
    const x = xValues[i];
    const y = fn(x);
    if (isFinite(y) && isFinite(prevY)) {
      integral += (prevY + y) * (x - prevX) / 2;
    }
    result[i] = integral;
    prevX = x;
    prevY = y;
  }

  // 从 basePoint 向左累积
  integral = 0;
  prevX = basePoint;
  prevY = fn(basePoint);
  for (let i = baseIdx - 1; i >= 0; i--) {
    const x = xValues[i];
    const y = fn(x);
    if (isFinite(y) && isFinite(prevY)) {
      integral -= (y + prevY) * (prevX - x) / 2;
    }
    result[i] = integral;
    prevX = x;
    prevY = y;
  }

  return result;
}

// 数值不定积分：返回原函数 F(x)，使得 F'(x) = fn(x)
// 用于精确计算单个点（如 UI 显示积分值）
export function numericalAntiderivative(
  fn: (x: number) => number,
  basePoint: number = 0,
): (x: number) => number {
  return (x: number) => simpsonIntegral(fn, basePoint, x);
}
