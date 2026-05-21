// src/lib/threeD/threeDRenderManager.ts
import * as THREE from 'three';
import type { ThreeDFunction, Implicit3DFunction } from '../../types';
import { computeMeshVerticesAsync, computeImplicit3DAsync } from '../../workers/workerManager';
import { parse } from 'mathjs';
import { mathNodeToGLSL } from '../webgl/glslCompiler';

interface MeshEntry {
  mesh: THREE.Mesh;
  meshKey: string;
  zMin?: number;
  zMax?: number;
  isRayMarch?: boolean;
}

// GPU Ray Marching 渲染器类
class RayMarchingRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private meshMap = new Map<string, THREE.Mesh>();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, _renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
  }

  resize(_width: number, _height: number): void {}

  /** 每帧调用，同步相机位置到所有 ray marching mesh 的 uniform */
  syncCameraPosition(): void {
    for (const [, mesh] of this.meshMap) {
      if (!mesh.visible) continue;
      const mat = mesh.material as THREE.ShaderMaterial;
      const center = mesh.position;
      mat.uniforms.u_cameraLocalPos.value.copy(
        this.camera.position.clone().sub(center),
      );
    }
  }

  // 编译表达式为 GLSL
  private compileToGLSL(expression: string): string | null {
    try {
      const cleaned = expression.trim().replace(/\bln\b/g, 'log');
      const parts = cleaned.split('=');
      if (parts.length !== 2) return null;

      const combinedExpr = `(${parts[0].trim()}) - (${parts[1].trim()})`;
      const node = parse(combinedExpr);

      const params = new Set<string>();
      const glsl = mathNodeToGLSL(node, params);

      return glsl;
    } catch (e) {
      console.error('GLSL编译失败:', e);
      return null;
    }
  }

  update(fn: Implicit3DFunction): void {
    const meshKey = `raymarch-${fn.id}-${fn.expression}`;
    const existing = this.meshMap.get(fn.id);

    // 更新颜色、可见性、相机位置
    if (existing && (existing as any).meshKey === meshKey) {
      (existing.material as THREE.ShaderMaterial).uniforms.u_color.value.set(fn.color);
      existing.visible = fn.visible;
      // 同步相机位置（关键修复：之前这里直接 return，不更新相机位置）
      const center = existing.position;
      (existing.material as THREE.ShaderMaterial).uniforms.u_cameraLocalPos.value.copy(
        this.camera.position.clone().sub(center),
      );
      return;
    }

    // 删除旧 mesh
    if (existing) {
      this.scene.remove(existing);
      existing.geometry.dispose();
      (existing.material as THREE.ShaderMaterial).dispose();
    }

    if (!fn.visible) {
      this.meshMap.delete(fn.id);
      return;
    }

    // 编译表达式
    const exprGLSL = this.compileToGLSL(fn.expression);
    if (!exprGLSL) {
      console.warn('表达式编译失败:', fn.expression);
      return;
    }

    // 计算中心点和域大小
    const center = new THREE.Vector3(
      (fn.xMin + fn.xMax) / 2,
      (fn.yMin + fn.yMax) / 2,
      (fn.zMin + fn.zMax) / 2,
    );
    const halfSize = new THREE.Vector3(
      (fn.xMax - fn.xMin) / 2,
      (fn.yMax - fn.yMin) / 2,
      (fn.zMax - fn.zMin) / 2,
    );

    // 自适应步长：域越大步长越大，保证 1000 步能覆盖整个域
    const maxDim = Math.max(fn.xMax - fn.xMin, fn.yMax - fn.yMin, fn.zMax - fn.zMin);
    const stepSize = Math.max(0.005, maxDim / 500);

    // 解析颜色
    const color = fn.color;
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    // 相机位置转换到局部坐标系
    const cameraLocalPos = this.camera.position.clone().sub(center);

    const vertexShader = `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // 关键修复：
    // 1. F() 中做坐标映射：mathX=localX, mathY=-localZ, mathZ=localY（与 CPU 路径一致）
    // 2. 加 u_domainOffset 把局部坐标还原为数学坐标（支持非原点对称的域）
    // 3. 步长自适应域大小
    const fragmentShader = `
      precision highp float;

      uniform vec3 u_color;
      uniform vec3 u_domainMin;
      uniform vec3 u_domainMax;
      uniform vec3 u_cameraLocalPos;
      uniform vec3 u_domainOffset;
      uniform float u_stepSize;

      varying vec3 vPosition;

      float F(vec3 p) {
        // 局部坐标 → 数学坐标
        // CPU 路径映射: mathX=worldX, mathY=-worldZ, mathZ=worldY
        // 局部坐标 = 世界坐标 - center, 所以 worldCoord = localCoord + center
        float x = p.x + u_domainOffset.x;
        float y = -(p.z + u_domainOffset.z);
        float z = p.y + u_domainOffset.y;
        return ${exprGLSL};
      }

      vec3 getNormal(vec3 p) {
        float eps = 0.001;
        float d = F(p);
        return normalize(vec3(
          F(p + vec3(eps, 0.0, 0.0)) - d,
          F(p + vec3(0.0, eps, 0.0)) - d,
          F(p + vec3(0.0, 0.0, eps)) - d
        ));
      }

      void main() {
        vec3 ro = u_cameraLocalPos;
        vec3 rd = normalize(vPosition - ro);

        vec3 invRd = 1.0 / rd;
        vec3 t1 = (u_domainMin - ro) * invRd;
        vec3 t2 = (u_domainMax - ro) * invRd;
        vec3 tmin = min(t1, t2);
        vec3 tmax = max(t1, t2);
        float tNear = max(max(tmin.x, tmin.y), tmin.z);
        float tFar = min(min(tmax.x, tmax.y), tmax.z);

        if (tNear > tFar || tFar < 0.0) {
          discard;
        }

        float tStart = max(tNear, 0.0);
        float tEnd = tFar;
        float t = tStart;

        float prevSign = sign(F(ro + rd * t));
        bool hit = false;
        vec3 hitPoint;

        for (int i = 0; i < 1000; i++) {
          vec3 p = ro + rd * t;
          float f = F(p);
          float currSign = sign(f);

          if (currSign != prevSign && prevSign != 0.0) {
            float tLow = t - u_stepSize;
            float tHigh = t;
            for (int j = 0; j < 10; j++) {
              float tMid = (tLow + tHigh) * 0.5;
              vec3 pMid = ro + rd * tMid;
              float fMid = F(pMid);
              if (sign(fMid) == prevSign) {
                tLow = tMid;
              } else {
                tHigh = tMid;
              }
            }
            hitPoint = ro + rd * ((tLow + tHigh) * 0.5);
            hit = true;
            break;
          }

          prevSign = currSign;
          t += u_stepSize;
          if (t > tEnd) break;
        }

        if (hit) {
          vec3 n = getNormal(hitPoint);
          vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
          float diff = max(dot(n, lightDir), 0.0);
          float amb = 0.35;
          vec3 col = u_color * (amb + diff * 0.65);
          gl_FragColor = vec4(col, 1.0);
        } else {
          discard;
        }
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_color: { value: new THREE.Color(r, g, b) },
        u_domainMin: { value: new THREE.Vector3(-halfSize.x, -halfSize.y, -halfSize.z) },
        u_domainMax: { value: new THREE.Vector3(halfSize.x, halfSize.y, halfSize.z) },
        u_cameraLocalPos: { value: cameraLocalPos },
        u_domainOffset: { value: center },
        u_stepSize: { value: stepSize },
      },
      side: THREE.DoubleSide,
    });

    const geometry = new THREE.BoxGeometry(fn.xMax - fn.xMin, fn.yMax - fn.yMin, fn.zMax - fn.zMin);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);
    (mesh as any).meshKey = meshKey;

    this.scene.add(mesh);
    this.meshMap.set(fn.id, mesh);
  }

  remove(id: string): void {
    const mesh = this.meshMap.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.meshMap.delete(id);
    }
  }

  dispose(): void {
    for (const [id] of this.meshMap) {
      this.remove(id);
    }
  }
}

