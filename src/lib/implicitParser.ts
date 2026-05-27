// src/lib/implicitParser.ts
import type { ImplicitFunction } from '../types';
import { extractParameters, createDefaultParams } from './paramParser';
import {
  math,
  ALLOWED_FUNCTIONS,
  ALLOWED_CONSTANTS,
  collectSymbols,
  validateFunctions,
  preprocessExpression,
  splitEquation,
  combineEquationSides,
  safeEvaluate,
  testEvaluation,
} from './parserUtils';

export function parseImplicitExpression(expression: string): ImplicitFunction | Error {
  try {
    const cleaned = preprocessExpression(expression);
    if (!cleaned) return new Error('表达式不能为空');

    const splitResult = splitEquation(cleaned);
    if (splitResult instanceof Error) return splitResult;
    const { left, right } = splitResult;

    const combined = combineEquationSides(left, right);
    let node;
    try {
      node = math.parse(combined);
    } catch (e) {
      return new Error(`语法错误: ${(e as Error).message}`);
    }

    const { functions: usedFunctions, variables: usedVariables } = collectSymbols(node);

    const fnError = validateFunctions(usedFunctions);
    if (fnError) return fnError;

    // 检查变量：允许 x, y 和常量，其他视为参数
    for (const v of usedVariables) {
      if (v !== 'x' && v !== 'y' && !ALLOWED_CONSTANTS.includes(v) && !ALLOWED_FUNCTIONS.includes(v)) {
        // 这可能是参数变量，由 extractParameters 处理
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
      requiresCPU: false,
    };
  } catch (e) {
    return new Error(`解析错误: ${(e as Error).message}`);
  }
}