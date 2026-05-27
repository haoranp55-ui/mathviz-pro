// src/lib/paramParser.ts
import type { Parameter } from '../types';
import { ALLOWED_CONSTANTS, ALLOWED_FUNCTIONS } from './parserUtils';

/**
 * 判断是否为参数变量
 * 规则：单字母（大小写区分），排除域变量和常量/函数名
 * @param domainVariables 域变量名列表，默认 ['x', 'y']（3D隐函数传 ['x', 'y', 'z']）
 */
export function isParameter(varName: string, domainVariables: string[] = ['x', 'y']): boolean {
  if (domainVariables.includes(varName)) return false;
  if (ALLOWED_CONSTANTS.includes(varName)) return false;
  if (ALLOWED_FUNCTIONS.includes(varName)) return false;
  return /^[a-zA-Z]$/.test(varName);
}

/**
 * 从变量列表中提取参数
 */
export function extractParameters(
  variables: string[],
  maxParams: number = 3,
  domainVariables: string[] = ['x', 'y']
): Parameter[] {
  const paramNames = variables
    .filter(v => isParameter(v, domainVariables))
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
 * 验证参数数量是否合法
 */
export function validateParamCount(
  variables: string[],
  maxParams: number = 3,
  domainVariables: string[] = ['x', 'y']
): string | null {
  const paramNames = variables.filter(v => isParameter(v, domainVariables));
  if (paramNames.length > maxParams) {
    return `参数过多（最多${maxParams}个），多余参数: ${paramNames.slice(maxParams).join(', ')}`;
  }
  return null;
}