export class ThreeDRenderManager {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private meshes = new Map<string, MeshEntry>();
  private implicitMeshes = new Map<string, MeshEntry>();
  private disposed = false;
  private rayMarchingRenderer: RayMarchingRenderer | null = null;
  public onNeedsRender: (() => void) | null = null;
  public wasdSpeed = 1.0;
  public mouseSpeed = 1.0;

  // 正在计算中的 meshKey，防止同一 key 重复发起 Worker
  private explicitPendingKey = new Map<string, string>();
  private implicitPendingKey = new Map<string, string>();

  // 手动轨道控制
  private spherical = { theta: -Math.PI / 6, phi: Math.PI / 4, radius: 22 };
  private target = new THREE.Vector3(2, 0, -8);

  constructor() {
    this.canvas = document.createElement('canvas');

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.localClippingEnabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0f172a');

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    this.updateCameraPosition();

    // 初始化 GPU Ray Marching 渲染器
    this.rayMarchingRenderer = new RayMarchingRenderer(this.scene, this.camera, this.renderer);

    this.scene.add(new THREE.AmbientLight(0x404060, 2.0));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0x8888ff, 0.8);
    dirLight2.position.set(-10, -5, -10);
    this.scene.add(dirLight2);

    const gridHelper = new THREE.GridHelper(20, 20, 0x4B5563, 0x1F2937);
    gridHelper.name = 'grid';
    this.scene.add(gridHelper);

