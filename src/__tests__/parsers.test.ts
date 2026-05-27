// src/__tests__/parsers.test.ts
import { describe, it, expect } from 'vitest';
import { parseExpression, parseParametricExpression, suggestRange } from '../lib/parser';
import { isParameter, extractParameters, updateParameterValue, validateParamCount } from '../lib/paramParser';
import { parseImplicitExpression } from '../lib/implicitParser';
import { parsePolarExpression, polarToCartesian } from '../lib/polarParser';
import { parseThreeDExpression } from '../lib/threeDParser';
import { parseImplicit3D } from '../lib/implicit3DParser';
import { parseEquation, parseEquationSystem, detectVariables } from '../lib/equationParser';
import { parseCoefficients, parseXFunction, parseInitialConditions, formatEquationDisplay } from '../lib/differentialParser';

describe('parser.ts', () => {
  describe('parseExpression', () => {
    it('should parse simple polynomial', () => {
      const result = parseExpression('x^2');
      expect(result).not.toBeInstanceOf(Error);
      if (!(result instanceof Error)) {
        expect(result.expression).toBe('x^2');
        expect(result.compiled(2)).toBeCloseTo(4);
      }
    });

    it('should parse trig functions', () => {
      const result = parseExpression('sin(x)');
      expect(result).not.toBeInstanceOf(Error);
      if (!(result instanceof Error)) {
        expect(result.compiled(0)).toBeCloseTo(0);
        expect(result.compiled(Math.PI / 2)).toBeCloseTo(1);
      }
    });

    it('should return Error for empty expression', () => {
      expect(parseExpression('')).toBeInstanceOf(Error);
      expect(parseExpression('   ')).toBeInstanceOf(Error);
    });

    it('should return Error for unsupported functions', () => {
      expect(parseExpression('besselJ(0, x)')).toBeInstanceOf(Error);
    });

    it('should handle ln → log conversion', () => {
      const result = parseExpression('ln(x)');
      expect(result).not.toBeInstanceOf(Error);
      if (!(result instanceof Error)) {
        expect(result.compiled(Math.E)).toBeCloseTo(1);
      }
    });

    it('should reject unknown variables', () => {
      expect(parseExpression('a*x')).toBeInstanceOf(Error);
    });
  });

  describe('parseParametricExpression', () => {
    it('should parse expression with parameters', () => {
      const result = parseParametricExpression('a*sin(b*x)');
      expect(result).not.toBeInstanceOf(Error);
      if (!(result instanceof Error)) {
        const names = result.parameters.map(p => p.name);
        expect(names).toContain('a');
        expect(names).toContain('b');
      }
    });

    it('should return Error for empty expression', () => {
      expect(parseParametricExpression('')).toBeInstanceOf(Error);
    });

    it('should reject more than 3 parameters', () => {
      expect(parseParametricExpression('a*b*c*d*x')).toBeInstanceOf(Error);
    });
  });

  describe('suggestRange', () => {
    it('should suggest reasonable range', () => {
      const range = suggestRange(x => x * x);
      expect(range.xMin).toBe(-10);
      expect(range.xMax).toBe(10);
    });
  });
});

describe('paramParser.ts', () => {
  describe('isParameter', () => {
    it('should identify single letters as parameters', () => {
      expect(isParameter('a')).toBe(true);
      expect(isParameter('b')).toBe(true);
    });

    it('should exclude domain variables', () => {
      expect(isParameter('x')).toBe(false);
      expect(isParameter('y')).toBe(false);
    });

    it('should exclude constants', () => {
      expect(isParameter('pi')).toBe(false);
      expect(isParameter('e')).toBe(false);
    });

    it('should exclude function names', () => {
      expect(isParameter('sin')).toBe(false);
      expect(isParameter('cos')).toBe(false);
    });

    it('should exclude multi-letter names', () => {
      expect(isParameter('abc')).toBe(false);
    });
  });

  describe('extractParameters', () => {
    it('should extract parameters from variable list', () => {
      const params = extractParameters(['x', 'a', 'b']);
      expect(params).toHaveLength(2);
      expect(params[0].name).toBe('a');
      expect(params[1].name).toBe('b');
    });

    it('should respect maxParams limit', () => {
      const params = extractParameters(['x', 'a', 'b', 'c'], 2);
      expect(params).toHaveLength(2);
    });

    it('should return empty for no parameters', () => {
      const params = extractParameters(['x', 'y']);
      expect(params).toHaveLength(0);
    });
  });

  describe('updateParameterValue', () => {
    it('should clamp value within min/max', () => {
      const params = [{ name: 'a', defaultValue: 1, min: -10, max: 10, step: 0.1, currentValue: 1 }];
      const updated = updateParameterValue(params, 'a', 15);
      expect(updated[0].currentValue).toBe(10);
    });
  });

  describe('validateParamCount', () => {
    it('should return null for valid count', () => {
      expect(validateParamCount(['x', 'a', 'b'])).toBeNull();
    });

    it('should return error for too many params', () => {
      expect(validateParamCount(['x', 'a', 'b', 'c', 'd'])).not.toBeNull();
    });
  });
});

