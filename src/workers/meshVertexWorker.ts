// src/workers/meshVertexWorker.ts
// Web Worker: 在后台线程中计算3D显式函数的顶点高度值
// 返回 Float32Array，主线程直接 setY 到 BufferGeometry
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
  zMin?: number;
  zMax?: number;
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
  const { type, id, expression, resolution, xMin, xMax, yMin, yMax, zMin, zMax } = e.data;

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

    // PlaneGeometry(resolution, resolution) 产生 (res+1)^2 个顶点
    const vertexCount = (resolution + 1) * (resolution + 1);
    const heights = new Float32Array(vertexCount);

    // 模拟 PlaneGeometry 的顶点布局（rotateX(-PI/2) 后）
    // PlaneGeometry 在 rotateX(-PI/2) 后: X方向=localX, Z方向=-localZ
    // 顶点布局: 从左上到右下，行优先
    const halfWidth = xRange / 2;
    const halfHeight = yRange / 2;

    let idx = 0;
    for (let iy = 0; iy <= resolution; iy++) {
      for (let ix = 0; ix <= resolution; ix++) {
        // PlaneGeometry 顶点: X从-halfWidth到+halfWidth, Z从+halfHeight到-halfHeight
        const localX = -halfWidth + (ix / resolution) * xRange;
        const localZ = halfHeight - (iy / resolution) * yRange;

        const mathX = localX + xCenter;
        const mathY = -localZ + yCenter;

        let z = compiled(mathX, mathY);
        if (!Number.isFinite(z)) z = 0;
        if (zMin !== undefined && zMax !== undefined) {
          z = Math.max(zMin, Math.min(zMax, z));
        }
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
