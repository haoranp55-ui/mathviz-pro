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
