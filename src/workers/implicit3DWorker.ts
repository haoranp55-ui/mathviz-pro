// src/workers/implicit3DWorker.ts
// Web Worker: 在后台线程中计算3D隐函数的 Marching Cubes 网格
// 返回 positions/normals/indices 的 TypedArray，主线程直接构建 BufferGeometry
import { parseImplicit3DExpression } from '../lib/implicit3DParser';
import { marchingCubes } from '../lib/marchingCubes';

interface ComputeRequest {
  type: 'computeImplicit3D';
  id: string;
  expression: string;
  resolution: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
}

interface ComputeResponse {
  type: 'result';
  id: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

interface ComputeError {
  type: 'error';
  id: string;
  message: string;
}

self.onmessage = (e: MessageEvent<ComputeRequest>) => {
  const { type, id, expression, resolution, xMin, xMax, yMin, yMax, zMin, zMax } = e.data;

  if (type !== 'computeImplicit3D') return;

  try {
    const result = parseImplicit3DExpression(expression);
    if (result instanceof Error) {
      const resp: ComputeError = { type: 'error', id, message: result.message };
      self.postMessage(resp);
      return;
    }

    const compiled = result.compiled;

    // 坐标映射：世界空间 → 数学空间
    // THREE.js: X=数学X, -Z=数学Y, Y=数学Z
    // 所以 sampler(worldX, worldY, worldZ) = compiled(mathX, mathY, mathZ) = compiled(worldX, -worldZ, worldY)
    const fn = (x: number, y: number, z: number): number => {
      const val = compiled(x, -z, y);
      return Number.isFinite(val) ? val : 1;
    };

    // 域映射：fn(x,y,z) = compiled(x, -z, y)
    //   MC X = worldX = mathX
    //   MC Y = worldY = mathZ   → 用 zMin/zMax
    //   MC Z = worldZ = -mathY  → 用 [-yMax, -yMin]
    const mcResult = marchingCubes(
      fn,
      resolution,
      [xMin, xMax],
      [zMin, zMax],
      [-yMax, -yMin],
    );

    const resp: ComputeResponse = {
      type: 'result',
      id,
      positions: mcResult.positions,
      normals: mcResult.normals,
      indices: mcResult.indices,
    };
    self.postMessage(resp, {
      transfer: [mcResult.positions.buffer, mcResult.normals.buffer, mcResult.indices.buffer],
    });
  } catch (err) {
    const resp: ComputeError = { type: 'error', id, message: (err as Error).message };
    self.postMessage(resp);
  }
};
