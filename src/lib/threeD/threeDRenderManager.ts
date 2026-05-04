// src/lib/threeD/threeDRenderManager.ts
import * as THREE from 'three';
import type { ThreeDFunction } from '../../types';

interface MeshEntry {
  mesh: THREE.Mesh;
  meshKey: string;
}

export class ThreeDRenderManager {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private meshes = new Map<string, MeshEntry>();
  private disposed = false;

  // 手动轨道控制
  // 初始视角：相机在第一卦限，目标点向Y正方向偏移6（世界Z=-6）
  // 画布上：X轴↘左下, Y轴→右, Z轴↑上，原点在画布偏左下方
  private spherical = { theta: -Math.PI / 6, phi: Math.PI / 4, radius: 22 };
  private target = new THREE.Vector3(2, 0, -8); // X+2, Y+8

  constructor() {
    this.canvas = document.createElement('canvas');

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0F172A');

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    this.updateCameraPosition();

    // 光照
    this.scene.add(new THREE.AmbientLight(0x404060, 2.0));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0x8888ff, 0.8);
    dirLight2.position.set(-10, -5, -10);
    this.scene.add(dirLight2);

    // XZ 平面网格（y=0 平面）
    const gridHelper = new THREE.GridHelper(20, 20, 0x4B5563, 0x1F2937);
    gridHelper.name = 'grid';
    this.scene.add(gridHelper);

    // 自定义坐标轴（带刻度标记）
    this.createAxes();