describe('implicitParser.ts', () => {
  it('should parse circle equation', () => {
    const result = parseImplicitExpression('x^2 + y^2 = 1');
    expect(result).not.toBeInstanceOf(Error);
    if (!(result instanceof Error)) {
      expect(result.expression).toBe('x^2 + y^2 = 1');
    }
  });

  it('should parse with zero right side', () => {
    const result = parseImplicitExpression('x^2 + y^2 - 1 = 0');
    expect(result).not.toBeInstanceOf(Error);
  });

  it('should return Error for no equals sign', () => {
    expect(parseImplicitExpression('x^2 + y^2')).toBeInstanceOf(Error);
  });

  it('should return Error for multiple equals', () => {
    expect(parseImplicitExpression('x = y = z')).toBeInstanceOf(Error);
  });

  it('should return Error for empty input', () => {
    expect(parseImplicitExpression('')).toBeInstanceOf(Error);
  });

  it('should handle tan conversion', () => {
    const result = parseImplicitExpression('y = tan(x)');
    expect(result).not.toBeInstanceOf(Error);
  });
});

describe('polarParser.ts', () => {
  it('should parse simple polar expression', () => {
    const result = parsePolarExpression('sin(3*x)');
    expect(result).not.toBeInstanceOf(Error);
  });

  it('should parse with parameters', () => {
    const result = parsePolarExpression('a*sin(n*x)');
    expect(result).not.toBeInstanceOf(Error);
    if (!(result instanceof Error)) {
      const names = result.parameters.map(p => p.name);
      expect(names).toContain('a');
      expect(names).toContain('n');
    }
  });

  it('should return Error for empty input', () => {
    expect(parsePolarExpression('')).toBeInstanceOf(Error);
  });

  it('should convert polar to cartesian correctly', () => {
    const { x, y } = polarToCartesian(1, 0);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
  });
});

describe('threeDParser.ts', () => {
  it('should parse simple 3D expression', () => {
    const result = parseThreeDExpression('x^2 + y^2');
    expect(result).not.toBeInstanceOf(Error);
    if (!(result instanceof Error)) {
      expect(result.expression).toBe('x^2 + y^2');
    }
  });

  it('should evaluate 3D function', () => {
    const result = parseThreeDExpression('x + y');
    expect(result).not.toBeInstanceOf(Error);
    if (!(result instanceof Error)) {
      expect(result.compiled(1, 2)).toBeCloseTo(3);
    }
  });

  it('should return Error for empty input', () => {
    expect(parseThreeDExpression('')).toBeInstanceOf(Error);
  });

  it('should return Error for unsupported functions', () => {
    expect(parseThreeDExpression('besselJ(0, x)')).toBeInstanceOf(Error);
  });
});

describe('implicit3DParser.ts', () => {
  it('should parse sphere equation', () => {
    const result = parseImplicit3D('x^2 + y^2 + z^2 = 1');
    expect(result).not.toBeInstanceOf(Error);
  });

  it('should evaluate at surface point', () => {
    const result = parseImplicit3D('x^2 + y^2 + z^2 - 1 = 0');
    expect(result).not.toBeInstanceOf(Error);
    if (!(result instanceof Error)) {
      expect(result.compiled(1, 0, 0)).toBeCloseTo(0);
    }
  });

  it('should accept expression without equals (treated as F=0)', () => {
    const result = parseImplicit3D('x^2 + y^2 + z^2 - 1');
    expect(result).not.toBeInstanceOf(Error);
  });

  it('should return Error for empty input', () => {
    expect(parseImplicit3D('')).toBeInstanceOf(Error);
  });
});

