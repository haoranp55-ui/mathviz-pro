// src/lib/threeD/threeDRenderManager.ts
import * as THREE from 'three';
import type { ThreeDFunction, Implicit3DFunction } from '../../types';
import { computeMeshVerticesAsync, computeImplicit3DAsync } from '../../workers/workerManager';
import { parse } from 'mathjs';
import { mathNodeToGLSL } from '../webgl/glslCompiler';
import { hexToRGB } from '../webgl/webglUtils';

interface MeshEntry {
  mesh: THREE.Mesh;
  meshKey: string;
  paramKey?: string;
  zMin?: number;
  zMax?: number;
  isRayMarch?: boolean;
  // 参数变化时暂存的旧 mesh，Worker 完成后清理
  staleMesh?: THREE.Mesh;
  // 当前 mesh 是否为滑钮拖动时的低分辨率版本
  sliderLowRes?: boolean;
}

// 滑钮拖动时的低分辨率映射：约 1/3 原分辨率，最低 12
function getSliderResolution(resolution: number): number {
  return Math.max(12, Math.round(resolution / 3));
}

// GPU Ray Marching 渲染器类 - 正确实现
class RayMarchingRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private meshMap = new Map<string, THREE.Mesh>();
  // 缓存每个 mesh 的参数名列表，用于判断是否需要重编译 shader
  private paramNamesMap = new Map<string, string>();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, _renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
  }

  resize(_width: number, _height: number): void {}

  // 正确编译表达式为 GLSL，同时返回参数名列表
  private compileToGLSL(expression: string): { glsl: string; paramNames: string[] } | null {
    try {
      // 处理等号：f(x,y,z) = 0 -> f(x,y,z) - 0
      const cleaned = expression.trim().replace(/\bln\b/g, 'log');
      const parts = cleaned.split('=');
      if (parts.length !== 2) return null;

      const combinedExpr = `(${parts[0].trim()}) - (${parts[1].trim()})`;
      const node = parse(combinedExpr);

      const params = new Set<string>();
      const glsl = mathNodeToGLSL(node, params);

      return { glsl, paramNames: Array.from(params) };
    } catch (e) {
      console.error('GLSL编译失败:', e);
      return null;
    }
  }

  update(fn: Implicit3DFunction): void {
    // meshKey 包含参数名列表（不含值），参数名变化才需重编译 shader
    const paramNamesKey = fn.parameters.map(p => p.name).sort().join(',');
    const meshKey = `raymarch-${fn.id}-${fn.expression}-${paramNamesKey}`;
    const existing = this.meshMap.get(fn.id);

    // shader 结构没变 → 只更新 uniform 值（颜色、相机、参数）
    if (existing && existing.userData.meshKey === meshKey) {
      const mat = existing.material as THREE.ShaderMaterial;
      mat.uniforms.u_color.value.set(fn.color);
      // 每帧更新相机位置到局部坐标系
      const center = new THREE.Vector3(
        (fn.xMin + fn.xMax) / 2,
        (fn.yMin + fn.yMax) / 2,
        (fn.zMin + fn.zMax) / 2,
      );
      mat.uniforms.u_cameraLocalPos.value.copy(this.camera.position).sub(center);
      // 更新参数 uniform 值
      for (const p of fn.parameters) {
        const uniformName = `u_${p.name}`;
        if (mat.uniforms[uniformName]) {
          mat.uniforms[uniformName].value = p.currentValue;
        }
      }
      existing.visible = fn.visible;
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
      this.paramNamesMap.delete(fn.id);
      return;
    }

    // 编译表达式
    const compileResult = this.compileToGLSL(fn.expression);
    if (!compileResult) {
      console.warn('表达式编译失败:', fn.expression);
      return;
    }
    const { glsl: exprGLSL, paramNames } = compileResult;

    // 计算中心点
    const center = new THREE.Vector3(
      (fn.xMin + fn.xMax) / 2,
      (fn.yMin + fn.yMax) / 2,
      (fn.zMin + fn.zMax) / 2
    );

    // 使用统一的颜色解析
    const [r, g, b] = hexToRGB(fn.color);

    // 参数 uniform 声明
    const paramDeclarations = paramNames.map(p => `uniform float u_${p};`).join('\n');

    // 使用局部坐标系的 vertex shader
    const vertexShader = `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform vec3 u_color;
      uniform vec3 u_domainMin;
      uniform vec3 u_domainMax;
      uniform vec3 u_cameraLocalPos;
      ${paramDeclarations}

      varying vec3 vPosition;

      float F(vec3 p) {
        float x = p.x;
        float y = -p.z;
        float z = p.y;
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
        float stepSize = 0.02;
        float t = tStart;

        float prevSign = sign(F(ro + rd * t));
        bool hit = false;
        vec3 hitPoint;

        for (int i = 0; i < 1000; i++) {
          vec3 p = ro + rd * t;
          float f = F(p);
          float currSign = sign(f);

          if (currSign != prevSign && prevSign != 0.0) {
            float tLow = t - stepSize;
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
          t += stepSize;
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

    // 局部坐标系的范围（以中心为原点）
    const halfSize = new THREE.Vector3(
      (fn.xMax - fn.xMin) / 2,
      (fn.yMax - fn.yMin) / 2,
      (fn.zMax - fn.zMin) / 2
    );

    // 相机位置转换到局部坐标系
    const cameraLocalPos = this.camera.position.clone().sub(center);

    // 构建 uniforms 对象（包含参数）
    const uniforms: Record<string, { value: number | THREE.Color | THREE.Vector3 }> = {
      u_color: { value: new THREE.Color(r, g, b) },
      u_domainMin: { value: new THREE.Vector3(-halfSize.x, -halfSize.y, -halfSize.z) },
      u_domainMax: { value: new THREE.Vector3(halfSize.x, halfSize.y, halfSize.z) },
      u_cameraLocalPos: { value: cameraLocalPos },
    };
    // 添加参数 uniforms
    for (const p of fn.parameters) {
      uniforms[`u_${p.name}`] = { value: p.currentValue };
    }

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.BackSide,
    });

    const geometry = new THREE.BoxGeometry(fn.xMax - fn.xMin, fn.yMax - fn.yMin, fn.zMax - fn.zMin);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);
    mesh.userData.meshKey = meshKey;

    this.scene.add(mesh);
    this.meshMap.set(fn.id, mesh);
    this.paramNamesMap.set(fn.id, paramNamesKey);
  }

  remove(id: string): void {
    const mesh = this.meshMap.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.meshMap.delete(id);
      this.paramNamesMap.delete(id);
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
    isSliderActive: boolean = false,
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
        this.updateOrCreateImplicitMesh(fn, isSliderActive);
      } else {
        const entry = this.implicitMeshes.get(fn.id);
        if (entry) entry.mesh.visible = false;
      }
    }
    for (const [id] of this.implicitMeshes) {
      if (!allImplicitIds.has(id)) this.removeImplicitMesh(id);
    }

    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  // ========== 隐函数 ==========

  private updateOrCreateImplicitMesh(fn: Implicit3DFunction, isSliderActive: boolean = false): void {
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
    // meshKey 使用原始分辨率，确保松开后键匹配
    const meshKey = `impl-${fn.id}-${fn.resolution}-${fn.wireframe}-${fn.expression}-${fn.xMin}-${fn.xMax}-${fn.yMin}-${fn.yMax}-${fn.zMin}-${fn.zMax}`;
    const paramKey = fn.parameters.length > 0
      ? fn.parameters.map(p => `${p.name}:${p.currentValue.toFixed(4)}`).join(',')
      : '';
    const existing = this.implicitMeshes.get(fn.id);

    // 删除 GPU mesh
    this.rayMarchingRenderer?.remove(fn.id);

    // 滑钮松开后，需要把低分辨率 mesh 替换为原分辨率
    if (!isSliderActive && existing?.sliderLowRes) {
      // 清理低分辨率 mesh 和 staleMesh，强制重走 Worker 路径
      if (existing.staleMesh) {
        this.scene.remove(existing.staleMesh);
        existing.staleMesh.geometry.dispose();
        (existing.staleMesh.material as THREE.Material).dispose();
      }
      this.scene.remove(existing.mesh);
      existing.mesh.geometry.dispose();
      (existing.mesh.material as THREE.Material).dispose();
      this.implicitMeshes.delete(fn.id);
    } else if (existing && existing.meshKey === meshKey && existing.paramKey === paramKey && !existing.sliderLowRes) {
      // 完全没变（且非低分辨率）→ 只更新颜色和可见性
      (existing.mesh.material as THREE.MeshPhongMaterial).color.set(fn.color);
      existing.mesh.visible = true;
      return;
    }

    // 重新获取 entry（可能被上面的 sliderLowRes 清理删除了）
    const currentExisting = this.implicitMeshes.get(fn.id);

    // 已经在计算同一个 key → 跳过
    const fullKey = `${meshKey}-${paramKey}`;
    if (this.implicitPendingKey.get(fn.id) === fullKey) return;
    this.implicitPendingKey.set(fn.id, fullKey);

    // 参数变化时：保留旧 mesh 继续显示，Worker 算完后才替换（避免闪烁）
    const isParamOnlyChange = currentExisting && currentExisting.meshKey === meshKey && currentExisting.paramKey !== paramKey;

    if (isParamOnlyChange && currentExisting) {
      // 清理前一个 staleMesh（防止重叠图像泄漏）
      if (currentExisting.staleMesh) {
        this.scene.remove(currentExisting.staleMesh);
        currentExisting.staleMesh.geometry.dispose();
        (currentExisting.staleMesh.material as THREE.Material).dispose();
      }
      // 参数变化：把当前 mesh 标记为 stale，继续显示，等 Worker 完成后再删
      currentExisting.staleMesh = currentExisting.mesh;
    } else if (currentExisting) {
      // 结构变了 → 删旧 mesh + 清理 staleMesh
      if (currentExisting.staleMesh) {
        this.scene.remove(currentExisting.staleMesh);
        currentExisting.staleMesh.geometry.dispose();
        (currentExisting.staleMesh.material as THREE.Material).dispose();
      }
      this.scene.remove(currentExisting.mesh);
      currentExisting.mesh.geometry.dispose();
      (currentExisting.mesh.material as THREE.Material).dispose();
    }

    // 滑钮拖动时使用低分辨率，松开后恢复原分辨率
    const effectiveResolution = isSliderActive ? getSliderResolution(fn.resolution) : fn.resolution;
    const sliderLowRes = isSliderActive && effectiveResolution !== fn.resolution;

    // 不可见占位
    const dGeo = new THREE.SphereGeometry(0.01);
    const dMat = new THREE.MeshPhongMaterial({ color: fn.color, wireframe: fn.wireframe, side: THREE.DoubleSide });
    const d = new THREE.Mesh(dGeo, dMat);
    d.visible = false;
    this.scene.add(d);

    // 暂存 staleMesh（参数变化时）
    const staleMesh = isParamOnlyChange && existing ? existing.staleMesh : undefined;

    this.implicitMeshes.set(fn.id, {
      mesh: d, meshKey, paramKey,
      staleMesh,
      sliderLowRes,
    });

    const color = fn.color;
    const wireframe = fn.wireframe;
    const currentParams: Record<string, number> = {};
    for (const p of fn.parameters) currentParams[p.name] = p.currentValue;

    computeImplicit3DAsync({
      id: fn.id,
      expression: fn.expression,
      resolution: effectiveResolution,
      xMin: fn.xMin, xMax: fn.xMax,
      yMin: fn.yMin, yMax: fn.yMax,
      zMin: fn.zMin, zMax: fn.zMax,
      parameters: currentParams,
    }).then((result) => {
      this.implicitPendingKey.delete(fn.id);
      if (this.disposed) return;

      // 如果 key 已经又变了，不替换，让下一轮计算处理
      const currentEntry = this.implicitMeshes.get(fn.id);
      if (currentEntry && currentEntry.paramKey !== paramKey && this.implicitPendingKey.has(fn.id)) return;

      // 删掉占位 mesh 和旧 mesh（参数变化时旧 mesh 还在场景里）
      if (currentEntry) {
        this.scene.remove(currentEntry.mesh);
        currentEntry.mesh.geometry.dispose();
        (currentEntry.mesh.material as THREE.Material).dispose();
      }
      if (currentEntry?.staleMesh) {
        this.scene.remove(currentEntry.staleMesh);
        currentEntry.staleMesh.geometry.dispose();
        (currentEntry.staleMesh.material as THREE.Material).dispose();
      }

      if (!result.positions.length || !result.indices.length) {
        const dGeo2 = new THREE.SphereGeometry(0.01);
        const dMat2 = new THREE.MeshPhongMaterial({ color, wireframe, side: THREE.DoubleSide });
        const d2 = new THREE.Mesh(dGeo2, dMat2);
        d2.visible = false;
        this.scene.add(d2);
        this.implicitMeshes.set(fn.id, { mesh: d2, meshKey, paramKey, sliderLowRes });
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
      this.implicitMeshes.set(fn.id, { mesh, meshKey, paramKey, sliderLowRes });
      this.onNeedsRender?.();
    }).catch(() => {
      this.implicitPendingKey.delete(fn.id);
      // 取消或错误时清理占位 mesh 和 staleMesh
      const entry = this.implicitMeshes.get(fn.id);
      if (entry) {
        this.scene.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        (entry.mesh.material as THREE.Material).dispose();
        if (entry.staleMesh) {
          this.scene.remove(entry.staleMesh);
          entry.staleMesh.geometry.dispose();
          (entry.staleMesh.material as THREE.Material).dispose();
        }
        this.implicitMeshes.delete(fn.id);
      }
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
    // meshKey: 结构性标识（分辨率/表达式/域变化时才变）
    const meshKey = `${fn.id}-${fn.resolution}-${fn.wireframe}-${fn.expression}-${fn.xMin}-${fn.xMax}-${fn.yMin}-${fn.yMax}`;
    // paramKey: 参数值标识（滑块拖动时变）
    const paramKey = fn.parameters.length > 0
      ? fn.parameters.map(p => `${p.name}:${p.currentValue.toFixed(4)}`).join(',')
      : '';

    const cached = this.meshes.get(fn.id);

    // 结构没变，只参数变了 → in-place 更新顶点位置（跳过Worker）
    if (cached && cached.meshKey === meshKey && cached.paramKey !== paramKey) {
      this.updateMeshPositions(fn, cached.mesh);
      cached.paramKey = paramKey;
      this.updateZClipping(cached, fn.zMin, fn.zMax);
      this.onNeedsRender?.();
      return;
    }

    // 完全没变 → 只更新Z裁剪
    if (cached && cached.meshKey === meshKey && cached.paramKey === paramKey) {
      this.updateZClipping(cached, fn.zMin, fn.zMax);
      return;
    }

    // 结构变了 → 需要重建几何体（走Worker）
    if (cached) {
      this.scene.remove(cached.mesh);
      cached.mesh.geometry.dispose();
      (cached.mesh.material as THREE.Material).dispose();
    }

    // 已经在计算同一个 key → 跳过
    if (this.explicitPendingKey.get(fn.id) === meshKey) return;
    this.explicitPendingKey.set(fn.id, meshKey);

    // 占位mesh
    const dGeo = new THREE.SphereGeometry(0.01);
    const dMat = new THREE.MeshPhongMaterial({ color: fn.color, wireframe: fn.wireframe, side: THREE.DoubleSide });
    dMat.clippingPlanes = this.makeClippingPlanes(fn.zMin, fn.zMax);
    const placeholder = new THREE.Mesh(dGeo, dMat);
    placeholder.visible = false;
    this.scene.add(placeholder);
    this.meshes.set(fn.id, { mesh: placeholder, meshKey, paramKey, zMin: fn.zMin, zMax: fn.zMax });

    const res = fn.resolution;
    const xRange = fn.xMax - fn.xMin;
    const yRange = fn.yMax - fn.yMin;
    const xCenter = (fn.xMin + fn.xMax) / 2;
    const yCenter = (fn.yMin + fn.yMax) / 2;
    const color = fn.color;
    const wireframe = fn.wireframe;
    const zMin = fn.zMin;
    const zMax = fn.zMax;
    const currentParams: Record<string, number> = {};
    for (const p of fn.parameters) currentParams[p.name] = p.currentValue;

    computeMeshVerticesAsync({
      id: fn.id,
      expression: fn.expression,
      resolution: fn.resolution,
      xMin: fn.xMin, xMax: fn.xMax,
      yMin: fn.yMin, yMax: fn.yMax,
      parameters: currentParams,
    }).then((heights) => {
      this.explicitPendingKey.delete(fn.id);
      if (this.disposed) return;

      const currentEntry = this.meshes.get(fn.id);
      if (currentEntry && currentEntry.meshKey !== meshKey && this.explicitPendingKey.has(fn.id)) return;

      // 删掉旧 mesh（包括占位）
      if (currentEntry) {
        this.scene.remove(currentEntry.mesh);
        currentEntry.mesh.geometry.dispose();
        (currentEntry.mesh.material as THREE.Material).dispose();
      }

      const geometry = new THREE.PlaneGeometry(xRange, yRange, res, res);
      geometry.rotateX(-Math.PI / 2);

      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const h = heights[i];
        positions.setY(i, Number.isFinite(h) ? h : 0);
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
      this.meshes.set(fn.id, { mesh, meshKey, paramKey, zMin, zMax });
      this.onNeedsRender?.();
    }).catch(() => {
      this.explicitPendingKey.delete(fn.id);
    });
  }

  private updateMeshPositions(fn: ThreeDFunction, mesh: THREE.Mesh): void {
    const res = fn.resolution;
    const positions = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const xRange = fn.xMax - fn.xMin;
    const yRange = fn.yMax - fn.yMin;
    const xCenter = (fn.xMin + fn.xMax) / 2;
    const yCenter = (fn.yMin + fn.yMax) / 2;
    const currentParams: Record<string, number> = {};
    for (const p of fn.parameters) currentParams[p.name] = p.currentValue;

    for (let iy = 0; iy <= res; iy++) {
      for (let ix = 0; ix <= res; ix++) {
        const localX = -(xRange / 2) + (ix / res) * xRange;
        const localZ = (yRange / 2) - (iy / res) * yRange;
        const mathX = localX + xCenter;
        const mathY = -localZ + yCenter;
        const idx = iy * (res + 1) + ix;
        const z = fn.compiled(mathX, mathY, currentParams);
        positions.setY(idx, Number.isFinite(z) ? z : 0);
      }
    }

    positions.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingSphere();
  }

  private updateZClipping(entry: MeshEntry, zMin?: number, zMax?: number): void {
    const mat = entry.mesh.material as THREE.MeshPhongMaterial;
    const clippingPlanes = this.makeClippingPlanes(zMin, zMax);
    mat.clippingPlanes = clippingPlanes;
    mat.clipShadows = clippingPlanes.length > 0;
    entry.zMin = zMin;
    entry.zMax = zMax;
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
