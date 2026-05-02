# MathViz Pro 开发经验总结

> 记录每次开发中的关键教训，避免重复踩坑。

---

## 第 1 条：算法选择 > 实现优化

### 问题背景
隐函数 `x*y=1` 在渐近线附近产生"杂线"，尝试了多种补丁都无效：
- 调斜率阈值
- 加 Asymptotic Decider 处理歧义
- 各种边界判断

### 根本原因
**用错了算法**。传统 Marching Squares 只看网格角点的"符号变化"，无法区分：
- 真正的 f(x,y)=0 曲线穿越
- 函数值"穿过无穷大"（渐近线）

### 解决方案
换用 **Interval Arithmetic（区间算术）**：
- 对像素区域计算函数值的"区间范围"
- 区间 `[-5, 5]` 包含 0 → 真正的曲线
- 区间 `[-∞, +∞]` 包含无穷大 → 渐近线，跳过

```typescript
// implicitSamplerInterval.ts
export function createIntervalFunction(fn) {
  return (xInterval, yInterval) => {
    // 采样角点和中心点
    const samples = [fn(xLo, yLo), fn(xHi, yHi), ...];
    
    // 检测是否跨越渐近线
    const posInf = samples.some(v => v > 1e10);
    const negInf = samples.some(v => v < -1e10);
    if (posInf && negInf) {
      return new Interval(-Infinity, Infinity); // 渐近线
    }
    return new Interval(minVal, maxVal);
  };
}
```

### 经验教训

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   当一个问题的补丁越打越多、越打越复杂时           │
│   → 停下来，问自己：是不是算法本身选错了？         │
│                                                     │
│   换算法的代价可能很高，但比无休止的打补丁便宜     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 相关文件
- `src/lib/implicitSamplerInterval.ts` - 区间算术采样器
- `src/lib/implicitSampler.ts` - 旧算法（保留对比）

### 验证日期
2026-05-01

---

## 第 10 条：算法假设必须与输入数据一致

### 问题背景
线性函数 `y = ax + b` 的关键点检测异常：整条线上布满拐点/极值点标记。

### 根本原因
**导数计算假设了"均匀采样"，但输入是"非均匀采样"**。

`keyPointDetector.ts` 使用固定 `dx` 计算导数：
```typescript
const dx = x[1] - x[0];  // 全局固定间距
dy[i] = (y[i+1] - y[i-1]) / (2 * dx);
ddy[i] = (y[i+1] - 2*y[i] + y[i-1]) / (dx * dx);
```

但 `sampler.ts` 使用自适应采样，在陡峭/不连续区域加密，导致点间距不均匀。固定 `dx` 公式在非均匀网格上产生：
- 线性函数二阶导数 ≠ 0（理论应为 0）
- 虚假符号变化 → 大量误报关键点

### 解决方案
使用与数据特征匹配的导数公式：
```typescript
// 局部间距感知的一阶导数
dy[i] = (y[i+1] - y[i-1]) / (x[i+1] - x[i-1]);

// 非均匀网格的二阶导数（对线性函数精确为 0）
const s1 = (y[i] - y[i-1]) / (x[i] - x[i-1]);
const s2 = (y[i+1] - y[i]) / (x[i+1] - x[i]);
ddy[i] = 2 * (s2 - s1) / (x[i+1] - x[i-1]);
```

### 经验教训

```
+---------------------------------------------------+
|                                                   |
|   算法假设必须与输入数据特征一致                  |
|                                                   |
|   假设均匀采样 → 数据非均匀 → 结果错误            |
|                                                   |
|   修复不是"调参数"，而是"换公式"                  |
|   让算法适应数据，而非让数据适应算法              |
|                                                   |
+---------------------------------------------------+
```

### 相关文件
- `src/lib/keyPointDetector.ts` - 关键点检测算法
- `src/lib/sampler.ts` - 自适应采样器（产生非均匀点）

### 验证日期
2026-05-02

---

## 第 13 条：数值算法必须主动识别"数值不稳定区域"

