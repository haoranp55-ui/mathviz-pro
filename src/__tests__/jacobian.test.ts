// src/__tests__/jacobian.test.ts
import { describe, it, expect } from 'vitest';
import { computeJacobian, computeDerivative, solveLinearSystem, vectorNorm, vectorSubtract } from '../lib/jacobian';

describe('jacobian', () => {
  describe('computeJacobian', () => {
    it('should compute Jacobian for identity system', () => {
      const fns = [(vars: number[]) => vars[0], (vars: number[]) => vars[1]];
      const J = computeJacobian(fns, [1, 2]);
      expect(J[0][0]).toBeCloseTo(1, 4);
      expect(J[0][1]).toBeCloseTo(0, 4);
      expect(J[1][0]).toBeCloseTo(0, 4);
      expect(J[1][1]).toBeCloseTo(1, 4);
    });

    it('should compute Jacobian for linear system', () => {
      const fns = [
        (vars: number[]) => 2 * vars[0] + 3 * vars[1],
        (vars: number[]) => vars[0] - vars[1],
      ];
      const J = computeJacobian(fns, [1, 1]);
      expect(J[0][0]).toBeCloseTo(2, 4);
      expect(J[0][1]).toBeCloseTo(3, 4);
      expect(J[1][0]).toBeCloseTo(1, 4);
      expect(J[1][1]).toBeCloseTo(-1, 4);
    });

    it('should compute Jacobian for nonlinear system', () => {
      const fns = [
        (vars: number[]) => vars[0] ** 2 + vars[1] ** 2,
        (vars: number[]) => vars[0] * vars[1],
      ];
      const J = computeJacobian(fns, [3, 4]);
      expect(J[0][0]).toBeCloseTo(6, 2);
      expect(J[0][1]).toBeCloseTo(8, 2);
      expect(J[1][0]).toBeCloseTo(4, 2);
      expect(J[1][1]).toBeCloseTo(3, 2);
    });
  });

  describe('computeDerivative', () => {
    it('should compute derivative of x^2 at x=3', () => {
      const d = computeDerivative(x => x * x, 3);
      expect(d).toBeCloseTo(6, 4);
    });

    it('should compute derivative of sin(x) at x=0', () => {
      const d = computeDerivative(Math.sin, 0);
      expect(d).toBeCloseTo(1, 4);
    });
  });

  describe('solveLinearSystem', () => {
    it('should solve 2x2 system', () => {
      // [[2,1],[1,3]] * x = [5,10] → x = [1,3]
      const A = [[2, 1], [1, 3]];
      const b = [5, 10];
      const x = solveLinearSystem(A, b);
      expect(x).not.toBeNull();
      expect(x![0]).toBeCloseTo(1, 6);
      expect(x![1]).toBeCloseTo(3, 6);
    });

    it('should return null for singular matrix', () => {
      const A = [[1, 1], [1, 1]];
      const b = [1, 2];
      const x = solveLinearSystem(A, b);
      expect(x).toBeNull();
    });
  });

  describe('vector utilities', () => {
    it('should compute norm', () => {
      expect(vectorNorm([3, 4])).toBeCloseTo(5, 6);
    });

    it('should subtract vectors', () => {
      const r = vectorSubtract([5, 7], [2, 3]);
      expect(r).toEqual([3, 4]);
    });
  });
});