describe('equationParser.ts', () => {
  describe('parseEquation', () => {
    it('should parse simple equation', () => {
      const result = parseEquation('x + y = 3', ['x', 'y']);
      expect(result).not.toBeInstanceOf(Error);
    });

    it('should return Error for no equals', () => {
      expect(parseEquation('x + y', ['x', 'y'])).toBeInstanceOf(Error);
    });

    it('should return Error for empty input', () => {
      expect(parseEquation('', ['x', 'y'])).toBeInstanceOf(Error);
    });

    it('should return Error for unknown variables', () => {
      expect(parseEquation('x + z = 1', ['x', 'y'])).toBeInstanceOf(Error);
    });

    it('should handle ln conversion', () => {
      const result = parseEquation('ln(x) + y = 0', ['x', 'y']);
      expect(result).not.toBeInstanceOf(Error);
    });
  });

  describe('parseEquationSystem', () => {
    it('should parse valid system', () => {
      const result = parseEquationSystem(['x + y = 3', 'x - y = 1'], ['x', 'y']);
      expect(result).not.toBeInstanceOf(Error);
      if (!(result instanceof Error)) {
        expect(result.equations).toHaveLength(2);
        expect(result.variables).toEqual(['x', 'y']);
      }
    });

    it('should return Error for mismatched counts', () => {
      expect(parseEquationSystem(['x + y = 3'], ['x', 'y'])).toBeInstanceOf(Error);
    });

    it('should return Error for too many variables', () => {
      expect(parseEquationSystem([], ['x', 'y', 'z', 'w', 'v', 'u'])).toBeInstanceOf(Error);
    });
  });

  describe('detectVariables', () => {
    it('should detect x and y from expression parts', () => {
      // detectVariables uses math.parse which can't handle '='
      // so we pass left and right side expressions separately
      const vars = detectVariables(['x + y', '3']);
      expect(vars).toContain('x');
      expect(vars).toContain('y');
    });

    it('should return empty for constants only', () => {
      const vars = detectVariables(['1 + 2']);
      expect(vars).toHaveLength(0);
    });
  });
});

describe('differentialParser.ts', () => {
  describe('parseCoefficients', () => {
    it('should parse valid y coefficients', () => {
      const result = parseCoefficients('1, 3, 2', true);
      expect(result).not.toBeInstanceOf(Error);
      if (!(result instanceof Error)) {
        expect(result).toEqual([1, 3, 2]);
      }
    });

    it('should parse valid x coefficients', () => {
      const result = parseCoefficients('1', false);
      expect(result).not.toBeInstanceOf(Error);
      if (!(result instanceof Error)) {
        expect(result).toEqual([1]);
      }
    });

    it('should return Error for empty input', () => {
      expect(parseCoefficients('', true)).toBeInstanceOf(Error);
    });

    it('should return Error for single y coefficient', () => {
      expect(parseCoefficients('1', true)).toBeInstanceOf(Error);
    });

    it('should return Error for leading zero', () => {
      expect(parseCoefficients('0, 1', true)).toBeInstanceOf(Error);
    });

    it('should return Error for more than 4 coefficients', () => {
      expect(parseCoefficients('1, 2, 3, 4, 5', true)).toBeInstanceOf(Error);
    });

    it('should return Error for non-numeric input', () => {
      expect(parseCoefficients('1, abc', true)).toBeInstanceOf(Error);
    });
  });

  describe('parseXFunction', () => {
    it('should return t for empty input', () => {
      const result = parseXFunction('');
      expect(result).toBe('t');
    });

    it('should return valid expression unchanged', () => {
      expect(parseXFunction('sin(t)')).toBe('sin(t)');
    });

    it('should return Error for mismatched parens', () => {
      expect(parseXFunction('sin(t')).toBeInstanceOf(Error);
    });
  });

  describe('parseInitialConditions', () => {
    it('should parse simple initial conditions', () => {
      const result = parseInitialConditions('y(0)=1, y\'(0)=0', 2);
      expect(result.error).toBeUndefined();
      expect(result.conditions).toHaveLength(2);
    });

    it('should return empty for no input', () => {
      const result = parseInitialConditions('', 2);
      expect(result.conditions).toHaveLength(0);
      expect(result.conditionType).toBe('default');
    });

    it('should parse 0- conditions', () => {
      const result = parseInitialConditions('y(0-)=1, y\'(0-)=0', 2);
      expect(result.error).toBeUndefined();
      expect(result.conditionType).toBe('0-');
    });

    it('should return error for wrong count', () => {
      const result = parseInitialConditions('y(0)=1', 2);
      expect(result.error).not.toBeUndefined();
    });

    it('should return error for bad format', () => {
      const result = parseInitialConditions('y=1', 1);
      expect(result.error).not.toBeUndefined();
    });
  });

  describe('formatEquationDisplay', () => {
    it('should format second-order equation', () => {
      const display = formatEquationDisplay([1, 3, 2], [1], 't');
      expect(display).toContain("y''");
      expect(display).toContain("y'");
      expect(display).toContain('y');
    });
  });
});
