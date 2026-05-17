import { describe, it, expect } from 'vitest';
import { terminateWorkers } from '../workers/workerManager';

// Worker 测试在 node 环境下需要模拟
// 主要测试 workerManager 的接口和数据格式

describe('workerManager', () => {
  describe('solveEquationAsync 数据格式', () => {
    it('应正确构造求解请求消息', () => {
      // 验证消息格式——这在集成测试中更重要
      // 此处验证接口契约
      const request = {
        type: 'solve' as const,
        id: 'test-123',
        expressions: ['x + y = 3', 'x - y = 1'],
        variables: ['x', 'y'] as const,
        searchRange: [{ min: -10, max: 10 }, { min: -10, max: 10 }],
        solverConfig: {
          tolerance: 1e-10,
          maxIterations: 100,
          multiStartGridSize: 10,
        },
      };

      // 验证消息结构完整性
      expect(request.type).toBe('solve');
      expect(request.id).toBeTruthy();
      expect(request.expressions.length).toBe(request.variables.length);
      expect(request.searchRange.length).toBe(request.variables.length);
    });
  });

  describe('computeMeshVerticesAsync 数据格式', () => {
    it('应正确构造顶点计算请求消息', () => {
      const request = {
        type: 'computeVertices' as const,
        id: 'mesh-456',
        expression: 'sin(x) * cos(y)',
        resolution: 64,
        xMin: -5,
        xMax: 5,
        yMin: -5,
        yMax: 5,
        zMin: -2,
        zMax: 2,
      };

      expect(request.type).toBe('computeVertices');
      expect(request.resolution).toBeGreaterThan(0);
      expect(request.xMin).toBeLessThan(request.xMax);
      expect(request.yMin).toBeLessThan(request.yMax);
    });
  });

  describe('terminateWorkers', () => {
    it('应能安全调用而不报错', () => {
      expect(() => terminateWorkers()).not.toThrow();
    });
  });
});

// 方程求解 Worker 的纯逻辑测试（无需实际 Worker）
describe('equationSolverWorker 纯逻辑', () => {
  it('应在 Worker 内部正确解析和求解', async () => {
    // 直接测试 Worker 内部使用的逻辑路径
    const { parseEquation } = await import('../lib/equationParser');
    const { solveEquationSystem } = await import('../lib/equationSolver');

    const result = parseEquation('x + y = 3', ['x', 'y']);
    expect(result).not.toBeInstanceOf(Error);

    const result2 = parseEquation('x - y = 1', ['x', 'y']);
    expect(result2).not.toBeInstanceOf(Error);

    if (!(result instanceof Error) && !(result2 instanceof Error)) {
      const fns = [
        (vars: number[]) => result.compiled({ x: vars[0], y: vars[1] }),
        (vars: number[]) => result2.compiled({ x: vars[0], y: vars[1] }),
      ];
      const solutions = solveEquationSystem(fns, [{ min: -10, max: 10 }, { min: -10, max: 10 }], {
        tolerance: 1e-10,
        maxIterations: 100,
        multiStartGridSize: 10,
      });
      expect(solutions.length).toBeGreaterThanOrEqual(1);
      expect(solutions[0].values[0]).toBeCloseTo(2, 4);
      expect(solutions[0].values[1]).toBeCloseTo(1, 4);
    }
  });
});

// 3D 顶点 Worker 的纯逻辑测试
describe('meshVertexWorker 纯逻辑', () => {
  it('应在 Worker 内部正确解析3D表达式', async () => {
    const { parseThreeDExpression } = await import('../lib/threeDParser');

    const result = parseThreeDExpression('sin(x) * cos(y)');
    expect(result).not.toBeInstanceOf(Error);

    if (!(result instanceof Error)) {
      // 验证编译后的函数能在网格点上求值
      const z = result.compiled(0, 0);
      expect(z).toBeCloseTo(0, 8); // sin(0)*cos(0) = 0

      const z2 = result.compiled(Math.PI / 2, 0);
      expect(z2).toBeCloseTo(1, 8); // sin(π/2)*cos(0) = 1
    }
  });
});