### 问题背景
`tan(x)` 在 `π/2` 附近被错误标注"零点"和"极大值点"；`1/x` 在 `x=0` 处被错误标注"拐点"。这些假阳性严重影响了用户体验。

### 根本原因
**将"数学坐标上的符号变化"与"真正的数学特征"混为一谈**。

渐近线附近的采样点看似"正常"：
```
x = 1.569  →  tan(x) = 603      (有限值)
x = 1.571  →  tan(x) = -1676    (有限值)
```
两者符号相反、都有限，旧代码直接判定为"零点穿越"。但这不是零点，而是函数值趋向 ±∞ 的渐近线两侧。

数值微分在渐近线附近同样不可靠：
```
dy = (y[i+1] - y[i-1]) / h
   = (-1676 - 603) / 0.002
   ≈ -1.1e6        (导数从 +∞ 跳变到 -∞ 的数值残留)
```
这个巨大的导数跳变被误判为"导数从正变负 → 极大值点"。

### 解决方案
三层防护体系：

**第一层：预标记渐近线区域**
```typescript
// 相邻采样点斜率 > 1e6 → 渐近线，标记附近点为 unstable
const slope = Math.abs(y[i] - y[i-1]) / (x[i] - x[i-1]);
if (slope > 1e6) unstable[i] = true;
```

**第二层：导数/函数值阈值**
```typescript
// 导数过大说明数值失真，不可信
if (Math.abs(dy[i-1]) > 1e5 || Math.abs(dy[i+1]) > 1e5) continue;
```

**第三层：函数值验证（极值点）**
```typescript
// 即使 dy 符号变化，也要求 y[i] 确实是附近窗口内的最大/最小值
function isLocalMax(y, i) {
  for (let j = i-3; j <= i+3; j++) {
    if (y[j] > y[i]) return false;
  }
  return true;
}
```

### 经验教训

```
+-----------------------------------------------------------+
│                                                           │
│   数值算法不能只依赖"数学条件是否满足"                     │
│                                                           │
│   在渐近线、奇点、大值区域，有限精度的采样                 │
│   会产生"看起来满足条件但实际是数值噪声"的数据             │
│                                                           │
│   → 必须先问："这个区域的数值是否稳定？"                   │
│   → 再问："数学条件是否满足？"                             │
│                                                           │
│   顺序不能反，否则假阳性永远消不完                         │
│                                                           │
+-----------------------------------------------------------+
```

### 相关文件
- `src/lib/keyPointDetector.ts` - 关键点检测与三层防护
- `src/lib/sampler.ts` - 自适应采样（问题区域加密）
- `src/components/Canvas/CurveRenderer.ts` - 曲线渲染渐近线检测

### 验证日期
2026-05-02

---

## 第 2 条：采样范围与渲染范围必须统一

### 问题背景
切换到 `aspectRatioMode: 'equal'` 后，函数曲线和网格在画布边缘出现"脱节"：
- 曲线消失
- 网格不覆盖边缘
- 移动视口时"相对运动"

### 根本原因
**三个"范围"不同步**：

| 范围 | 计算依据 | 问题 |
|-----|---------|------|
| 采样范围 | viewPort 数学坐标 | 不考虑 equal 模式偏移 |
| 渲染范围 | canvasSize + equal 偏移 | 居中显示，左右有空白 |
| 视口范围 | 用户看到的数学区域 | 只是定义 |

### 解决方案
创建统一的 `RenderContext`，所有模块使用同一个参考系：

```typescript
// transformer.ts
export interface RenderContext {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  sampleXMin: number;  // 采样范围
  sampleXMax: number;
  actualWidth: number; // 实际渲染像素
  offsetX: number;     // 偏移量
}

export function createRenderContext(
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode
): RenderContext {
  // 统一计算所有范围...
}
```

### 经验教训

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   坐标变换是图形渲染的核心                          │
│   → 所有模块必须使用同一个"参考系"                 │
│   → 采样范围要覆盖渲染范围                          │
│                                                     │
│   不然会出现"相对运动"、"边缘消失"等诡异问题       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 相关文件
- `src/lib/transformer.ts` - RenderContext 定义
- `src/components/Canvas/FunctionCanvas.tsx` - 统一使用

