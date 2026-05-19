// src/lib/threeD/threeDRenderManager.ts
import * as THREE from 'three';
import type { ThreeDFunction, Implicit3DFunction } from '../../types';
import { computeMeshVerticesAsync, computeImplicit3DAsync } from '../../workers/workerManager';

interface MeshEntry {
  mesh: THREE.Mesh;
  meshKey: string;
  zMin?: number;
  zMax?: number;
}

export class ThreeDRenderManager {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private meshes = new Map<string, MeshEntry>();
  private implicitMeshes = new Map<string, MeshEntry>();
  private disposed = false;
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

    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  // ========== 隐函数 ==========

  private updateOrCreateImplicitMesh(fn: Implicit3DFunction): void {
    const meshKey = `impl-${fn.id}-${fn.resolution}-${fn.wireframe}-${fn.expression}-${fn.xMin}-${fn.xMax}-${fn.yMin}-${fn.yMax}-${fn.zMin}-${fn.zMax}`;
    const existing = this.implicitMeshes.get(fn.id);

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
    const entry = this.implicitMeshes.get(id);
    if (!entry) return;
    this.scene.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    (entry.mesh.material as THREE.Material).dispose();
    this.implicitMeshes.delete(id);
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