    // 上下文丢失处理
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
  }

  /** 创建自定义坐标轴 — 右手定则: X × Y = Z
   *  世界X→标签X(红,右), 世界-Z→标签Y(绿,朝向观察者), 世界Y→标签Z(蓝,上)
   */
  private createAxes(): void {
    const axisLength = 12;

    // X轴 - 红色 → 世界X方向 (水平向右)
    this.addAxisLine(
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0),
      0xff4444,
    );
    // Y轴 - 绿色 → 世界-Z方向 (朝向观察者)
    this.addAxisLine(
      new THREE.Vector3(0, 0, axisLength),
      new THREE.Vector3(0, 0, -axisLength),
      0x44ff44,
    );
    // Z轴 - 蓝色 → 世界Y方向 (垂直向上)
    this.addAxisLine(
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0),
      0x4488ff,
    );

    // 轴端标签（箭头指向的位置）
    this.addAxisLabel('X', new THREE.Vector3(axisLength + 0.8, 0, 0), '#ff6666');
    this.addAxisLabel('Y', new THREE.Vector3(0, 0, -axisLength - 0.8), '#66ff66');
    this.addAxisLabel('Z', new THREE.Vector3(0, axisLength + 0.8, 0), '#6699ff');

    // 原点小球
    const originGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const originMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const origin = new THREE.Mesh(originGeo, originMat);
    origin.name = 'origin';
    this.scene.add(origin);
  }

  private addAxisLine(from: THREE.Vector3, to: THREE.Vector3, color: number): void {
    const material = new THREE.LineBasicMaterial({ color, linewidth: 1, transparent: true, opacity: 0.7 });
    const points = [from, to];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.name = 'axis';
    this.scene.add(line);

    // 箭头（小 cone）
    const dir = to.clone().sub(from).normalize();
    const arrowGeo = new THREE.ConeGeometry(0.12, 0.5, 8);
    const arrowMat = new THREE.MeshBasicMaterial({ color });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.copy(to);
    // 让 cone 尖端指向轴末端
    arrow.rotation.z = -Math.PI / 2; // cone 默认尖端朝 +Y，需要旋转
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
    // 标准"抓取"直觉：向右拖→物体向右转，向上拖→相机升高
    this.spherical.theta += dx * 0.008;
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - dy * 0.008));
    this.updateCameraPosition();
  }

  /** 光标中心缩放：鼠标指哪就放大哪，相机沿视线方向移动 */
  handleZoom(delta: number, ndcX: number, ndcY: number): void {
    const zoomFactor = delta > 0 ? 1.1 : 0.9;

    // 射线检测光标指向的底平面（y=0）交点
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(floorPlane, hitPoint)) {
      // 从相机到光标点的方向和距离
      const toCursor = hitPoint.clone().sub(this.camera.position);
      const distToCursor = toCursor.length();
      const dirToCursor = toCursor.normalize();

      // 新距离 = 旧距离 × 缩放因子
      const newDist = distToCursor * zoomFactor;
      const deltaDist = distToCursor - newDist;

      // 相机沿光标方向移动
      this.camera.position.addScaledVector(dirToCursor, deltaDist);
      // target 同向移动以保持观察方向
      this.target.addScaledVector(dirToCursor, deltaDist);
    } else {
      // 光标没打到底面（如看向天空），沿视线缩放
      const forward = this.target.clone().sub(this.camera.position).normalize();
      const moveDelta = this.spherical.radius * (1 - zoomFactor);
      this.camera.position.addScaledVector(forward, moveDelta);
      this.target.addScaledVector(forward, moveDelta);
    }

    // 从新的相机/目标位置重建球坐标
    const offset = this.camera.position.clone().sub(this.target);
    this.spherical.radius = Math.max(3, Math.min(100, offset.length()));
    this.spherical.theta = Math.atan2(offset.z, offset.x);
    this.spherical.phi = Math.acos(Math.max(-1, Math.min(1, offset.y / this.spherical.radius)));
    this.camera.lookAt(this.target);
  }

  handlePan(dx: number, dy: number): void {
    // 根据当前相机方向计算平移向量
    const cameraDir = this.target.clone().sub(this.camera.position).normalize();
    const cameraRight = new THREE.Vector3().crossVectors(
      cameraDir,
      new THREE.Vector3(0, 1, 0),
    ).normalize();
    const cameraUp = new THREE.Vector3().crossVectors(cameraRight, cameraDir).normalize();

    const panSpeed = this.spherical.radius * 0.001;
    this.target.add(cameraRight.multiplyScalar(-dx * panSpeed));
    this.target.add(cameraUp.multiplyScalar(dy * panSpeed));
    this.updateCameraPosition();
  }

  resetCamera(): void {
    this.spherical = { theta: -Math.PI / 6, phi: Math.PI / 4, radius: 22 };
    this.target.set(2, 0, -8);
    this.updateCameraPosition();
  }

  renderToCanvas(
    functions: ThreeDFunction[],
    size: { width: number; height: number },
  ): HTMLCanvasElement {
    if (this.disposed) return this.canvas;

    this.resize(size.width, size.height);

    const activeIds = new Set<string>();

    for (const fn of functions) {
      if (!fn.visible || fn.error) continue;
      activeIds.add(fn.id);
      this.updateOrCreateMesh(fn);
    }

    // 移除不在列表中的 mesh
    for (const [id] of this.meshes) {
      if (!activeIds.has(id)) {
        this.removeMesh(id);
      }
    }

    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  private updateOrCreateMesh(fn: ThreeDFunction): void {
    const meshKey = `${fn.id}-${fn.resolution}-${fn.wireframe}-${fn.expression}`;
    const existing = this.meshes.get(fn.id);

    if (existing && existing.meshKey === meshKey) {
      (existing.mesh.material as THREE.MeshPhongMaterial).color.set(fn.color);
      existing.mesh.visible = true;
      return;
    }

    // 移除旧 mesh（如果 key 变了）
    this.removeMesh(fn.id);

    const res = fn.resolution;
    const size = 20; // X/Y 范围 [-10, 10]
    const geometry = new THREE.PlaneGeometry(size, size, res, res);
    geometry.rotateX(-Math.PI / 2); // 放平到 XZ 平面

    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = fn.compiled(x, -z); // Y轴正方向=世界-Z=朝观察者，故取反
      positions.setY(i, Number.isFinite(y) ? y : 0);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: fn.color,
      wireframe: fn.wireframe,
      side: THREE.DoubleSide,
      shininess: 30,
      specular: new THREE.Color(0x111111),
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);

    this.meshes.set(fn.id, { mesh, meshKey });
  }

  private removeMesh(id: string): void {
    const entry = this.meshes.get(id);
    if (!entry) return;

    this.scene.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    (entry.mesh.material as THREE.Material).dispose();
    this.meshes.delete(id);
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  dispose(): void {
    for (const [id] of this.meshes) {
      this.removeMesh(id);
    }
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.dispose();
    this.disposed = true;
  }
}

// 单例
let managerInstance: ThreeDRenderManager | null = null;

export function getThreeDRenderManager(): ThreeDRenderManager {
  if (!managerInstance || managerInstance.isDisposed()) {
    managerInstance?.dispose();
    managerInstance = new ThreeDRenderManager();
  }
  return managerInstance;
}
