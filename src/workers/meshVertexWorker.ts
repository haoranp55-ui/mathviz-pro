// src/workers/meshVertexWorker.ts
// Web Worker: 在后台线程中计算3D显式函数的顶点高度值
// 返回 Float32Array，主线程直接 setY 到 BufferGeometry
// Z 裁剪由主线程的 clipping planes 实现，Worker 不做 clamp
import { parseThreeDExpression } from '../lib/threeDParser';

interface ComputeRequest {
  type: 'computeVertices';
  id: string;
  expression: string;
  resolution: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  parameters: Record<string, number>;
}

interface ComputeResponse {
  type: 'result';
  id: string;
  heights: Float32Array;
}

interface ComputeError {
  type: 'error';
  id: string;
  message: string;
}

self.onmessage = (e: MessageEvent<ComputeRequest>) => {
  const { type, id, expression, resolution, xMin, xMax, yMin, yMax, parameters } = e.data;

  if (type !== 'computeVertices') return;

  try {
    const result = parseThreeDExpression(expression);
    if (result instanceof Error) {
      const resp: ComputeError = { type: 'error', id, message: result.message };
      self.postMessage(resp);
      return;
    }

    const compiled = result.compiled;
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;

    const vertexCount = (resolution + 1) * (resolution + 1);
    const heights = new Float32Array(vertexCount);

    const halfWidth = xRange / 2;
    const halfHeight = yRange / 2;

    let idx = 0;
    for (let iy = 0; iy <= resolution; iy++) {
      for (let ix = 0; ix <= resolution; ix++) {
        const localX = -halfWidth + (ix / resolution) * xRange;
        const localZ = halfHeight - (iy / resolution) * yRange;

        const mathX = localX + xCenter;
        const mathY = -localZ + yCenter;

        let z = compiled(mathX, mathY, parameters);
        if (!Number.isFinite(z)) z = 0;
        heights[idx++] = z;
      }
    }

    const resp: ComputeResponse = { type: 'result', id, heights };
    self.postMessage(resp, { transfer: [heights.buffer] });
  } catch (err) {
    const resp: ComputeError = { type: 'error', id, message: (err as Error).message };
    self.postMessage(resp);
  }
};