    this.createAxes();
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private createAxes(): void {
    const axisLength = 12;

    this.addAxisLine(new THREE.Vector3(-axisLength, 0, 0), new THREE.Vector3(axisLength, 0, 0), 0xff4444);
    this.addAxisLine(new THREE.Vector3(0, 0, axisLength), new THREE.Vector3(0, 0, -axisLength), 0x44ff44);
    this.addAxisLine(new THREE.Vector3(0, -axisLength, 0), new THREE.Vector3(0, axisLength, 0), 0x4488ff);

    this.addAxisLabel('X', new THREE.Vector3(axisLength + 0.8, 0, 0), '#ff6666');
    this.addAxisLabel('Y', new THREE.Vector3(0, 0, -axisLength - 0.8), '#66ff66');
    this.addAxisLabel('Z', new THREE.Vector3(0, axisLength + 0.8, 0), '#6699ff');

    const originGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const originMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const origin = new THREE.Mesh(originGeo, originMat);
    origin.name = 'origin';
    this.scene.add(origin);
  }

  private addAxisLine(from: THREE.Vector3, to: THREE.Vector3, color: number): void {
    const material = new THREE.LineBasicMaterial({ color, linewidth: 1, transparent: true, opacity: 0.7 });
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geometry, material);
    line.name = 'axis';
    this.scene.add(line);

