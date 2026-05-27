// src/lib/parser.ts
import type { ParsedFunction, ParametricFunction } from '../types';
import { extractParameters, createDefaultParams, validateParamCount } from './paramParser';
import {
  math,
  ALLOWED_FUNCTIONS,
  ALLOWED_CONSTANTS,
  collectSymbols,
  validateFunctions,
  preprocessExpression,
  safeEvaluate,
  testEvaluation,
} from './parserUtils';

export function parseExpression(expression: string): ParsedFunction | Error {
  try {
    const cleaned = preprocessExpression(expression);
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

    // 检查变量：只允许 x 和常量
    for (const v of usedVariables) {
      if (v !== 'x' && !ALLOWED_CONSTANTS.includes(v) && !ALLOWED_FUNCTIONS.includes(v)) {
        return new Error(`未知变量: ${v}（只支持变量 x）`);
      }
    }

    const compiled = node.compile();
    const safeEval = (x: number): number => safeEvaluate(compiled, { x });

    const evalError = testEvaluation(() => { safeEval(0); safeEval(1); safeEval(-1); });
    if (evalError) return evalError;

    return {
      id: '',
      expression: cleaned,
      compiled: safeEval,
      color: '',
      visible: true,
    };
  } catch (e) {
    return new Error(`解析错误: ${(e as Error).message}`);
  }
}

// 获取函数的建议范围（用于自动调整视口）
export function suggestRange(fn: (x: number) => number): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const testPoints = [-10, -5, -2, -1, 0, 1, 2, 5, 10];
  const yValues = testPoints.map(fn).filter(y => isFinite(y));

  if (yValues.length === 0) {
    return { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  }

  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const padding = (yMax - yMin) * 0.1 || 1;

  return { xMin: -10, xMax: 10, yMin: yMin - padding, yMax: yMax + padding };
}

/**
 * 解析参数化函数表达式
 * 支持带参数的表达式，如 y = ax + b
 */
export function parseParametricExpression(
  expression: string,
  maxParams: number = 3
): ParametricFunction | Error {
  try {
    const cleaned = preprocessExpression(expression);
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

    const variablesArray = Array.from(usedVariables);
    const validation = validateParamCount(variablesArray, maxParams);
    if (validation) return new Error(validation);

    const parameters = extractParameters(variablesArray, maxParams);

    if (!usedVariables.has('x')) {
      return new Error('表达式必须包含变量 x');
    }

    const compiled = node.compile();
    const defaultParams = createDefaultParams(parameters);
    const safeEval = (x: number, params: Record<string, number> = {}): number =>
      safeEvaluate(compiled, { x, ...params });

    const evalError = testEvaluation(() => {
      safeEval(0, defaultParams);
      safeEval(1, defaultParams);
      safeEval(-1, defaultParams);
    });
    if (evalError) return evalError;

    return {
      id: '',
      expression: cleaned,
      compiled: safeEval,
      color: '',
      visible: true,
      parameters,
      xAxisVar: 'x',
      yAxisVar: 'y',
    };
  } catch (e) {
    return new Error(`解析错误: ${(e as Error).message}`);
  }
}