// src/lib/implicit3DParser.ts
// 3D 隐函数解析器: f(x, y, z) = 0
import type { Parameter } from '../types';
import { extractParameters, createDefaultParams, validateParamCount } from './paramParser';
import {
  math,
  collectSymbols,
  validateFunctions,
  preprocessExpression,
  splitEquation,
  combineEquationSides,
  safeEvaluate,
} from './parserUtils';

export interface Implicit3DParseResult {
  compiled: (x: number, y: number, z: number, params?: Record<string, number>) => number;
  parameters: Parameter[];
}

export function parseImplicit3D(expression: string): Implicit3DParseResult | Error {
  try {
    const cleaned = preprocessExpression(expression);
    if (!cleaned) return new Error('表达式不能为空');

    let combined: string;
    if (cleaned.includes('=')) {
      const splitResult = splitEquation(cleaned, '3D隐函数必须包含等号，格式：F(x,y,z) = G(x,y,z)');
      if (splitResult instanceof Error) return splitResult;
      combined = combineEquationSides(splitResult.left, splitResult.right);
    } else {
      combined = cleaned;
    }

    let node;
    try {
      node = math.parse(combined);
    } catch (e) {
      return new Error(`语法错误: ${(e as Error).message}`);
    }

    const { functions: usedFunctions, variables: usedVariables } = collectSymbols(node);

    // 验证函数（之前缺失的检查）
    const fnError = validateFunctions(usedFunctions);
    if (fnError) return fnError;

    const varList = Array.from(usedVariables);
    const paramError = validateParamCount(varList, 3, ['x', 'y', 'z']);
    if (paramError) return new Error(paramError);

    const parameters = extractParameters(varList, 3, ['x', 'y', 'z']);
    const defaultParams = createDefaultParams(parameters);

    const compiled = node.compile();
    const safeEval = (x: number, y: number, z: number, params?: Record<string, number>): number =>
      safeEvaluate(compiled, { x, y, z, ...(params ?? defaultParams) });

    return { compiled: safeEval, parameters };
  } catch (e) {
    return new Error(`解析失败: ${(e as Error).message}`);
  }
}