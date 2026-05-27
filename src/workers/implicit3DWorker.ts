// src/workers/implicit3DWorker.ts
// Web Worker: 在后台线程中计算3D隐函数的 Marching Cubes 网格
// 返回 positions/normals/indices 的 TypedArray，主线程直接构建 BufferGeometry
// 支持取消机制：收到 cancel 消息时，标记当前计算为取消状态
import { parseImplicit3D } from '../lib/implicit3DParser';
import { marchingCubes } from '../lib/marchingCubes';

interface ComputeRequest {
  type: 'compute';
  id: string;
  expression: string;
  resolution: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
  parameters: Record<string, number>;
}

interface CancelRequest {
  type: 'cancel';
  id: string;
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

interface CancelledResponse {
  type: 'cancelled';
  id: string;
}

// 当前活跃的计算 id，用于取消检测
let activeId: string | null = null;

self.onmessage = (e: MessageEvent<ComputeRequest | CancelRequest>) => {
  const data = e.data;

  // 取消指定 id 的计算
  if (data.type === 'cancel') {
    if (activeId === data.id) activeId = null;
    return;
  }

  if (data.type !== 'compute') return;

  const { id, expression, resolution, xMin, xMax, yMin, yMax, zMin, zMax, parameters } = data;
  activeId = id;

  const isCancelled = () => activeId !== id;

  try {
    const result = parseImplicit3D(expression);
    if (result instanceof Error) {
      const resp: ComputeError = { type: 'error', id, message: result.message };
      self.postMessage(resp);
      activeId = null;
      return;
    }

    const compiled = result.compiled;

    // 坐标映射：世界空间 → 数学空间
    // THREE.js: X=数学X, -Z=数学Y, Y=数学Z
    // 所以 sampler(worldX, worldY, worldZ) = compiled(mathX, mathY, mathZ) = compiled(worldX, -worldZ, worldY)
    const fn = (x: number, y: number, z: number): number => {
      const val = compiled(x, -z, y, parameters);
      return Number.isFinite(val) ? val : 1;
    };

    // 域映射：fn(x,y,z) = compiled(x, -z, y, parameters)
    //   MC X = worldX = mathX
    //   MC Y = worldY = mathZ   → 用 zMin/zMax
    //   MC Z = worldZ = -mathY  → 用 [-yMax, -yMin]
    const mcResult = marchingCubes(
      fn,
      resolution,
      [xMin, xMax],
      [zMin, zMax],
      [-yMax, -yMin],
      isCancelled,
    );

    // 检查是否被取消（marchingCubes 返回空数据表示被取消）
    if (activeId !== id) {
      const resp: CancelledResponse = { type: 'cancelled', id };
      self.postMessage(resp);
      return;
    }

    activeId = null;

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
    activeId = null;
    const resp: ComputeError = { type: 'error', id, message: (err as Error).message };
    self.postMessage(resp);
  }
};