### 验证日期
2026-05-01

---

## 第 3 条：渐近线是"断开"而非"连接"

### 问题背景
普通函数 `y=1/x` 在 x=0 处出现一条贯穿画布的绿色垂直线。

### 根本原因
错误地认为渐近线需要"画出来"。检测到斜率很大时，主动画了一条垂直线。

### 正确做法
**渐近线处应该断开路径，不画任何线**：

```typescript
// CurveRenderer.ts
if (slope > ASYMPTOTE_SLOPE_THRESHOLD) {
  ctx.stroke();      // 结束当前路径
  ctx.beginPath();   // 开始新路径
  isDrawing = false;
  // 不要画线！继续处理下一个点
}
```

### 经验教训

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   渐近线 = 函数"不存在"的点                        │
│                                                     │
│   不要试图"画出来"不存在的东西                     │
│   → 断开路径就够了                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 相关文件
- `src/components/Canvas/CurveRenderer.ts`

### 验证日期
2026-05-01

---

## 第 4 条：固定采样密度在不同场景下都不对

### 问题背景
传统采样使用固定采样点数（如 1000 点）：
- **小窗口浪费**：300px 宽用 1000 点，每像素 3+ 采样点
- **大窗口不足**：2000px 宽用 1000 点，每像素 0.5 采样点，曲线锯齿

### 根本原因
**采样密度应该与像素挂钩，而不是固定数值**。

### 解决方案
像素自适应采样：采样点数 = 画布像素宽度 × 精度倍数

```typescript
// FunctionCanvas.tsx
const preset = SAMPLE_PRESETS[samplePreset];
const pixelBasedCount = canvasSize.width * preset.multiplier;
const dynamicSampleCount = Math.max(500, Math.min(pixelBasedCount, preset.maxCount));
```

### 经验教训

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   采样密度应该"跟随像素"而非"固定数值"            │
│                                                     │
│   像素多 → 采样点多                                │
│   像素少 → 采样点少                                │
│                                                     │
│   这样才能在不同窗口大小下都保持一致的视觉效果     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 相关文件
- `src/lib/sampler.ts` - PixelAdaptive 算法
- `src/types/index.ts` - SAMPLE_PRESETS 定义

### 验证日期
2026-05-01

---

## 第 5 条：渐近线附近固定密度永远不够

### 问题背景
`tan(x)` 在 π/2 附近斜率趋近无穷大，即使采样 100000 点，渐近线附近仍有破绽。

### 根本原因
**渐近线附近的"陡峭"是无限的**，任何固定密度都无法捕捉。

### 解决方案
斜率自适应加密：平坦稀疏，陡峭加密，递归细分。

```typescript
// sampler.ts
function detectProblemRegions(points) {
  // 检测斜率突变
  const slopeRatio = Math.abs(slope2 / slope1);
  if (slopeRatio > 3.0) {
    regions.push({ start: prevX, end: nextX });
  }
  
  // 检测函数值跳变
  if (Math.abs(currY - prevY) > 100) {
    regions.push({ start: prevX, end: nextX });
  }
}

function refineRegion(fn, xStart, xEnd, depth, maxDepth) {
  // 递归加密，最多 4 层
  if (depth < maxDepth) {
    // 继续检测并细分...
  }
}
```

### 经验教训

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   有些问题是"无限的"，用"有限"的方法永远解决不了  │
│                                                     │
│   解决方案：递归细分                                │
│   → 让密度"自适应"问题的难度                       │
│   → 问题越难，密度越高                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 相关文件
- `src/lib/sampler.ts` - SlopeAdaptive 算法

### 验证日期
2026-05-01

---

## 第 6 条：缓存要考虑"参数变化"场景

### 问题背景
用户拖动参数滑钮时，每次都重新采样，即使参数变化很小。

### 根本原因
**没有识别"可复用"的采样结果**。

### 解决方案
LRU 缓存：记录采样参数，相同参数直接返回缓存。