    const dir = to.clone().sub(from).normalize();
    const arrowGeo = new THREE.ConeGeometry(0.12, 0.5, 8);
    const arrowMat = new THREE.MeshBasicMaterial({ color });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.copy(to);
    arrow.rotation.z = -Math.PI / 2;
    arrow.lookAt(to.clone().add(dir));
    arrow.name = 'axis-arrow';
    this.scene.add(arrow);
  }

  private addAxisLabel(text: string, position: THREE.Vector3, color: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(1.5, 1.5, 1);
    sprite.name = 'axis-label';
    this.scene.add(sprite);
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.disposed = true;
  };

  private updateCameraPosition(): void {
    const { theta, phi, radius } = this.spherical;
    this.camera.position.set(
      this.target.x + radius * Math.sin(phi) * Math.cos(theta),
      this.target.y + radius * Math.cos(phi),
      this.target.z + radius * Math.sin(phi) * Math.sin(theta),
    );
    this.camera.lookAt(this.target);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.rayMarchingRenderer?.resize(width, height);
  }

  handleMouseDrag(dx: number, dy: number): void {
    this.spherical.theta += dx * 0.005 * this.mouseSpeed;
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - dy * 0.005 * this.mouseSpeed));
    this.updateCameraPosition();
  }

  handleZoom(delta: number, ndcX: number, ndcY: number): void {
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(floorPlane, hitPoint)) {
      const toCursor = hitPoint.clone().sub(this.camera.position);
      const distToCursor = toCursor.length();
      const dirToCursor = toCursor.normalize();
      const newDist = distToCursor * zoomFactor;
      const deltaDist = distToCursor - newDist;
      this.camera.position.addScaledVector(dirToCursor, deltaDist);
      this.target.addScaledVector(dirToCursor, deltaDist);
    } else {
      const forward = this.target.clone().sub(this.camera.position).normalize();
      const moveDelta = this.spherical.radius * (1 - zoomFactor);
      this.camera.position.addScaledVector(forward, moveDelta);
      this.target.addScaledVector(forward, moveDelta);
    }

    const offset = this.camera.position.clone().sub(this.target);
    this.spherical.radius = Math.max(3, Math.min(100, offset.length()));
    this.spherical.theta = Math.atan2(offset.z, offset.x);
    this.spherical.phi = Math.acos(Math.max(-1, Math.min(1, offset.y / this.spherical.radius)));
    this.camera.lookAt(this.target);
  }

  handlePan(dx: number, dy: number): void {
    const cameraDir = this.target.clone().sub(this.camera.position).normalize();
    const cameraRight = new THREE.Vector3().crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();
    const cameraUp = new THREE.Vector3().crossVectors(cameraRight, cameraDir).normalize();
    const panSpeed = this.spherical.radius * 0.0006 * this.mouseSpeed;
    this.target.add(cameraRight.multiplyScalar(-dx * panSpeed));
    this.target.add(cameraUp.multiplyScalar(dy * panSpeed));
    this.updateCameraPosition();
  }

  handleWASDMovement(forward: number, right: number): void {
    const cameraDir = this.target.clone().sub(this.camera.position).normalize();
    cameraDir.y = 0;
    const forwardDir = cameraDir.length() < 0.001 ? new THREE.Vector3(0, 0, 1) : cameraDir.normalize();
    const rightDir = new THREE.Vector3().crossVectors(forwardDir, new THREE.Vector3(0, 1, 0)).normalize();
    const moveSpeed = this.spherical.radius * 0.01 * this.wasdSpeed;
    this.target.add(new THREE.Vector3().addScaledVector(forwardDir, forward * moveSpeed).addScaledVector(rightDir, right * moveSpeed));
    this.updateCameraPosition();
  }

  handleVerticalMovement(up: number): void {
    const moveSpeed = this.spherical.radius * 0.01 * this.wasdSpeed;
    this.target.add(new THREE.Vector3(0, up * moveSpeed, 0));
    this.updateCameraPosition();
  }

  resetCamera(): void {
    this.spherical = { theta: -Math.PI / 6, phi: Math.PI / 4, radius: 22 };
    this.target.set(2, 0, -8);
    this.updateCameraPosition();
  }

  renderToCanvas(
    functions: ThreeDFunction[],
    implicitFunctions: Implicit3DFunction[],
    size: { width: number; height: number },
  ): HTMLCanvasElement {
    if (this.disposed) return this.canvas;

    this.resize(size.width, size.height);

    const allExplicitIds = new Set<string>();
    for (const fn of functions) {
      allExplicitIds.add(fn.id);
      if (fn.error) continue;
      if (fn.visible) {
        this.updateOrCreateMesh(fn);
      } else {
        // 隐藏函数保留 mesh，只设不可见，避免反复 Worker 重算
        const entry = this.meshes.get(fn.id);
        if (entry) entry.mesh.visible = false;
      }
    }
    // 只删除已从列表中移除的函数
    for (const [id] of this.meshes) {
      if (!allExplicitIds.has(id)) this.removeMesh(id);
    }

    const allImplicitIds = new Set<string>();
    for (const fn of implicitFunctions) {
      allImplicitIds.add(fn.id);
      if (fn.error) continue;
      if (fn.visible) {
        this.updateOrCreateImplicitMesh(fn);
      } else {
        const entry = this.implicitMeshes.get(fn.id);
        if (entry) entry.mesh.visible = false;
      }
    }
    for (const [id] of this.implicitMeshes) {
      if (!allImplicitIds.has(id)) this.removeImplicitMesh(id);
    }

    // 每帧同步 ray marching 相机位置
    this.rayMarchingRenderer?.syncCameraPosition();

    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  // ========== 隐函数 ==========

  private updateOrCreateImplicitMesh(fn: Implicit3DFunction): void {
    // GPU Ray Marching 模式
    if (fn.useGPURayMarching) {
      // 删除旧的 CPU mesh
      const existingCPU = this.implicitMeshes.get(fn.id);
      if (existingCPU) {
        this.scene.remove(existingCPU.mesh);
        existingCPU.mesh.geometry.dispose();
        (existingCPU.mesh.material as THREE.Material).dispose();
        this.implicitMeshes.delete(fn.id);
      }
      // 使用 GPU Ray Marching 渲染
      this.rayMarchingRenderer?.update(fn);
      this.onNeedsRender?.();
      return;
    }

    // CPU Marching Cubes 模式
    const meshKey = `impl-${fn.id}-${fn.resolution}-${fn.wireframe}-${fn.expression}-${fn.xMin}-${fn.xMax}-${fn.yMin}-${fn.yMax}-${fn.zMin}-${fn.zMax}`;
    const existing = this.implicitMeshes.get(fn.id);

    // 删除 GPU mesh
    this.rayMarchingRenderer?.remove(fn.id);

    // key 未变 → 只更新颜色和可见性
    if (existing && existing.meshKey === meshKey) {
      (existing.mesh.material as THREE.MeshPhongMaterial).color.set(fn.color);
      existing.mesh.visible = true;
      return;
    }

    // 已经在计算同一个 key → 跳过
    if (this.implicitPendingKey.get(fn.id) === meshKey) return;
    this.implicitPendingKey.set(fn.id, meshKey);

    // 没有 old mesh → 不可见占位
    if (!existing) {
      const dGeo = new THREE.SphereGeometry(0.01);
      const dMat = new THREE.MeshPhongMaterial({ color: fn.color, wireframe: fn.wireframe, side: THREE.DoubleSide });
      const d = new THREE.Mesh(dGeo, dMat);
      d.visible = false;
      this.scene.add(d);
      this.implicitMeshes.set(fn.id, { mesh: d, meshKey });
    }

    const color = fn.color;
    const wireframe = fn.wireframe;

    computeImplicit3DAsync({
      id: fn.id,
      expression: fn.expression,
      resolution: fn.resolution,
      xMin: fn.xMin, xMax: fn.xMax,
      yMin: fn.yMin, yMax: fn.yMax,
      zMin: fn.zMin, zMax: fn.zMax,
    }).then((result) => {
      this.implicitPendingKey.delete(fn.id);
      if (this.disposed) return;

      // 如果 meshKey 已经又变了（用户继续调域），不替换，让下一轮计算处理
      const currentEntry = this.implicitMeshes.get(fn.id);
      if (currentEntry && currentEntry.meshKey !== meshKey && this.implicitPendingKey.has(fn.id)) return;

      // 删掉旧 mesh
      if (currentEntry) {
        this.scene.remove(currentEntry.mesh);
        currentEntry.mesh.geometry.dispose();
        (currentEntry.mesh.material as THREE.Material).dispose();
      }

      if (!result.positions.length || !result.indices.length) {
        const dGeo = new THREE.SphereGeometry(0.01);
        const dMat = new THREE.MeshPhongMaterial({ color, wireframe, side: THREE.DoubleSide });
        const d = new THREE.Mesh(dGeo, dMat);
        d.visible = false;
        this.scene.add(d);
        this.implicitMeshes.set(fn.id, { mesh: d, meshKey });
        this.onNeedsRender?.();
        return;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(result.positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(result.normals, 3));
      geometry.setIndex(new THREE.BufferAttribute(result.indices, 1));

      const material = new THREE.MeshPhongMaterial({
        color, wireframe, side: THREE.DoubleSide,
        shininess: 30, specular: new THREE.Color(0x111111), flatShading: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
      this.implicitMeshes.set(fn.id, { mesh, meshKey });
      this.onNeedsRender?.();
    }).catch(() => {
      this.implicitPendingKey.delete(fn.id);
    });
  }

  private removeImplicitMesh(id: string): void {
    // 删除 CPU mesh
    const entry = this.implicitMeshes.get(id);
    if (entry) {
      this.scene.remove(entry.mesh);
      entry.mesh.geometry.dispose();
      (entry.mesh.material as THREE.Material).dispose();
      this.implicitMeshes.delete(id);
    }
    // 删除 GPU Ray Marching mesh
    this.rayMarchingRenderer?.remove(id);
    this.implicitPendingKey.delete(id);
  }

  // ========== 显函数 ==========

  private makeClippingPlanes(zMin?: number, zMax?: number): THREE.Plane[] {
    const planes: THREE.Plane[] = [];
    // THREE.Plane(normal, constant): 保留 normal · point + constant >= 0 的点
    // zMin: 保留 y >= zMin → normal=(0,1,0), constant=-zMin
    if (zMin !== undefined) planes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), -zMin));
    // zMax: 保留 y <= zMax → normal=(0,-1,0), constant=zMax
    if (zMax !== undefined) planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), zMax));
    return planes;
  }

  private updateOrCreateMesh(fn: ThreeDFunction): void {
    // meshKey 不包含 zMin/zMax——Z 范围用 clipping planes 裁剪，不影响几何体
    const meshKey = `${fn.id}-${fn.resolution}-${fn.wireframe}-${fn.expression}-${fn.xMin}-${fn.xMax}-${fn.yMin}-${fn.yMax}`;
    const existing = this.meshes.get(fn.id);

    // 几何体没变 → 只更新颜色、可见性、Z裁剪
    if (existing && existing.meshKey === meshKey) {
      (existing.mesh.material as THREE.MeshPhongMaterial).color.set(fn.color);
      existing.mesh.visible = true;
      // Z 范围变化只更新 clipping planes，不触发 Worker 重算
      const mat = existing.mesh.material as THREE.MeshPhongMaterial;
      mat.clippingPlanes = this.makeClippingPlanes(fn.zMin, fn.zMax);
      existing.zMin = fn.zMin;
      existing.zMax = fn.zMax;
      return;
    }

    // 几何体变了 → 保持旧 mesh 可见，等 Worker 完成后替换
    if (existing) {
      (existing.mesh.material as THREE.MeshPhongMaterial).color.set(fn.color);
      existing.mesh.visible = true;
    }

    // 已经在计算同一个 key → 跳过
    if (this.explicitPendingKey.get(fn.id) === meshKey) return;
    this.explicitPendingKey.set(fn.id, meshKey);

    if (!existing) {
      const dGeo = new THREE.SphereGeometry(0.01);
      const dMat = new THREE.MeshPhongMaterial({ color: fn.color, wireframe: fn.wireframe, side: THREE.DoubleSide });
      dMat.clippingPlanes = this.makeClippingPlanes(fn.zMin, fn.zMax);
      const d = new THREE.Mesh(dGeo, dMat);
      d.visible = false;
      this.scene.add(d);
      this.meshes.set(fn.id, { mesh: d, meshKey, zMin: fn.zMin, zMax: fn.zMax });
    }

    const res = fn.resolution;
    const xRange = fn.xMax - fn.xMin;
    const yRange = fn.yMax - fn.yMin;
    const xCenter = (fn.xMin + fn.xMax) / 2;
    const yCenter = (fn.yMin + fn.yMax) / 2;
    const color = fn.color;
    const wireframe = fn.wireframe;
    const zMin = fn.zMin;
    const zMax = fn.zMax;

    computeMeshVerticesAsync({
      id: fn.id,
      expression: fn.expression,
      resolution: fn.resolution,
      xMin: fn.xMin, xMax: fn.xMax,
      yMin: fn.yMin, yMax: fn.yMax,
    }).then((heights) => {
      this.explicitPendingKey.delete(fn.id);
      if (this.disposed) return;

      const currentEntry = this.meshes.get(fn.id);
      if (currentEntry && currentEntry.meshKey !== meshKey && this.explicitPendingKey.has(fn.id)) return;

      // 删掉旧 mesh
      if (currentEntry) {
        this.scene.remove(currentEntry.mesh);
        currentEntry.mesh.geometry.dispose();
        (currentEntry.mesh.material as THREE.Material).dispose();
      }

      const geometry = new THREE.PlaneGeometry(xRange, yRange, res, res);
      geometry.rotateX(-Math.PI / 2);

      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        positions.setY(i, heights[i]);
      }
      geometry.computeVertexNormals();
      positions.needsUpdate = true;

      const material = new THREE.MeshPhongMaterial({
        color, wireframe, side: THREE.DoubleSide,
        shininess: 30, specular: new THREE.Color(0x111111), flatShading: false,
        clippingPlanes: this.makeClippingPlanes(zMin, zMax),
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(xCenter, 0, -yCenter);
      this.scene.add(mesh);
      this.meshes.set(fn.id, { mesh, meshKey, zMin, zMax });
      this.onNeedsRender?.();
    }).catch(() => {
      this.explicitPendingKey.delete(fn.id);
    });
  }

  private removeMesh(id: string): void {
    const entry = this.meshes.get(id);
    if (!entry) return;
    this.scene.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    (entry.mesh.material as THREE.Material).dispose();
    this.meshes.delete(id);
    this.explicitPendingKey.delete(id);
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  dispose(): void {
    for (const [id] of this.meshes) this.removeMesh(id);
    for (const [id] of this.implicitMeshes) this.removeImplicitMesh(id);
    this.rayMarchingRenderer?.dispose();
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.dispose();
    this.disposed = true;
  }
}

let managerInstance: ThreeDRenderManager | null = null;

export function getThreeDRenderManager(): ThreeDRenderManager {
  if (!managerInstance || managerInstance.isDisposed()) {
    managerInstance?.dispose();
    managerInstance = new ThreeDRenderManager();
  }
  return managerInstance;
}
