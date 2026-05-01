// src/lib/paramParser.ts
import type { Parameter } from '../types';

// 允许的常量（不应被识别为参数）
const ALLOWED_CONSTANTS = [
  'pi', 'e', 'tau', 'phi', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'SQRT2', 'SQRT1_2',
  'PI', 'E', 'TAU', 'PHI',
];

// 允许的函数名（不应被识别为参数）
const ALLOWED_FUNCTIONS = [
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'asin', 'acos', 'atan', 'acot', 'asec', 'acsc',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'exp', 'ln', 'log', 'log10', 'log2', 'log1p', 'expm1',
  'sqrt', 'cbrt', 'nthRoot', 'square', 'cube',
  'abs', 'sign', 'floor', 'ceil', 'round', 'fix',
  'factorial', 'gamma', 'erf',
  'combinations', 'permutations',
  'pow', 'hypot', 'gcd', 'lcm', 'mod',
];

/**
 * 判断是否为参数变量
 * 规则：单字母（大小写区分），排除 x, y 和常量/函数名
 */
export function isParameter(varName: string): boolean {
  // 排除 x, y（坐标变量）
  if (varName === 'x' || varName === 'y') return false;

  // 排除常量
  if (ALLOWED_CONSTANTS.includes(varName)) return false;

  // 排除函数名
  if (ALLOWED_FUNCTIONS.includes(varName.toLowerCase())) return false;

  // 必须是单字母
  return /^[a-zA-Z]$/.test(varName);
}

/**
 * 从变量列表中提取参数
 * @param variables 使用到的变量列表
 * @param maxParams 最大参数数量（默认3）
 * @returns 参数定义列表
 */
export function extractParameters(
  variables: string[],
  maxParams: number = 3
): Parameter[] {
  const paramNames = variables
    .filter(isParameter)
    .slice(0, maxParams);

  return paramNames.map(name => ({
    name,
    defaultValue: 1,
    min: -10,
    max: 10,
    step: 0.1,
    currentValue: 1,
  }));
}

/**
 * 创建参数默认值映射
 */
export function createDefaultParams(parameters: Parameter[]): Record<string, number> {
  return parameters.reduce((acc, p) => {
    acc[p.name] = p.currentValue;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * 更新参数值
 */
export function updateParameterValue(
  parameters: Parameter[],
  name: string,
  value: number
): Parameter[] {
  return parameters.map(p =>
    p.name === name
      ? { ...p, currentValue: Math.max(p.min, Math.min(p.max, value)) }
      : p
  );
}

/**
 * 验证参数数量
 */
export function validateParamCount(variables: string[], maxParams: number = 3): {
  valid: boolean;
  paramCount: number;
  excessParams: string[];
} {
  const paramNames = variables.filter(isParameter);
  return {
    valid: paramNames.length <= maxParams,
    paramCount: paramNames.length,
    excessParams: paramNames.slice(maxParams),
  };
}
