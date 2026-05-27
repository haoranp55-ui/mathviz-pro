// src/workers/workerManager.ts
// 统一管理 Web Worker 实例的生命周期和通信

import type { SolverConfig, SearchRange, Solution, VariableName } from '../types';

// ===== 方程求解 Worker =====

type SolveCallback = (solutions: Solution[]) => void;
type SolveErrorCallback = (message: string) => void;

interface PendingSolve {
  resolve: SolveCallback;
  reject: SolveErrorCallback;
}

let equationWorker: Worker | null = null;
const pendingSolves = new Map<string, PendingSolve>();

function getEquationWorker(): Worker {
  if (!equationWorker) {
    equationWorker = new Worker(
      new URL('./equationSolverWorker.ts', import.meta.url),
      { type: 'module' }
    );
    equationWorker.onmessage = (e) => {
      const data = e.data;
      const pending = pendingSolves.get(data.id);
      if (!pending) return;
      pendingSolves.delete(data.id);
      if (data.type === 'result') {
        pending.resolve(data.solutions);
      } else if (data.type === 'error') {
        pending.reject(data.message);
      }
    };
  }
  return equationWorker;
}

/**
 * 异步求解方程系统（在 Worker 线程中执行）
 */
export function solveEquationAsync(
  id: string,
  expressions: string[],
  variables: VariableName[],
  searchRange: SearchRange[],
  solverConfig: SolverConfig
): Promise<Solution[]> {
  return new Promise((resolve, reject) => {
    pendingSolves.set(id, { resolve, reject });
    const worker = getEquationWorker();
    worker.postMessage({
      type: 'solve',
      id,
      expressions,
      variables,
      searchRange,
      solverConfig,
    });
  });
}

// ===== 3D 顶点计算 Worker =====

interface PendingVertexCompute {
  resolve: (heights: Float32Array) => void;
  reject: (message: string) => void;
}

let meshWorker: Worker | null = null;
const pendingVertexComputes = new Map<string, PendingVertexCompute>();

function getMeshWorker(): Worker {
  if (!meshWorker) {
    meshWorker = new Worker(
      new URL('./meshVertexWorker.ts', import.meta.url),
      { type: 'module' }
    );
    meshWorker.onmessage = (e) => {
      const data = e.data;
      const pending = pendingVertexComputes.get(data.id);
      if (!pending) return;
      pendingVertexComputes.delete(data.id);
      if (data.type === 'result') {
        pending.resolve(data.heights);
      } else if (data.type === 'error') {
        pending.reject(data.message);
      }
    };
  }
  return meshWorker;
}

export interface MeshVertexRequest {
  id: string;
  expression: string;
  resolution: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  parameters: Record<string, number>;
}

/**
 * 异步计算3D显式函数的顶点高度值（在 Worker 线程中执行）
 * 返回 Float32Array，可直接用于 BufferGeometry 的 Y 分量
 */
export function computeMeshVerticesAsync(req: MeshVertexRequest): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    pendingVertexComputes.set(req.id, { resolve, reject });
    const worker = getMeshWorker();
    worker.postMessage({
      type: 'computeVertices',
      ...req,
    });
  });
}

// ===== 3D 隐函数 Marching Cubes Worker =====

export interface Implicit3DResult {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

interface PendingImplicit3DCompute {
  resolve: (result: Implicit3DResult) => void;
  reject: (message: string) => void;
}

let implicit3DWorker: Worker | null = null;
const pendingImplicit3DComputes = new Map<string, PendingImplicit3DCompute>();

function getImplicit3DWorker(): Worker {
  if (!implicit3DWorker) {
    implicit3DWorker = new Worker(
      new URL('./implicit3DWorker.ts', import.meta.url),
      { type: 'module' }
    );
    implicit3DWorker.onmessage = (e) => {
      const data = e.data;
      if (data.type === 'cancelled') {
        // 被取消的计算，reject 其 pending Promise
        const pending = pendingImplicit3DComputes.get(data.id);
        if (pending) {
          pendingImplicit3DComputes.delete(data.id);
          pending.reject('cancelled');
        }
        return;
      }
      const pending = pendingImplicit3DComputes.get(data.id);
      if (!pending) return;
      pendingImplicit3DComputes.delete(data.id);
      if (data.type === 'result') {
        pending.resolve({
          positions: data.positions,
          normals: data.normals,
          indices: data.indices,
        });
      } else if (data.type === 'error') {
        pending.reject(data.message);
      }
    };
  }
  return implicit3DWorker;
}

export interface Implicit3DRequest {
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

/**
 * 异步计算3D隐函数的 Marching Cubes 网格（在 Worker 线程中执行）
 * 返回 positions/normals/indices，可直接用于 BufferGeometry
 */
export function computeImplicit3DAsync(req: Implicit3DRequest): Promise<Implicit3DResult> {
  const worker = getImplicit3DWorker();

  // 取消同一 id 的前一次计算
  worker.postMessage({ type: 'cancel', id: req.id });

  return new Promise((resolve, reject) => {
    pendingImplicit3DComputes.set(req.id, { resolve, reject });
    worker.postMessage({
      type: 'compute',
      ...req,
    });
  });
}

// ===== 清理 =====

export function terminateWorkers(): void {
  if (equationWorker) {
    equationWorker.terminate();
    equationWorker = null;
  }
  if (meshWorker) {
    meshWorker.terminate();
    meshWorker = null;
  }
  if (implicit3DWorker) {
    implicit3DWorker.terminate();
    implicit3DWorker = null;
  }
  pendingSolves.clear();
  pendingVertexComputes.clear();
  pendingImplicit3DComputes.clear();
}
