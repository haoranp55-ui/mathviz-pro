// src/__tests__/integralSolver.test.ts
import { describe, it, expect } from 'vitest';
import { simpsonIntegral, batchAntiderivative, numericalAntiderivative } from '../lib/integralSolver';

describe('integralSolver', () => {
  describe('simpsonIntegral', () => {
    it('should compute integral of constant', () => {
      const result = simpsonIntegral(() => 2, 0, 1, 1000);
      expect(result).toBeCloseTo(2, 2);
    });

    it('should compute integral of x', () => {
      const result = simpsonIntegral(x => x, 0, 1, 1000);
      expect(result).toBeCloseTo(0.5, 2);
    });

    it('should compute integral of x^2', () => {
      const result = simpsonIntegral(x => x * x, 0, 1, 1000);
      expect(result).toBeCloseTo(1 / 3, 2);
    });

    it('should compute integral of sin(x) from 0 to pi', () => {
      const result = simpsonIntegral(x => Math.sin(x), 0, Math.PI, 1000);
      expect(result).toBeCloseTo(2, 2);
    });

    it('should handle equal bounds', () => {
      const result = simpsonIntegral(x => x, 5, 5, 1000);
      expect(result).toBe(0);
    });

    it('should handle negative values', () => {
      const result = simpsonIntegral(x => -x, 0, 1, 1000);
      expect(result).toBeCloseTo(-0.5, 2);
    });
  });

  describe('batchAntiderivative', () => {
    it('should compute antiderivative values', () => {
      const xs = new Float64Array([0, 1, 2, 3]);
      const result = batchAntiderivative(x => x, xs, 0);
      // F(0) = 0, F(1) ≈ 0.5, F(2) ≈ 2, F(3) ≈ 4.5
      expect(result[0]).toBeCloseTo(0, 2);
      expect(result[1]).toBeCloseTo(0.5, 2);
      expect(result[2]).toBeCloseTo(2, 2);
      expect(result[3]).toBeCloseTo(4.5, 2);
    });

    it('should handle empty array', () => {
      const result = batchAntiderivative(x => x, new Float64Array(0), 0);
      expect(result).toHaveLength(0);
    });
  });

  describe('numericalAntiderivative', () => {
    it('should return a function', () => {
      const F = numericalAntiderivative(x => x, 0);
      expect(typeof F).toBe('function');
      expect(F(1)).toBeCloseTo(0.5, 2);
      expect(F(2)).toBeCloseTo(2, 2);
    });
  });
});