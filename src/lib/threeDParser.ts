// src/lib/threeDParser.ts
import type { ThreeDFunction } from '../types';
import { extractParameters, createDefaultParams } from './paramParser';
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

export function parseThreeDExpression(expression: string, zVar: string = 'z'): ThreeDFunction | Error {
  try {
    const cleaned = preprocessExpression(expression);
    if (!cleaned) return new Error('表达式不能为空');

    // 替换 z 变量为 y 用于 mathjs 求值（内部统一用 x, y）
    const internalExpr = cleaned.replace(new RegExp(`\\b${zVar}\\b`, 'g'), 'y');

    let node;
    try {
      node = math.parse(internalExpr);
    } catch (e) {
      return new Error(`语法错误: ${(e as Error).message}`);
    }

    const { functions: usedFunctions, variables: usedVariables } = collectSymbols(node);

    const fnError = validateFunctions(usedFunctions);
    if (fnError) return fnError;

    // 检查变量：允许 x, y(=z) 和常量
    for (const v of usedVariables) {
      if (v !== 'x' && v !== 'y' && !ALLOWED_CONSTANTS.includes(v) && !ALLOWED_FUNCTIONS.includes(v)) {
        // 参数变量
      }
    }

    const parameters = extractParameters(Array.from(usedVariables), 3, ['x', 'y']);
    const defaultParams = createDefaultParams(parameters);

    const compiled = node.compile();
    const safeEval = (x: number, y: number, params: Record<string, number> = {}): number =>
      safeEvaluate(compiled, { x, y, ...defaultParams, ...params });

    const evalError = testEvaluation(() => {
      safeEval(0, 0, defaultParams);
      safeEval(1, 1, defaultParams);
      safeEval(-1, -1, defaultParams);
    });
    if (evalError) return evalError;

    return {
      id: '',
      expression: cleaned,
      compiled: safeEval,
      color: '',
      visible: true,
      parameters,
      wireframe: false,
      resolution: 64,
      xMin: -10, xMax: 10,
      yMin: -10, yMax: 10,
    };
  } catch (e) {
    return new Error(`解析错误: ${(e as Error).message}`);
  }
}