// src/lib/marchingCubes.ts
// Surface Nets 算法：滑动窗口 + 梯度法线 + 预分配缓冲区
// 基于 S.F. Gibson, "Constrained Elastic Surface Nets" (1998) MERL Tech Report.
// 与 Marching Cubes 的关键区别：在体素中心放置共享顶点，
// 天然消除歧义case的十字形裂缝。

// 预计算边表
const CUBE_EDGES = new Int32Array(24);
const EDGE_TABLE = new Int32Array(256);
(() => {
  let k = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 1; j <= 4; j <<= 1) {
      const p = i ^ j;
      if (i <= p) {
        CUBE_EDGES[k++] = i;
        CUBE_EDGES[k++] = p;
      }
    }
  }
  for (let i = 0; i < 256; i++) {
    let em = 0;
    for (let j = 0; j < 24; j += 2) {
      const a = !!(i & (1 << CUBE_EDGES[j]));
      const b = !!(i & (1 << CUBE_EDGES[j + 1]));
      if (a !== b) em |= (1 << (j >> 1));
    }
    EDGE_TABLE[i] = em;
  }
})();

export interface MCResult {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

/**
 * Surface Nets 算法（滑动窗口 + 梯度法线 + 预分配缓冲区）
 *
 * @param fn 三元函数 f(x,y,z)，返回标量值（已转换到世界空间）
 * @param resolution 网格分辨率（体素数，与旧代码 isosurface 的 dims 含义一致）
 * @param xRange [xMin, xMax]
 * @param yRange [yMin, yMax]
 * @param zRange [zMin, zMax]
 */
export function marchingCubes(
  fn: (x: number, y: number, z: number) => number,
  resolution: number,
  xRange: [number, number],
  yRange: [number, number],
  zRange: [number, number],
): MCResult {
  const xMin = xRange[0], xMax = xRange[1];
  const yMin = yRange[0], yMax = yRange[1];
  const zMin = zRange[0], zMax = zRange[1];

  // 与 isosurface 一致：dims=resolution 作为网格点数，步长 = 范围/dims
  const scaleX = (xMax - xMin) / resolution;
  const scaleY = (yMax - yMin) / resolution;
  const scaleZ = (zMax - zMin) / resolution;

  // 梯度法线用自适应步长
  const eps = Math.min(scaleX, scaleY, scaleZ) * 0.01;

  const dims0 = resolution;
  const dims1 = resolution;
  const dims2 = resolution;
  const R = [1, dims0 + 1, (dims0 + 1) * (dims1 + 1)];

  // 顶点缓冲区：暂存位置和法线，最后转 Float32Array
  const posArr: number[] = [];
  const nrmArr: number[] = [];
  const idxArr: number[] = [];
  let vc = 0;

  // 滑动窗口：两层的顶点索引缓冲区
  const bufferSize = R[2] * 2;
  const buffer = new Int32Array(bufferSize);

  // 场值缓冲区：两层的采样值
  const grid = new Float64Array(8);

  // 计算梯度法线并添加顶点
  function addVertex(px: number, py: number, pz: number): number {
    posArr.push(px, py, pz);

    const gx = fn(px + eps, py, pz) - fn(px - eps, py, pz);
    const gy = fn(px, py + eps, pz) - fn(px, py - eps, pz);
    const gz = fn(px, py, pz + eps) - fn(px, py, pz - eps);
    const gl = 1 / Math.sqrt(gx * gx + gy * gy + gz * gz || 1);
    nrmArr.push(gx * gl, gy * gl, gz * gl);

    return vc++;
  }

  // 遍历体素 (dims[i]-1 个体素，与 isosurface 一致)
  let buf_no = 1;
  for (let x2 = 0; x2 < dims2 - 1; x2++, buf_no ^= 1, R[2] = -R[2]) {
    let m = 1 + (dims0 + 1) * (1 + buf_no * (dims1 + 1));

    for (let x1 = 0; x1 < dims1 - 1; x1++, m += 2) {
      for (let x0 = 0; x0 < dims0 - 1; x0++, m++) {
        // 读取8个角值
        let mask = 0;
        let g = 0;
        for (let k = 0; k < 2; k++) {
          for (let j = 0; j < 2; j++) {
            for (let i = 0; i < 2; i++, g++) {
              const p = fn(
                scaleX * (x0 + i) + xMin,
                scaleY * (x1 + j) + yMin,
                scaleZ * (x2 + k) + zMin,
              );
              grid[g] = Number.isFinite(p) ? p : 1;
              if (grid[g] < 0) mask |= (1 << g);
            }
          }
        }

        if (mask === 0 || mask === 0xff) continue;

        // 计算体素顶点：所有边交点的平均值
        const edgeMask = EDGE_TABLE[mask];
        let vx = 0, vy = 0, vz = 0, eCount = 0;

        for (let i = 0; i < 12; i++) {
          if (!(edgeMask & (1 << i))) continue;
          eCount++;

          const e0 = CUBE_EDGES[i << 1];
          const e1 = CUBE_EDGES[(i << 1) + 1];
          const g0 = grid[e0];
          const g1 = grid[e1];
          let t = g0 - g1;
          if (Math.abs(t) > 1e-6) {
            t = g0 / t;
          } else {
            continue;
          }

          // 插值：与 isosurface 一致的位运算方法
          for (let j = 0, bk = 1; j < 3; j++, bk <<= 1) {
            const a = e0 & bk;
            const b = e1 & bk;
            if (a !== b) {
              if (j === 0) vx += a ? 1.0 - t : t;
              else if (j === 1) vy += a ? 1.0 - t : t;
              else vz += a ? 1.0 - t : t;
            } else {
              if (j === 0) vx += a ? 1.0 : 0;
              else if (j === 1) vy += a ? 1.0 : 0;
              else vz += a ? 1.0 : 0;
            }
          }
        }

        // 取平均
        if (eCount > 0) {
          const s = 1.0 / eCount;
          vx = scaleX * (x0 + s * vx) + xMin;
          vy = scaleY * (x1 + s * vy) + yMin;
          vz = scaleZ * (x2 + s * vz) + zMin;
        } else {
          vx = scaleX * (x0 + 0.5) + xMin;
          vy = scaleY * (x1 + 0.5) + yMin;
          vz = scaleZ * (x2 + 0.5) + zMin;
        }

        // 添加顶点，存索引到 buffer
        buffer[m] = addVertex(vx, vy, vz) + 1; // +1 因为0表示未创建

        // 连接相邻体素形成四边形
        for (let i = 0; i < 3; i++) {
          if (!(edgeMask & (1 << i))) continue;

          const iu = (i + 1) % 3;
          const iv = (i + 2) % 3;

          // 边界检查
          const xiu = iu === 0 ? x0 : iu === 1 ? x1 : x2;
          const xiv = iv === 0 ? x0 : iv === 1 ? x1 : x2;
          if (xiu === 0 || xiv === 0) continue;

          const du = R[iu];
          const dv = R[iv];

          const b0 = buffer[m] - 1;
          const b1 = buffer[m - du] - 1;
          const b2 = buffer[m - dv] - 1;
          const b3 = buffer[m - du - dv] - 1;

          if (b1 < 0 || b2 < 0 || b3 < 0) continue;

          if (mask & 1) {
            idxArr.push(b0, b1, b2);
            idxArr.push(b2, b1, b3);
          } else {
            idxArr.push(b0, b2, b1);
            idxArr.push(b1, b2, b3);
          }
        }
      }
    }
  }

  return {
    positions: new Float32Array(posArr),
    normals: new Float32Array(nrmArr),
    indices: new Uint32Array(idxArr),
  };
}
