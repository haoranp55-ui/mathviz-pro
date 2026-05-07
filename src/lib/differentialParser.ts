// src/lib/differentialParser.ts
// 微分方程输入解析器

/**
 * 内置信号函数
 */
export const BUILTIN_FUNCTIONS = [
  { symbol: 't', name: 't', desc: '时间变量' },
  { symbol: 'u(t)', name: 'u(t)', desc: '单位阶跃函数' },
  { symbol: 'δ(t)', name: 'δ(t)', desc: '单位冲激函数' },
  { symbol: 'sin(t)', name: 'sin(t)', desc: '正弦函数' },
  { symbol: 'cos(t)', name: 'cos(t)', desc: '余弦函数' },
  { symbol: 'e^t', name: 'e^t', desc: '指数函数' },
  { symbol: '1', name: '1', desc: '常数' },
];

/**
 * 解析逗号分隔的系数字符串
 * y 系数至少需要两个（表示至少一阶微分方程）
 * x 系数可以只有一个（表示 x(t) 本身）
 */
export function parseCoefficients(input: string, isYCoeffs: boolean = true): number[] | Error {
  const trimmed = input.trim();
  if (!trimmed) return new Error('系数不能为空');

  const parts = trimmed.split(',');
  if (isYCoeffs && parts.length < 2) return new Error('y 系数至少需要两个');
  if (parts.length > 4) return new Error('最多支持三阶导数');

  const coeffs: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    const num = parseFloat(part);
    if (isNaN(num)) return new Error(`第 ${i + 1} 个系数 "${part}" 不是有效数字`);
    coeffs.push(num);
  }

  if (Math.abs(coeffs[0]) < 1e-10) return new Error('最高阶系数不能为 0');
  return coeffs;
}

/**
 * 解析 x(t) 表达式
 */
export function parseXFunction(input: string): string | Error {
  const trimmed = input.trim();
  if (!trimmed) return 't';

  const allowedChars = /^[\d.+\-*/()^a-zδ\s]+$/i;
  if (!allowedChars.test(trimmed)) return new Error('表达式包含非法字符');

  let parenCount = 0;
  for (const char of trimmed) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) return new Error('括号不匹配');
  }
  if (parenCount !== 0) return new Error('括号不匹配');

  return trimmed;
}

/**
 * 初始条件类型
 */
export type InitialConditionType = '0-' | '0+' | 'default';

/**
 * 解析初始条件字符串
 * 格式: "y(0-)=1, y'(0+)=0" 或 "y(0)=1,y'(0)=0"
 * 支持 0- 和 0+ 两种初始时刻
 */
export function parseInitialConditions(input: string, expectedOrder: number): {
  conditions: import('./differentialSolver').InitialCondition[],
  conditionType: InitialConditionType,
  error?: string
} {
  const trimmed = input.trim();
  if (!trimmed) {
    // 没有输入初始条件，返回空数组（只计算 h(t)）
    return { conditions: [], conditionType: 'default' };
  }

  const conditions: import('./differentialSolver').InitialCondition[] = [];
  const parts = trimmed.split(',');
  let conditionType: InitialConditionType = 'default';

  for (const part of parts) {
    const trimmedPart = part.trim();

    // 匹配 y(0-)=value, y(0+)=value, y(t)=value 或 y'(t)=value 或 y''(t)=value
    const match = trimmedPart.match(/^y('*)\((0-|0\+|[^)]+)\)\s*=\s*(-?[\d.]+)$/);
    if (!match) {
      return { conditions: [], conditionType: 'default', error: `格式错误: "${trimmedPart}"，正确格式如 y(0-)=1 或 y(0+)=0 或 y'(0)=0` };
    }

    const primes = match[1].length; // 导数阶数
    const tStr = match[2]; // 时间点字符串
    const value = parseFloat(match[3]);

    // 解析时间点和类型
    let t: number;
    if (tStr === '0-') {
      t = 0;
      conditionType = '0-';
    } else if (tStr === '0+') {
      t = 0;
      conditionType = '0+';
    } else {
      t = parseFloat(tStr);
      if (isNaN(t)) {
        return { conditions: [], conditionType: 'default', error: `t 值无效: "${tStr}"` };
      }
    }

    if (isNaN(value)) {
      return { conditions: [], conditionType: 'default', error: `y 值无效: "${match[3]}"` };
    }

    conditions.push({ t, order: primes, value, type: tStr === '0-' ? '0-' : tStr === '0+' ? '0+' : 'default' });
  }

  // 检查数量
  if (conditions.length !== expectedOrder) {
    return { conditions: [], conditionType: 'default', error: `需要 ${expectedOrder} 个初始条件，当前输入了 ${conditions.length} 个` };
  }

  // 检查是否都在同一个 t 值（忽略 0- 和 0+ 的差异）
  const tValues = conditions.map(c => c.t);
  if (new Set(tValues).size > 1) {
    return { conditions: [], conditionType: 'default', error: '初始条件必须在同一个 t 值处' };
  }

  // 检查阶数是否连续
  const orders = conditions.map(c => c.order).sort((a, b) => a - b);
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i) {
      return { conditions: [], conditionType: 'default', error: '初始条件必须包含 y, y\'（和 y\'\'）' };
    }
  }

  return { conditions, conditionType };
}

/**
 * 格式化方程显示
 */
export function formatEquationDisplay(yCoeffs: number[], xCoeffs: number[], xFunc: string): string {
  const order = yCoeffs.length - 1;
  const yTerms: string[] = [];

  for (let i = 0; i < yCoeffs.length; i++) {
    const coeff = yCoeffs[i];
    if (Math.abs(coeff) < 1e-10) continue;

    const deriv = order - i;
    let term = Math.abs(coeff - 1) < 1e-10 ? '' : Math.abs(coeff + 1) < 1e-10 ? '-' : `${coeff}`;

    if (deriv === 0) term += 'y';
    else if (deriv === 1) term += "y'";
    else if (deriv === 2) term += "y''";
    else term += `y^(${deriv})`;

    yTerms.push(term);
  }

  const xExpr = Math.abs(xCoeffs[0] - 1) < 1e-10 && xCoeffs.slice(1).every(c => Math.abs(c) < 1e-10)
    ? xFunc
    : `${xCoeffs[0]}*${xFunc}`;

  return `${yTerms.join(' + ')} = ${xExpr}`;
}