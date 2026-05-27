// src/__tests__/parserUtils.test.ts
import { describe, it, expect } from 'vitest';
import { math, ALLOWED_FUNCTIONS, ALLOWED_CONSTANTS, collectSymbols, validateFunctions, preprocessExpression, safeEvaluate, testEvaluation, splitEquation, combineEquationSides } from '../lib/parserUtils';

describe('parserUtils', () => {
  describe('ALLOWED_FUNCTIONS', () => {
    it('should include basic trig functions', () => {
      expect(ALLOWED_FUNCTIONS).toContain('sin');
      expect(ALLOWED_FUNCTIONS).toContain('cos');
      expect(ALLOWED_FUNCTIONS).toContain('tan');
    });

    it('should include hyperbolic functions', () => {
      expect(ALLOWED_FUNCTIONS).toContain('sinh');
      expect(ALLOWED_FUNCTIONS).toContain('cosh');
      expect(ALLOWED_FUNCTIONS).toContain('tanh');
    });

    it('should include inverse trig functions', () => {
      expect(ALLOWED_FUNCTIONS).toContain('asin');
      expect(ALLOWED_FUNCTIONS).toContain('acos');
      expect(ALLOWED_FUNCTIONS).toContain('atan');
      expect(ALLOWED_FUNCTIONS).toContain('atan2');
    });

    it('should include logarithmic functions', () => {
      expect(ALLOWED_FUNCTIONS).toContain('log');
      expect(ALLOWED_FUNCTIONS).toContain('log2');
      expect(ALLOWED_FUNCTIONS).toContain('log10');
    });

    it('should include reciprocal trig functions', () => {
      expect(ALLOWED_FUNCTIONS).toContain('sec');
      expect(ALLOWED_FUNCTIONS).toContain('csc');
      expect(ALLOWED_FUNCTIONS).toContain('cot');
    });

    it('should include reciprocal hyperbolic functions', () => {
      expect(ALLOWED_FUNCTIONS).toContain('sech');
      expect(ALLOWED_FUNCTIONS).toContain('csch');
      expect(ALLOWED_FUNCTIONS).toContain('coth');
    });

    it('should include special functions', () => {
      expect(ALLOWED_FUNCTIONS).toContain('factorial');
      expect(ALLOWED_FUNCTIONS).toContain('gamma');
      expect(ALLOWED_FUNCTIONS).toContain('erf');
    });
  });

  describe('ALLOWED_CONSTANTS', () => {
    it('should include pi and e', () => {
      expect(ALLOWED_CONSTANTS).toContain('pi');
      expect(ALLOWED_CONSTANTS).toContain('e');
    });
  });

  describe('collectSymbols', () => {
    it('should collect function names from expression', () => {
      const { functions } = collectSymbols(math.parse('sin(x) + cos(x)'));
      expect(functions).toContain('sin');
      expect(functions).toContain('cos');
    });

    it('should collect variable names from expression', () => {
      const { variables } = collectSymbols(math.parse('x + y * a'));
      expect(variables).toContain('x');
      expect(variables).toContain('y');
      expect(variables).toContain('a');
    });

    it('should separate functions from variables', () => {
      const { functions, variables } = collectSymbols(math.parse('sin(x) + a'));
      expect(functions).toContain('sin');
      expect(variables).toContain('x');
      expect(variables).toContain('a');
    });
  });

  describe('validateFunctions', () => {
    it('should return null for allowed functions', () => {
      expect(validateFunctions(new Set(['sin', 'cos', 'tan']))).toBeNull();
    });

    it('should return null for factorial and gamma', () => {
      expect(validateFunctions(new Set(['factorial', 'gamma']))).toBeNull();
    });

    it('should return error for truly unsupported functions', () => {
      const error = validateFunctions(new Set(['someUnknownFunction']));
      expect(error).not.toBeNull();
    });
  });

  describe('preprocessExpression', () => {
    it('should trim whitespace', () => {
      expect(preprocessExpression('  x + 1  ')).toBe('x + 1');
    });

    it('should convert ln to log', () => {
      expect(preprocessExpression('ln(x)')).toBe('log(x)');
    });

    it('should return empty string for empty input', () => {
      expect(preprocessExpression('')).toBe('');
      expect(preprocessExpression('   ')).toBe('');
    });
  });

  describe('splitEquation', () => {
    it('should split equation correctly', () => {
      const result = splitEquation('x^2 + y^2 = 1');
      expect(result).not.toBeInstanceOf(Error);
      const eq = result as { left: string; right: string };
      expect(eq.left).toBe('x^2 + y^2');
      expect(eq.right).toBe('1');
    });

    it('should return error for expressions without equals', () => {
      const result = splitEquation('x + y');
      expect(result).toBeInstanceOf(Error);
    });

    it('should return error for multiple equals signs', () => {
      const result = splitEquation('x = y = z');
      expect(result).toBeInstanceOf(Error);
    });

    it('should return error for empty sides', () => {
      const result = splitEquation('= 1');
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('combineEquationSides', () => {
    it('should combine sides into F-G form', () => {
      expect(combineEquationSides('x^2', '1')).toBe('(x^2) - (1)');
    });
  });

  describe('safeEvaluate', () => {
    it('should return finite numbers', () => {
      const compiled = math.parse('x + 1').compile();
      expect(safeEvaluate(compiled, { x: 2 })).toBe(3);
    });

    it('should return NaN for NaN results', () => {
      const compiled = math.parse('sqrt(x)').compile();
      expect(safeEvaluate(compiled, { x: -1 })).toBeNaN();
    });

    it('should return NaN for Infinity results', () => {
      const compiled = math.parse('1/x').compile();
      expect(safeEvaluate(compiled, { x: 0 })).toBeNaN();
    });
  });

  describe('testEvaluation', () => {
    it('should return null for valid functions', () => {
      const compiled = math.parse('x + 1').compile();
      expect(testEvaluation(() => safeEvaluate(compiled, { x: 1 }))).toBeNull();
    });

    it('should return error for functions that throw', () => {
      expect(testEvaluation(() => { throw new Error('bad'); })).not.toBeNull();
    });
  });
});