```typescript
// sampler.ts
class SampleCacheManager {
  get(cacheId, xMin, xMax, sampleCount, params) {
    const cached = this.cache.get(cacheId);
    // 检查参数是否匹配
    if (JSON.stringify(cached.params) === JSON.stringify(params)) {
      return cached.points;
    }
    return null;
  }
}
```

### 经验教训

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   重复计算是性能杀手                                │
│                                                     │
│   缓存键设计要考虑所有"影响结果"的参数：           │
│   → 视口范围                                        │
│   → 采样精度                                        │
│   → 函数参数                                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 相关文件
- `src/lib/sampler.ts` - SmartCache 算法

### 验证日期
2026-05-01

---

## 第 7 条：边缘破绽来自"采样不够"

### 问题背景
用户平移视图时，新进入视口的区域没有采样点，导致边缘"破绽"。

### 根本原因
**采样范围 = 视口范围**，没有预留缓冲。

### 解决方案
视口扩展采样：采样范围比视口大 10%。

```typescript
// FunctionCanvas.tsx
const xRange = viewPort.xMax - viewPort.xMin;
const padding = xRange * 0.1;
const sampleXMin = viewPort.xMin - padding;
const sampleXMax = viewPort.xMax + padding;
```

### 经验教训

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   用户交互是不可预测的                              │
│   → 可能随时平移、缩放                              │
│                                                     │
│   预留缓冲区（10%）可以避免边缘破绽                │
│   → 代价小，效果好                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 相关文件
- `src/components/Canvas/FunctionCanvas.tsx`

### 验证日期
2026-05-01

---

## 第 8 条：奇点函数需要"数学变换"而非"数值处理"

### 问题背景
隐函数 `y = tan(x)` 在渐近线 x = π/2 附近：
- CPU 渲染：曲线在渐近线附近消失或产生假曲线
- WebGL 渲染：整个曲线消失（因为 tan(x) 趋向无穷大）

尝试的方案都失败了：
- 增大采样密度 → 无论多大都无法捕捉"穿过无穷大"的曲线
- 检测奇点跳过 → 曲线在渐近线附近消失
- 梯度检测 → 产生假曲线（渐近线被误认为曲线）

### 根本原因
**数值方法无法处理"无穷大"**。

`y = tan(x)` 在 x = π/2 处：
- tan(x) 从 +∞ 突变到 -∞
- Marching Squares 检测到符号变化，错误地认为这里有曲线
- 实际上曲线是"穿过无穷大"延伸到视口外的

### 解决方案
**数学变换**：将奇点函数转换为等价的无奇点形式。

```typescript
// implicitParser.ts
// tan(x) → sin(x)/cos(x)
// 然后：F(x,y) - tan(x) = 0
//   → F(x,y) - sin(x)/cos(x) = 0
//   → F(x,y)*cos(x) - sin(x) = 0  （乘分母消去除法）

function convertSingularityFunctions(node: MathNode): MathNode {
  return node.transform((n) => {
    if (n.type === 'FunctionNode' && n.fn.name === 'tan') {
      return divide(sin(n.args), cos(n.args));
    }
    return n;
  });
}

function eliminateDivision(node: MathNode): MathNode {
  // 收集所有分母
  const denominators = collectDenominators(node);
  // 将所有分母乘到整个表达式上
  for (const denom of denominators) {
    node = multiply(node, denom);
  }
  return node;
}
```

转换效果：
| 原始表达式 | 转换后 |
|-----------|--------|
| `y = tan(x)` | `cos(x)*y - sin(x) = 0` |
| `y = cot(x)` | `sin(x)*y - cos(x) = 0` |
| `y = sec(x)` | `y*cos(x) - 1 = 0` |
| `a*y + b = tan(k*x)` | `cos(k*x)*(a*y + b) - sin(k*x) = 0` |

