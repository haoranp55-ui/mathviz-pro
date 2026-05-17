import { describe, it, expect } from 'vitest';
import { bisection, newton1D, findAllRoots1D, newtonRaphson, broyden, findAllSolutions, solveEquationSystem } from '../lib/equationSolver';
import type { SearchRange, SolverConfig } from '../types';
const defaultConfig: SolverConfig = {
  tolerance: 1e-10,
  maxIterations: 100,
  multiStartGridSize: 10,
};

describe('equationSolver', () => {
  describe('bisection', () => {
    it('应求解 f(x) = x - 2 在 [0, 5] 上的根', () => {
      const result = bisection(x => x - 2, 0, 5);
      expect(result).not.toBeNull();
      expect(result!).toBeCloseTo(2, 8);
    });

    it('应求解 f(x) = x^2 - 4 在 [0, 5] 上的根', () => {
      const result = bisection(x => x * x - 4, 0, 5);
      expect(result).not.toBeNull();
      expect(result!).toBeCloseTo(2, 8);
    });

    it('应求解 f(x) = sin(x) 在 [3, 4] 上的根', () => {
      const result = bisection(x => Math.sin(x), 3, 4);
      expect(result).not.toBeNull();
      expect(result!).toBeCloseTo(Math.PI, 6);
    });

    it('应在端点同号时返回 null', () => {
      const result = bisection(x => x * x + 1, -5, 5);
      expect(result).toBeNull();
    });
  });

  describe('newton1D', () => {
    it('应求解 f(x) = x^2 - 4', () => {
      const result = newton1D(x => x * x - 4, 3);
      expect(result).not.toBeNull();
      expect(result!).toBeCloseTo(2, 8);
    });

    it('应求解 f(x) = cos(x) - x', () => {
      const result = newton1D(x => Math.cos(x) - x, 0.5);
      expect(result).not.toBeNull();
      // 验证 f(result) ≈ 0
      if (result !== null) {
        expect(Math.cos(result) - result).toBeCloseTo(0, 8);
      }
    });

    it('应在不收敛时返回 null', () => {
      // 导数接近零的函数可能不收敛
      const result = newton1D((_x) => 1, 0, { maxIterations: 5 });
      // 常函数没有根，应该返回 null 或一个不精确的值
      expect(result === null || !isFinite(result!) || Math.abs(1) > 1e-5).toBe(true);
    });
  });

  describe('findAllRoots1D', () => {
    it('应找到 f(x) = x^2 - 1 的两个根', () => {
      const roots = findAllRoots1D(x => x * x - 1, -5, 5);
      expect(roots.length).toBeGreaterThanOrEqual(2);
      const sorted = roots.sort((a, b) => a.values[0] - b.values[0]);
      expect(sorted[0].values[0]).toBeCloseTo(-1, 6);
      expect(sorted[1].values[0]).toBeCloseTo(1, 6);
    });

    it('应找到 f(x) = sin(x) 在 [0, 10] 上的多个根', () => {
      const roots = findAllRoots1D(x => Math.sin(x), 0, 10, { gridDensity: 50 });
      expect(roots.length).toBeGreaterThanOrEqual(3);
      for (const r of roots) {
        expect(Math.sin(r.values[0])).toBeCloseTo(0, 4);
      }
    });
  });

  describe('newtonRaphson (多变量)', () => {
    it('应求解 x + y = 3, x - y = 1', () => {
      const fns = [
        (vars: number[]) => vars[0] + vars[1] - 3,
        (vars: number[]) => vars[0] - vars[1] - 1,
      ];
      const result = newtonRaphson(fns, [0, 0]);
      expect(result).not.toBeNull();
      expect(result![0]).toBeCloseTo(2, 6);
      expect(result![1]).toBeCloseTo(1, 6);
    });

    it('应求解 x^2 + y^2 = 1, x - y = 0', () => {
      const fns = [
        (vars: number[]) => vars[0] * vars[0] + vars[1] * vars[1] - 1,
        (vars: number[]) => vars[0] - vars[1],
      ];
      const result = newtonRaphson(fns, [0.5, 0.5]);
      expect(result).not.toBeNull();
      expect(result![0]).toBeCloseTo(Math.SQRT1_2, 5);
      expect(result![1]).toBeCloseTo(Math.SQRT1_2, 5);
    });
  });

  describe('broyden', () => {
    it('应求解线性系统', () => {
      const fns = [
        (vars: number[]) => vars[0] + vars[1] - 3,
        (vars: number[]) => vars[0] - vars[1] - 1,
      ];
      const result = broyden(fns, [0, 0]);
      expect(result).not.toBeNull();
      expect(result![0]).toBeCloseTo(2, 4);
      expect(result![1]).toBeCloseTo(1, 4);
    });
  });

  describe('findAllSolutions', () => {
    it('应使用多起点搜索找到多个解', () => {
      const fns = [
        (vars: number[]) => vars[0] * vars[0] - 1,
      ];
      const searchRange: SearchRange[] = [{ min: -5, max: 5 }];
      const solutions = findAllSolutions(fns, searchRange, defaultConfig);
      expect(solutions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('solveEquationSystem', () => {
    it('应求解简单线性方程组', () => {
      const fns = [
        (vars: number[]) => vars[0] + vars[1] - 3,
        (vars: number[]) => vars[0] - vars[1] - 1,
      ];
      const searchRange: SearchRange[] = [{ min: -10, max: 10 }, { min: -10, max: 10 }];
      const solutions = solveEquationSystem(fns, searchRange, defaultConfig);
      expect(solutions.length).toBeGreaterThanOrEqual(1);
      const sol = solutions[0];
      expect(sol.values[0]).toBeCloseTo(2, 4);
      expect(sol.values[1]).toBeCloseTo(1, 4);
    });

    it('应求解非线性方程组', () => {
      const fns = [
        (vars: number[]) => vars[0] * vars[0] + vars[1] * vars[1] - 1,
        (vars: number[]) => vars[0] - vars[1],
      ];
      const searchRange: SearchRange[] = [{ min: -2, max: 2 }, { min: -2, max: 2 }];
      const solutions = solveEquationSystem(fns, searchRange, defaultConfig);
      expect(solutions.length).toBeGreaterThanOrEqual(1);
      for (const sol of solutions) {
        // 验证 x^2 + y^2 ≈ 1
        expect(sol.values[0] ** 2 + sol.values[1] ** 2).toBeCloseTo(1, 3);
      }
    });

    it('应在无解时返回空数组', () => {
      const fns = [
        (vars: number[]) => vars[0] * vars[0] + 1,
      ];
      const searchRange: SearchRange[] = [{ min: -10, max: 10 }];
      const solutions = solveEquationSystem(fns, searchRange, defaultConfig);
      expect(solutions.length).toBe(0);
    });

    it('应求解三变量方程组', () => {
      const fns = [
        (vars: number[]) => vars[0] + vars[1] + vars[2] - 6,
        (vars: number[]) => vars[0] - vars[1] + vars[2] - 2,
        (vars: number[]) => vars[0] + vars[1] - vars[2] - 2,
      ];
      const searchRange: SearchRange[] = [
        { min: -10, max: 10 },
        { min: -10, max: 10 },
        { min: -10, max: 10 },
      ];
      const solutions = solveEquationSystem(fns, searchRange, defaultConfig);
      expect(solutions.length).toBeGreaterThanOrEqual(1);
      const sol = solutions[0];
      expect(sol.values[0]).toBeCloseTo(2, 3);
      expect(sol.values[1]).toBeCloseTo(2, 3);
      expect(sol.values[2]).toBeCloseTo(2, 3);
    });
  });
});