### 经验教训

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   数值方法无法处理"无穷大"                          │
│                                                     │
│   解决方案：数学变换                                │
│   → 将奇点函数转换为等价的无奇点形式               │
│   → tan(x) → sin(x)/cos(x) → 乘分母消去除法        │
│                                                     │
│   核心思想：在"表达式层面"解决问题，而非"数值层面" │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 相关文件
- `src/lib/implicitParser.ts` - 自动转换逻辑
- `src/lib/webgl/glslCompiler.ts` - GLSL 表达式编译
- `src/lib/implicitSamplerInterval.ts` - 奇点检测

### 验证日期
2026-05-01

---

## 第 9 条：WebGL 和 CPU 渲染需要统一坐标系

### 问题背景
WebGL 渲染的隐函数曲线与 CPU 渲染的网格/坐标轴发生"相对运动"：
- 平移视图时，曲线和网格移动距离不一致
- 圆形曲线被渲染成椭圆

### 根本原因
**WebGL 和 Canvas 2D 使用不同的坐标系**：

| 坐标系 | Y 轴方向 | 原点位置 |
|-------|---------|---------|
| Canvas 2D | Y 向下（顶部=0） | 左上角 |
| WebGL | Y 向上（底部=0） | 左下角 |

### 解决方案
在 WebGL 着色器中进行坐标转换，并正确处理 `aspectRatioMode: 'equal'`：

```glsl
// implicitRendererWebGL.ts
void main() {
  // WebGL 坐标 → Canvas 2D 坐标
  float canvasY = u_resolution.y - gl_FragCoord.y;
  vec2 canvasCoord = vec2(gl_FragCoord.x, canvasY);
  
  // Canvas 像素 → 数学坐标（考虑 renderRegion 偏移）
  vec2 localCoord = (canvasCoord - u_renderRegion.xy) / u_renderRegion.zw;
  float x = u_viewPort.x + localCoord.x * (u_viewPort.y - u_viewPort.x);
  float y = u_viewPort.z + (1.0 - localCoord.y) * (u_viewPort.w - u_viewPort.z);
  
  // 计算函数值...
}
```

### 经验教训

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   不同渲染系统使用不同的坐标系                      │
│                                                     │
│   混合使用时必须统一：                              │
│   → 明确每个系统的坐标系定义                        │
│   → 在边界处进行正确转换                            │
│   → 考虑 aspect ratio 模式的影响                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 相关文件
- `src/lib/webgl/implicitRendererWebGL.ts` - WebGL 着色器
- `src/components/Canvas/FunctionCanvas.tsx` - renderRegion 传递

### 验证日期
2026-05-01


---

## 第 10 条：算法假设必须与输入数据一致

### 问题背景
线性函数 `y = ax + b` 的关键点检测异常：整条线上布满拐点/极值点标记。

### 根本原因
**导数计算假设了"均匀采样"，但输入是"非均匀采样"**。

`keyPointDetector.ts` 使用固定 `dx` 计算导数：
```typescript
const dx = x[1] - x[0];  // 全局固定间距
dy[i] = (y[i+1] - y[i-1]) / (2 * dx);
ddy[i] = (y[i+1] - 2*y[i] + y[i-1]) / (dx * dx);
```

但 `sampler.ts` 使用自适应采样，在陡峭/不连续区域加密，导致点间距不均匀。固定 `dx` 公式在非均匀网格上产生：
- 线性函数二阶导数 ≠ 0（理论应为 0）
- 虚假符号变化 → 大量误报关键点

### 解决方案
使用与数据特征匹配的导数公式：
```typescript
// 局部间距感知的一阶导数
dy[i] = (y[i+1] - y[i-1]) / (x[i+1] - x[i-1]);

// 非均匀网格的二阶导数（对线性函数精确为 0）
const s1 = (y[i] - y[i-1]) / (x[i] - x[i-1]);
const s2 = (y[i+1] - y[i]) / (x[i+1] - x[i]);
ddy[i] = 2 * (s2 - s1) / (x[i+1] - x[i-1]);
```

### 经验教训

```
+---------------------------------------------------+
|                                                   |
|   算法假设必须与输入数据特征一致                  |
|                                                   |
|   假设均匀采样 → 数据非均匀 → 结果错误            |
|                                                   |
|   修复不是"调参数"，而是"换公式"                  |
|   让算法适应数据，而非让数据适应算法              |
|                                                   |
+---------------------------------------------------+
```

### 相关文件
- `src/lib/keyPointDetector.ts` - 关键点检测算法
- `src/lib/sampler.ts` - 自适应采样器（产生非均匀点）

### 验证日期
2026-05-02


---

## 第 11 条：缓存匹配不要用精确浮点相等

### 问题背景
普通函数采样器的 `SmartCache` 几乎从不命中。用户平移/缩放视图时，每次都要重新采样，CPU 占用率高。

### 根本原因
```typescript
// sampler.ts
if (cached.xMin === xMin && cached.xMax === xMax && cached.sampleCount === sampleCount) {
```

鼠标滚轮缩放产生的 `xMin` 可能是 `-10.0000000001`，而缓存中是 `-10`。两者差异 `1e-10` 人眼不可感知，但 `===` 判定为不相等，导致缓存永远 miss。

### 解决方案
使用容差比较：
```typescript
function floatMatch(a: number, b: number, tolerance: number = 1e-9): boolean {
  return Math.abs(a - b) < tolerance;
}
```

参数比较也要避免 `JSON.stringify` 的键顺序陷阱：
```typescript
// 错误：{a:1, b:2} !== {b:2, a:1}
JSON.stringify(cached.params) === JSON.stringify(params)

// 正确：遍历键并容差比较值
function paramsMatch(a, b, tolerance = 1e-9) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!(key in b)) return false;
    if (!floatMatch(a[key], b[key], tolerance)) return false;
  }
  return true;
}
```

### 经验教训

```
+---------------------------------------------------+
|                                                   |
|   浮点数比较永远不要用 ===                        |
|                                                   |
|   用户交互产生的浮点误差是不可避免的               |
|   1e-10 的差异对人眼不可感知，但对 === 是"不等"   |
|                                                   |
|   缓存匹配的核心是"语义等价"，不是"位精确"        |
|                                                   |
+---------------------------------------------------+
```

### 相关文件
- `src/lib/sampler.ts` - 普通函数采样缓存
- `src/lib/implicitSamplerInterval.ts` - 隐函数网格缓存（已使用视口容差，但无全局大小限制）

### 验证日期
2026-05-02

---

## 第 12 条：警惕"计算了再计算"的冗余求值

### 问题背景
隐函数 `intervalMarchingSquares` 算法性能低下，CPU 占用明显过高。

### 根本原因
调用链中的冗余函数求值：
```typescript
// 第一层：intervalMarchingSquares 已计算
const v0 = fn(x, y);
const v1 = fn(x + w, y);
const v2 = fn(x + w, y + h);
const v3 = fn(x, y + h);

// 第二层：extractSegment 又计算了一遍
function extractSegment(fn, cell, segments) {
  const v0 = fn(x, y);        // 重复！
  const v1 = fn(x + w, y);    // 重复！
  // ...
}
```

每个被接受的单元格浪费 4 次函数求值。对于复杂函数（如 `sin(100x)*sin(100y)=0.5`），这是严重的性能瓶颈。

### 解决方案
将已计算的值作为参数传递：
```typescript
// 调用方
extractSegment(cell, segments, v0, v1, v2, v3);

// 接收方
function extractSegment(cell, segments, v0, v1, v2, v3) {
  // 直接使用传入的值
}
```

### 经验教训

```
+---------------------------------------------------+
|                                                   |
|   性能优化不只是"算法复杂度"                       |
|                                                   |
|   常数因子上的冗余计算，累积起来就是性能杀手        |
|                                                   |
|   在调用链中传递已计算的值，而不是重新计算          |
|   这是"数据流"思维 vs "重新计算"思维的区别          |
|                                                   |
+---------------------------------------------------+
```

### 相关文件
- `src/lib/implicitSamplerInterval.ts` - `intervalMarchingSquares` 与 `extractSegment`

### 验证日期
2026-05-02
