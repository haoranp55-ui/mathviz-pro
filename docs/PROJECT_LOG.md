# MathViz Pro 项目开发日志

---

## 第 7 次更新 - 2026-05-02

### Bug 修复：线性函数关键点异常

**问题**：线性函数（如 `2x+1`、`ax+b`）的关键点显示异常，整条线上布满拐点/极值点标记。

**根本原因**：`keyPointDetector.ts` 使用固定 `dx` 计算导数，但 `sampler.ts` 的自适应采样会产生非均匀间距的点。对于线性函数，二阶导数理论值为 0，但固定 `dx` 公式在非均匀网格上产生虚假的符号变化，导致：
- 拐点检测：`ddy[i-1] * ddy[i+1] < 0` 频繁触发
- 极值点检测：`dy` 因间距缩放出现虚假波动

**修复方案**：使用局部间距感知的有限差分公式：
```typescript
// 一阶导数：直接使用相邻点的实际间距
dy[i] = (y[i+1] - y[i-1]) / (x[i+1] - x[i-1]);

// 二阶导数：非均匀网格 3 点公式（对线性函数精确为 0）
const s1 = (y[i] - y[i-1]) / (x[i] - x[i-1]);
const s2 = (y[i+1] - y[i]) / (x[i+1] - x[i]);
ddy[i] = 2 * (s2 - s1) / (x[i+1] - x[i-1]);
```

**验证结果**：
| 函数 | 一阶导数 | 二阶导数 | 误报数 |
|-----|---------|---------|--------|
| `y = 2x + 1` | 精确 = 2 | 精确 = 0 | 0 |
| `y = x^2` | — | 精确 = 2 | 0 |

### 修改文件
| 文件 | 变更 |
|-----|------|
| `src/lib/keyPointDetector.ts` | 导数计算改为局部间距感知公式 |

---

## 第 8 次更新 - 2026-05-02

### 采样算法对比分析与 Bug 修复

**分析结论**：隐函数采样器（`implicitSamplerInterval.ts`）比普通函数采样器（`sampler.ts`）**架构更先进**：

| 维度 | 普通函数采样器 | 隐函数采样器 |
|-----|---------------|-------------|
| 维度 | 1D（x → y） | 2D（x,y → 等高线） |
| 自适应 | 斜率递归加密 | 栈式四叉树细分 |
| 拓扑 | 函数图像 | 闭合环路、自相交 |
| 后处理 | 无 | 路径连接 + Catmull-Rom 平滑 |
| 缓存 | LRU（50条） | 双缓存（网格+线段） |

**但二者不能互相替代**：普通函数是单值映射 `y=f(x)`，隐函数是零等高线 `F(x,y)=0`。用隐函数采样器渲染普通函数会极慢（2D 网格找 1D 曲线），用普通函数采样器渲染隐函数会漏掉垂直切线和闭合环路。

**可共享的改进**：Catmull-Rom 平滑、栈式迭代避免递归溢出。

### 修复的风险点

| 风险 | 文件 | 严重度 | 修复方案 |
|-----|------|--------|---------|
| **冗余函数求值** | `implicitSamplerInterval.ts` | 高 | `extractSegment` 传入已计算的角点值，避免重复求值 |
| **缓存永不命中** | `sampler.ts` | 高 | 视口坐标比较改用容差匹配（`1e-9`），参数比较改用键顺序无关 + 容差 |
| **内存泄漏** | `implicitSamplerInterval.ts` | 中 | `gridCacheMap` 添加最大 20 条限制，超出时淘汰最旧条目 |
| **误导性未使用参数** | `sampler.ts` / `implicitSamplerInterval.ts` | 低 | 移除 `detectProblemRegions` 和 `getEdgePoint` 的 `_fn` 参数 |

### 修改文件
| 文件 | 变更 |
|-----|------|
| `src/lib/implicitSamplerInterval.ts` | `extractSegment` 改为接收角点值，避免重复求值；`gridCacheMap` 添加 LRU 淘汰；移除 `getEdgePoint` 的 `_fn` 参数 |
| `src/lib/sampler.ts` | 缓存比较改用 `floatMatch` + `paramsMatch`（带容差）；移除 `detectProblemRegions` 的 `_fn` 参数 |

---

## 第 9 次更新 - 2026-05-02

### Bug 修复：恢复 `FunctionCanvas.tsx` 被误删的交互代码

**问题**：修复"关键点异常"的过程中，`FunctionCanvas.tsx` 被意外重构，导致：
1. 普通函数/参数化函数鼠标悬停不再显示坐标
2. 隐函数即使鼠标远离也会显示坐标
3. 输入具体 x 值后不在图上标点

**根本原因**：`FunctionCanvas.tsx` 的 `handleMouseMove` 和 `render` 回调中被删除了约 120 行核心交互代码：
- 普通/参数化函数悬停检测循环被删除
- 隐函数悬停从"像素坐标+像素距离"被错误改为"数学坐标+数学距离"（阈值 12 数学单位 ≈ 480 像素）
- `selectedFunctionId` + `evaluateX` 的十字线和发光圆点绘制被删除
- `markedPoints`（标记点）的绘制代码被删除

**修复方案**：将 `FunctionCanvas.tsx` 恢复到上一次提交（HEAD）的完整版本，恢复所有交互功能。

### 修改文件
| 文件 | 变更 |
|-----|------|
| `src/components/Canvas/FunctionCanvas.tsx` | 恢复被删除的悬停检测、evaluateX 标点、markedPoints 绘制代码 |

---

## 第 10 次更新 - 2026-05-02

### 修复：陡峭函数悬停检测断断续续

**问题**：`tan(x)` 靠近 π/2、`ln(x)` 靠近 0 等陡峭区域，鼠标悬停时坐标显示断断续续。

**根本原因**：`handleMouseMove` 使用**"相同 x 坐标的垂直距离"**检测悬停：
```typescript
const y = fn.compiled(mathCoord.x);  // 只在鼠标的 x 坐标处计算 y
const distance = Math.sqrt((px - pointPx)**2 + (py - pointPy)**2);
```

对于近乎垂直的曲线，鼠标在曲线旁边时，相同 x 处的 y 偏差巨大，像素距离远超 12px 阈值，导致悬停不触发。

**修复方案**：改用**"点到折线距离"**，与隐函数悬停检测保持一致：
1. 在 `render` 中将普通/参数化函数的采样点缓存到 `functionPointsRef`
2. 在 `handleMouseMove` 中遍历采样点形成的线段，计算鼠标到每条线段的最近距离
3. 复用 `CurveRenderer` 的渐近线断开逻辑（斜率 > 50000 时断开路径，不跨渐近线检测）

**效果**：
- `tan(x)` 在 π/2 附近：鼠标靠近任意线段即触发悬停，不再断断续续
- `ln(x)` 在 x=0 附近：同理，悬停检测与视觉曲线完全对应

### 修改文件
| 文件 | 变更 |
|-----|------|
| `src/components/Canvas/FunctionCanvas.tsx` | 悬停检测从"相同x坐标"改为"点到折线距离"；新增 `functionPointsRef` 缓存采样点 |

---

## 第 11 次更新 - 2026-05-02

### 修复：`ln(x)` 等定义域受限函数渲染卡顿

**问题**：输入 `ln(x)` 后普通函数/参数化函数模块严重卡顿。

**根本原因**：`detectProblemRegions` 对无效点（NaN/Infinity）的处理过于激进：
```typescript
if (!isFinite(prevY) || !isFinite(currY) || !isFinite(nextY)) {
  regions.push({ start: prevX, end: nextX, depth: currentDepth + 1 });
}
```

只要三元组中**至少一个**点是 NaN 就触发加密。对于 `ln(x)` 在默认视口 [-10, 10] 上：
- 约 50% 采样点在 x < 0 处返回 NaN
- 大量全 NaN 三元组被反复加密（最多 4 层递归）
- 每次加密 10 个点，但新点仍然是 NaN，毫无意义
- 递归产生成千上万个无效采样点，导致严重卡顿

**修复方案**：区分"全无效"和"混合有效/无效"区域：
- **全无效**（如 `ln(x)` 的 x<0 区域）：跳过，不加密
- **混合**（定义域边界或渐近线附近）：加密，精确定位边界

```typescript
const prevValid = isFinite(prevY);
const currValid = isFinite(currY);
const nextValid = isFinite(nextY);

if (!prevValid && !currValid && !nextValid) {
  continue; // 全无效区域，跳过
}

if (!prevValid || !currValid || !nextValid) {
  // 混合区域：加密
  regions.push({...});
}
```

### 修改文件
| 文件 | 变更 |
|-----|------|
| `src/lib/sampler.ts` | `detectProblemRegions` 区分全无效/混合区域，避免在定义域外无意义加密 |

---

## 第 12 次更新 - 2026-05-02

### UI 全面优化

**背景**：之前专注功能开发，UI 视觉和交互存在大量不一致。本次系统性优化。

#### 1. 修复交互 Bug
| 问题 | 文件 | 修复 |
|-----|------|------|
| Tab 边框颜色动态 class 不生效 | `SidebarTabs.tsx` | 改用显式 class map（`border-blue-500` / `border-purple-500` / `border-green-500`） |
| 隐函数选择器无法点击外部关闭 | `ImplicitInput.tsx` | 添加 `useRef` + `useEffect` 监听外部点击 |
| Header `?` 按钮无功能 | `Header.tsx` | 绑定 `FunctionHelp` 弹窗，替换 emoji 为 SVG 图标 |
| 帮助模态框在小屏幕溢出 | `FunctionHelp.tsx` | `w-[680px]` → `w-full max-w-2xl`，添加 `p-4` 边距 |
| 复制示例无反馈 | `FunctionHelp.tsx` | 添加 `✓ 已复制` 状态提示（1.5s 自动消失） |

#### 2. 性能优化
| 问题 | 文件 | 修复 |
|-----|------|------|
| StatusBar 全量订阅 store | `StatusBar.tsx` | 改用细粒度 selector，减少重渲染 |

#### 3. 视觉统一
| 问题 | 修复 |
|-----|------|
| 三个列表空状态样式不一 | 创建 `EmptyState` 组件，统一空状态设计 |
| 列表项视觉语言不一致（颜色条 vs 圆点） | 统一为竖条颜色指示器 `w-1 h-6 rounded-full` |
| 列表项容器样式不一 | 统一为 `rounded-lg list-item function-item` + `space-y-1.5` |
| ParametricList / ImplicitList 缺少列表头部 | 添加带类型色点和计数器的列表头部 |
| 隐函数提示使用 emoji | `⚡` → 闪电 SVG，`🖥️` → 显示器 SVG |
| 删除未使用的 `App.css` | 移除 184 行 Vite 启动器遗留样式 |

#### 4. 可访问性
| 问题 | 修复 |
|-----|------|
| 图标按钮无 `aria-label` | 所有 `◉/○`、`◆`、`d`、`✕` 按钮添加 `aria-label` |
| Tab 无 `role="tablist"` | `SidebarTabs` 添加 ARIA 角色和 `aria-selected` |
| 关闭按钮无 `aria-label` | `FunctionHelp` 关闭按钮添加 `aria-label="关闭"` |

### 修改文件
| 文件 | 变更 |
|-----|------|
| `src/components/Controls/SidebarTabs.tsx` | 显式 class map + ARIA 属性 |
| `src/components/Layout/StatusBar.tsx` | 细粒度 selector + SVG 图标 |
| `src/components/Layout/Header.tsx` | SVG logo + 帮助按钮功能化 |
| `src/components/Controls/FunctionHelp.tsx` | 响应式 + 复制反馈 + SVG 图标 |
| `src/components/Controls/ImplicitInput.tsx` | 点击外部关闭选择器 |
| `src/components/Controls/FunctionList.tsx` | 使用 EmptyState + aria-label |
| `src/components/Controls/ParametricList.tsx` | 统一列表项设计 + EmptyState + aria-label |
| `src/components/Controls/ImplicitList.tsx` | 统一列表项设计 + EmptyState + aria-label + SVG 提示图标 |
| `src/components/UI/EmptyState.tsx` | 新增统一空状态组件 |
| `src/App.css` | 删除 |

---

## 第 6 次更新 - 2026-05-02

### WebGL/CPU 自动降级机制

解决 GLSL 着色器不支持所有 mathjs 函数的问题：

| 问题 | 解决方案 |
|-----|---------|
| GLSL 不支持 `factorial`, `gamma`, `erf` 等函数 | 自动检测 + 无缝降级到 CPU 渲染 |
| 用户无感知切换 | UI 显示 "已自动切换到 CPU 渲染" 提示 |

### 核心实现

```
用户输入: "gamma(x) = y"
    ↓
glslCompiler.ts 检测到 gamma 不支持
    ↓
标记 fn.requiresCPU = true
    ↓
WebGL 渲染其他函数，CPU 渲染该函数
    ↓
UI 显示提示: "🖥️ 已自动切换到 CPU 渲染"
```

### 混合渲染流程

```
┌─────────────────────────────────────────┐
│           隐函数渲染调度                │
├─────────────────────────────────────────┤
│  1. 检测每个函数的 GLSL 兼容性          │
│  2. 分离为 WebGL 兼容列表和 CPU 列表    │
│  3. WebGL 渲染兼容函数（高性能）        │
│  4. CPU 渲染不兼容函数（兼容性）        │
│  5. 合并渲染结果                        │
└─────────────────────────────────────────┘
```

### 修改文件

| 文件 | 变更 |
|-----|------|
| `src/types/index.ts` | 新增 `requiresCPU` 字段 |
| `src/lib/webgl/glslCompiler.ts` | 新增 `detectUnsupportedFunctions()` 检测函数 |
| `src/lib/webgl/implicitRendererManager.ts` | 返回 `requiresCPU` 标志，管理混合渲染 |
| `src/components/Canvas/FunctionCanvas.tsx` | 混合渲染逻辑 |
| `src/components/Controls/ImplicitList.tsx` | CPU 降级提示 UI |
| `CLAUDE.md` | 文档：WebGL/CPU 自动降级机制、GitHub 托管信息 |

### 项目托管

- **GitHub**: https://github.com/haoranp55-ui/mathviz-pro
- **版本标签**: https://github.com/haoranp55-ui/mathviz-pro/tags
- 已创建 v1.0 ~ v2.1 版本标签

---

## 第 5 次更新 - 2026-05-01

### WebGL 隐函数渲染器

新增基于 WebGL2 的像素级隐函数渲染器，相比 CPU 渲染具有更高精度：

| 对比项 | CPU 渲染 | WebGL 渲染 |
|-------|---------|-----------|
| 精度 | 网格分辨率限制 | ✅ 像素级精确 |
| 性能 | 较慢（Marching Squares） | ✅ GPU 并行计算 |
| 渐近线 | 需要特殊处理 | ✅ 自动过滤无穷大 |
| 兼容性 | ✅ 所有浏览器 | 需要 WebGL2 支持 |

### 核心功能

#### GLSL 着色器编译
- 将 mathjs AST 自动转换为 GLSL 表达式
- 支持 47+ 数学函数的 GLSL 等价实现
- 参数作为 uniform 传入着色器

#### 奇点函数自动转换
- `tan(x)` → 自动转换为 `sin(x)/cos(x)` 然后乘分母消除除法
- `cot(x)` → `cos(x)/sin(x)` → 同样处理
- `sec(x)`, `csc(x)` → 同样处理
- 最终效果：`y = tan(x)` → `cos(x) * y - sin(x) = 0`（无奇点形式）

#### UI 自动转换提示
当表达式被自动转换时，显示提示：
> ⚡ 已转换为稳定形式: `cos(x) * y - sin(x) = 0`

### 新增文件

| 文件 | 说明 |
|-----|------|
| `src/lib/webgl/implicitRendererWebGL.ts` | WebGL 隐函数渲染器核心 |
| `src/lib/webgl/implicitRendererManager.ts` | 多函数渲染管理器 |
| `src/lib/webgl/glslCompiler.ts` | mathjs AST → GLSL 编译器 |

### 修改文件

| 文件 | 变更 |
|-----|------|
| `src/lib/implicitParser.ts` | 奇点函数自动转换逻辑 |
| `src/lib/implicitSamplerInterval.ts` | 奇点检测与过滤 |
| `src/components/Controls/GlobalSettings.tsx` | GPU 渲染开关 |
| `src/components/Controls/ImplicitList.tsx` | 转换提示显示 |
| `src/types/index.ts` | transformedExpression 字段 |

### 测试用例

| 隐函数 | 测试项 | 结果 |
|-------|--------|------|
| `y = tan(x)` | 自动转换，正确渲染 | ✅ |
| `y = cot(x)` | 自动转换，正确渲染 | ✅ |
| `y * cos(x) - sin(x) = 0` | 无需转换，正确渲染 | ✅ |
| `a*y + b = tan(k*x)` | 带参数自动转换 | ✅ |
| WebGL 切换 | 开关正常，渲染一致 | ✅ |

---

## 第 4 次更新 - 2026-05-01

### 隐函数 Interval Arithmetic 采样器

彻底解决隐函数渐近线问题，使用区间算术替代传统 Marching Squares：

| 对比项 | 传统 Marching Squares | Interval Arithmetic |
|-------|----------------------|---------------------|
| 渐近线处理 | 产生"杂线" | ✅ 正确识别，不产生伪曲线 |
| 曲线精度 | 依赖分辨率 | ✅ 像素级精确 |
| 歧义情况 | 需要 Asymptotic Decider | ✅ 区间自动处理 |
| 计算开销 | 较低 | 略高（区间运算） |

### 核心算法

#### 区间采样原理
- 对每个像素区域计算函数值的"区间范围"
- 如果区间包含 0，则该区域有曲线穿过
- 递归细分精确定位曲线位置

#### 渐近线处理
- 检测区间是否包含无穷大
- 跨越渐近线的区域返回全区间
- 不会在渐近线附近产生虚假曲线段

### RenderContext 统一渲染上下文

解决 `aspectRatioMode: 'equal'` 模式下采样范围与渲染范围不同步的问题：

```typescript
export interface RenderContext {
  xScale, yScale: ScaleLinear;  // 坐标变换
  sampleXMin, sampleXMax: number;  // 采样范围
  actualWidth, actualHeight: number;  // 实际渲染像素
  offsetX, offsetY: number;  // 偏移量
}
```

所有模块（采样、渲染、网格）使用同一个 RenderContext，消除"相对运动"和边缘消失问题。

### 新增文件

| 文件 | 说明 |
|-----|------|
| `src/lib/implicitSamplerInterval.ts` | Interval Arithmetic 隐函数采样器 |
| `src/lib/implicitParser.ts` | 隐函数表达式解析器 |
| `docs/LESSONS_LEARNED.md` | 开发经验总结文档 |

### 修改文件

| 文件 | 变更 |
|-----|------|
| `src/lib/transformer.ts` | 新增 RenderContext 统一渲染上下文 |
| `src/components/Canvas/FunctionCanvas.tsx` | 隐函数渲染、统一渲染上下文 |
| `src/components/Canvas/GridRenderer.ts` | 网格覆盖整个画布 |
| `src/components/Canvas/CurveRenderer.ts` | 渐近线断开路径而非画线 |
| `src/components/Canvas/ImplicitCurveRenderer.ts` | 隐函数曲线渲染 |
| `src/store/useAppStore.ts` | 隐函数状态管理 |
| `src/types/index.ts` | 隐函数类型定义 |
| `CLAUDE.md` | 开发规范、经验总结规范 |
| `package.json` | 新增依赖 `interval-arithmetic` |

### 删除文件

| 文件 | 原因 |
|-----|------|
| `src/lib/implicitSampler.ts` | 旧算法已废弃，工具函数合并到 implicitSamplerInterval.ts |

### 测试用例

| 隐函数 | 测试项 | 结果 |
|-------|--------|------|
| `x*y=1` | 双曲线，无杂线 | ✅ |
| `x^2+y^2=1` | 单位圆，平滑 | ✅ |
| `x^2-y^2=1` | 双曲线，渐近线无伪曲线 | ✅ |
| `sin(x*y)=0` | 复杂隐函数 | ✅ |
| `ln(x*y)=0` | 对数隐函数 | ✅ |

### 开发经验

详见 `docs/LESSONS_LEARNED.md`，本次开发总结 7 条关键教训：

1. **算法选择 > 实现优化** - 补丁越复杂，越该换算法
2. **采样范围与渲染范围必须统一** - 所有模块用同一参考系
3. **渐近线是"断开"而非"连接"** - 不存在的东西不要画
4. **固定采样密度都不对** - 跟随像素，而非固定数值
5. **渐近线附近固定密度永远不够** - 递归细分，自适应难度
6. **缓存要考虑参数变化** - LRU 缓存，参数匹配
7. **边缘破绽来自采样不够** - 预留 10% 缓冲

---

## 第 3 次更新 - 2026-05-01

### SmartRender 智能渲染引擎

新增五大核心算法，彻底解决特殊函数渲染问题：

| 算法 | 功能 | 效果 |
|-----|------|------|
| **PixelAdaptive** | 像素自适应采样 | 根据画布大小动态调整采样密度 |
| **SlopeAdaptive** | 斜率自适应加密 | 平坦稀疏、陡坡紧密，递归加密 |
| **AsymptoteLine** | 渐近线快速渲染 | 斜率>50000直接画垂直线 |
| **SmartCache** | 智能缓存复用 | LRU策略，最多50个缓存 |
| **ViewportPadding** | 视口扩展采样 | 采样范围比视口大10% |

### 新增功能

#### 参数化函数系统
- 支持带参数的表达式（如 `a*x + b`、`sin(k*x)`）
- 参数滑钮实时调节，RAF节流优化
- 最多3个参数化函数，每个最多3个参数
- 参数化函数帮助文档（点击 `?` 查看）

#### 采样精度挡位
- 快速（1x, 最大10000点）
- 标准（2x, 最大30000点）
- 精细（3x, 最大60000点）
- 极致（5x, 最大100000点）

#### 其他功能
- 每个函数独立的关键点开关
- 标记点功能（显示导数值）
- 函数选择器快速填入

### Bug 修复

- exp(x) 在 x>100 不渲染的问题（移除错误的范围限制）
- 视口平移时边缘破绽（ViewportPadding 算法）
- tan(x) 等周期函数渲染不完全（SlopeAdaptive + AsymptoteLine）
- 渐近线附近采样浪费（AsymptoteLine 直接画垂直线）

### 技术实现

#### 修改文件
- `src/lib/sampler.ts` - SmartRender 核心算法
- `src/lib/parser.ts` - 移除 x 范围限制
- `src/components/Canvas/FunctionCanvas.tsx` - 视口扩展采样
- `src/components/Canvas/CurveRenderer.ts` - 渐近线渲染
- `src/components/Controls/GlobalSettings.tsx` - 采样挡位
- `src/store/useAppStore.ts` - 参数化函数状态管理
- `src/types/index.ts` - SamplePreset 类型定义

#### 新增文件
- `src/components/Controls/ParametricInput.tsx`
- `src/components/Controls/ParametricList.tsx`
- `src/components/Controls/ParameterSlider.tsx`
- `src/components/Controls/ParametricHelp.tsx`
- `src/lib/paramParser.ts`

#### 删除文件
- `src/components/Controls/ParameterPanel.tsx`（已被 GlobalSettings 替代）

---

## 第 2 次更新 - 2026-04-30

### 新增功能

#### 导出图片
- 一键导出 Canvas 为 PNG 图片
- 自动命名 `mathviz-export.png`
- 导出按钮带渐变背景，视觉突出

#### 导数曲线绘制
- 每个函数独立控制导数显示
- 数值求导（中心差分法）
- 导数曲线使用虚线 + 半透明样式
- 与原函数同色，便于识别
- 点击 `d` 按钮切换

#### 函数隐藏功能
- 新增显示/隐藏按钮（`◉`/`○`）
- 隐藏后曲线不渲染，但函数保留在列表
- 替代删除操作，便于临时切换

### UI/UX 优化

#### 按钮指示性增强
- 函数选择器：`ƒ` → `ƒ▼`（添加下拉箭头）
- 展开时箭头旋转 180°
- 显示/隐藏：`◉`（实心=显示）/ `○`（空心=隐藏）
- 导数按钮：改为 `d`，更清晰
- 复制按钮：`⧉` 图标，成功后变 `✓`
- 所有按钮悬停时有背景色变化

#### 采样精度提升
- 最大采样数从 5000 提升到 20000
- 满足高精度绘图需求

#### 悬停精度优化
- 曲线悬停检测阈值从 10px 放宽到 12px
- 更容易悬停到曲线上

### Bug 修复

- 修复采样精度滑块无效问题（动态采样覆盖用户设置）
- 改为：用户设置 × 视口密度因子

### 技术实现

#### 新增文件
- `src/lib/derivative.ts` - 数值求导模块

#### 修改文件
- `src/types/index.ts` - 添加 `showDerivative` 属性
- `src/store/useAppStore.ts` - 导出、导数、隐藏状态管理
- `src/components/Canvas/FunctionCanvas.tsx` - 导数曲线渲染
- `src/components/Canvas/CurveRenderer.ts` - 导数曲线绘制函数
- `src/components/Controls/FunctionList.tsx` - 操作按钮优化
- `src/components/Controls/FunctionInput.tsx` - 下拉箭头

---

## 第 1 次更新 - 2026-04-29 ~ 2026-04-30

### 新增功能

#### 函数绘图核心
- 实现基于 mathjs 的数学表达式解析器
- 支持自适应采样算法，处理不连续点
- Canvas 2D 高性能曲线渲染
- 坐标系网格绘制和坐标轴标注

#### 关键点标注
- 自动检测零点（二分法精确定位）
- 自动检测极值点（导数变号法）
- 自动检测拐点（二阶导数变号法）
- 自动检测不连续点
- 不同类型使用不同形状标记（▲▼◆）
- 悬停显示详细信息

#### 函数支持扩展
- 从 20 个函数扩展到 47+ 个
- 新增三角函数扩展：cot, sec, csc 系列
- 新增反三角函数扩展：acot, asec, acsc
- 新增阶乘、组合数、排列数
- 新增特殊函数：gamma, erf
- 新增常量：tau, phi 等

#### 交互功能
- 鼠标拖拽平移视图
- 滚轮缩放（以鼠标位置为中心）
- 悬停显示曲线坐标
- 双击重置视图
- 函数选择器（点击 ƒ 快速填入）
- 函数计算点（输入 x 显示对应 y）

#### 帮助系统
- 函数帮助文档弹窗
- 运算符优先级表
- 函数分类列表
- 输入示例（可点击复制）

### UI/UX 优化

#### 深色主题
- 统一深色配色方案
- Canvas 背景 `#0F172A`
- 控制面板 `#1E293B`
- 紫色渐变强调色

#### 视觉效果
- 输入框聚焦发光效果
- 按钮渐变背景 + 悬停上浮动效
- 函数列表项滑入动画
- 自定义复选框和滑块样式
- 关键点标记发光效果
- 提示框发光边框

#### 布局优化
- 修复函数列表按钮布局
- 帮助按钮位置调整
- 移除冗余的眼睛图标
- 复制按钮和删除按钮同行显示

### 性能优化

- 动态采样点密度：根据视口范围自动调整
- 采样精度上限提升至 20000
- requestAnimationFrame 渲染优化

### Bug 修复

- 修复 tan(x) 渲染问题（Y 值范围检查）
- 修复拖拽时 Y 轴方向反向
- 修复 Tailwind v4 配置兼容
- 修复函数 id 未设置的问题
- 修复滚轮事件 passive 警告
- 修复 x 值输入框强制显示 0 的问题
- 修复采样精度滑块无效问题

### 技术债务

- 无遗留的 console.log 调试代码
- 无 TODO 注释
- 类型定义完整

---

## 待开发功能

- [x] 导出图片功能
- [x] 导数曲线绘制
- [x] 参数化函数系统
- [x] 隐函数绘图（F(x,y) = 0）
- [x] WebGL 隐函数渲染
- [x] 奇点函数自动转换
- [x] WebGL/CPU 自动降级
- [ ] 积分面积显示
- [ ] 曲线动画演示
- [ ] 多主题切换
- [ ] 触摸屏手势支持
- [ ] 键盘快捷键
- [ ] 函数保存/加载

---

## 项目统计

| 指标 | 数值 |
|-----|------|
| 开发天数 | 4 天 |
| 更新次数 | 6 次 |
| 源码文件 | 35+ 个 |
| 支持函数 | 47+ 个 |
| 经验总结 | 9 条 |

---

---

## 第 17 次更新 - 2026-05-02

### Bug 修复：`tan(x)`/`1/x` 关键点假阳性 + Audit 批量修复

#### 1. 关键点检测：渐近线假阳性（Critical）

**问题**：
- `tan(x)` 在 `π/2` 渐近线处标注"零点"
- `tan(x)` 在 π/2 附近标注莫名其妙的"极大值点"
- `1/x` 在 `x=0` 处标注"拐点"

**根本原因**：`keyPointDetector.ts` 未区分"真正的数学特征"与"渐近线附近的数值失真
code
```
// 旧代码：仅检查符号变化，不区分零点 vs 渐近线穿越
if (y[i-1] * y[i] < 0) {           // tan(1.569)=603, tan(1.571)=-1676 → 误判为零点
  binarySearchZero(...);             // 收敛到 π/2 附近
}

// 极值点检测同理：渐近线附近 dy 从 +∞ 跳变到 -∞
if (dy[i-1] > tol && dy[i+1] < -tol) {  // 误判为极大值
```

**修复方案**：
- **预标记渐近线区域**：相邻采样点斜率 > 1e6 → 标记为 `unstable`，跳过所有检测
- **零点验证**：二分搜索后验证 `|fn(zeroX)| < 10`
- **极值点函数值验证**：新增 `isLocalMax`/`isLocalMin`，要求候选点确实是附近窗口内的最大/最小值
- **导数阈值**：`|dy| > 1e5` 或 `|ddy| > 1e5` 的区域跳过检测

**验证结果**：
| 函数 | 假零点 | 假极值 | 假拐点 |
|-----|--------|--------|--------|
| `tan(x)` | ❌ 消除 | ❌ 消除 | ✅ x=0 真拐点保留 |
| `1/x` | ❌ 消除 | ❌ 消除 | ❌ 消除 |
| `sin(x)` | — | ❌ 消除噪声 | 正确保留 |
| `exp(x)` | — | — | ❌ 消除 |

#### 2. Audit 批量修复（Critical / Major）

| 问题 | 严重程度 | 修复文件 |
|-----|---------|---------|
| `drawDerivativeCurve` 无渐近线检测，`tan(x)` 导数画竖线 | Major | `CurveRenderer.ts` |
| 隐函数交点类型错标为 `'zero'` | Major | `types/index.ts`, `implicitKeyPointDetector.ts` |
| `FunctionCanvas` `setKeyPoints` 在 RAF 内触发级联重渲染 | Critical | `FunctionCanvas.tsx`（防抖 hash ref） |
| Canvas wheel 未 `preventDefault`，页面跟着滚动 | Critical | `FunctionCanvas.tsx`（原生 passive:false 监听器） |
| `implicitRendererManager` 直接修改 `fn.requiresCPU = true` | Critical | `implicitRendererManager.ts`（改为内部集合） |
| `derivative.ts` 固定 `h=1e-5`，`exp(100)` 灾难性抵消 | Major | `derivative.ts`（自适应步长 `h * max(1,\|x\|)`） |
| WebGL 颜色解析只支持 6-char hex | Medium | `implicitRendererWebGL.ts`（支持 #RGB） |
| `transformer.ts` `createScales` 与 `createRenderContext` 重复 equal 逻辑 | Smell | `transformer.ts`（`createScales` 复用 `createRenderContext`） |
| `lastViewPortRef` 死代码（只写不读） | Smell | `FunctionCanvas.tsx`（删除） |

### 修改文件
| 文件 | 变更 |
|-----|------|
| `src/lib/keyPointDetector.ts` | 渐近线区域预标记、零点验证、极值点函数值验证、导数阈值过滤 |
| `src/components/Canvas/CurveRenderer.ts` | `drawDerivativeCurve` 添加渐近线双机制检测 |
| `src/types/index.ts` | `KeyPointType` 新增 `'intersection'`，`KEY_POINT_STYLES` 新增交点样式 |
| `src/lib/implicitKeyPointDetector.ts` | 交点类型从 `'zero'` 修正为 `'intersection'` |
| `src/components/Canvas/FunctionCanvas.tsx` | `setKeyPoints` 防抖 hash ref、wheel 原生 passive:false 监听器、删除 `lastViewPortRef` |
| `src/lib/webgl/implicitRendererManager.ts` | 删除 `fn.requiresCPU = true` 直接修改，改用 `cpuRequiredFunctions` 内部集合 |
| `src/lib/derivative.ts` | 数值导数改用自适应步长 `adaptiveH = h * max(1, \|x\|)` |
| `src/lib/webgl/implicitRendererWebGL.ts` | 颜色解析支持 3 位简写 hex（`#F00`） |
| `src/lib/transformer.ts` | `createScales` 复用 `createRenderContext`，消除 equal 模式重复逻辑 |

---

*最后更新: 2026-05-02*


---

## 第 13 次更新 - 2026-05-02

### 修复：`exp(x)` 等快速增长函数渲染卡顿

**问题**：`exp(x)` 在普通函数/参数化函数模块中严重卡顿。

**根本原因**：`detectProblemRegions` 使用**固定跳变阈值** `VALUE_JUMP_THRESHOLD = 100`：

```typescript
const jump1 = Math.abs(currY - prevY);
if (jump1 > 100) { regions.push(...); }
```

对于 `exp(x)`，当视口包含较大 x 值时（如 [0, 20]）：
- `exp(20) ≈ 4.85e8`，相邻采样点差值轻松超过 100
- 大量区域被标记为"问题区域"反复加密（最多 4 层递归）
- 但加密没有任何意义——`exp(x)` 本身就是指数增长，不是曲线有问题

**修复方案**：引入**相对跳变阈值**：

```typescript
const avgAbsY = Math.max(1, (Math.abs(prevY) + Math.abs(currY) + Math.abs(nextY)) / 3);
const effectiveThreshold = Math.max(100, avgAbsY * 0.05);
```

| 函数值范围 | 旧阈值 | 新阈值 |
|-----------|--------|--------|
| y ≈ 0 | 100 | 100 |
| y ≈ 1000 | 100 | 100 |
| y ≈ 22026 | 100 | 1100 |
| y ≈ 5e8 | 100 | 2.5e7 |

现在 `exp(x)` 在高值区域不再被无意义加密，渲染流畅。

### 修改文件
| 文件 | 变更 |
|-----|------|
| `src/lib/sampler.ts` | 跳变检测从固定阈值改为"固定 + 相对"混合阈值 |

---

*最后更新: 2026-05-02*


---

## 第 14 次更新 - 2026-05-02

### 重构：自适应采样器从"三规则"精简为"两规则"

**背景**：用户质疑自适应采样器的必要性。经分析，三种检测规则中只有两种真正有用，斜率比和跳变检测都是过度设计，导致 `ln(x)`、`exp(x)` 等函数被反复误加密。

**原始设计（三规则）**：
1. 斜率比突变（>3x）→ 误判 `exp(x)`
2. 绝对值跳变（>100）→ 误判 `exp(x)`
3. NaN/Infinity 混合 → 正确，保留

**精简设计（两规则）**：
1. **NaN/Infinity 混合** → 定义域边界（`ln(x)` 的 x=0）
2. **大值异号跳变** → 渐近线（`tan(x)` 的 π/2，`-1/x` 的 x=0）

```typescript
// 唯一新增检测：异号且绝对值都 > 50
if (Math.sign(prevY) !== Math.sign(nextY)) {
  if (Math.abs(prevY) > 50 && Math.abs(nextY) > 50) {
    regions.push({...}); // 加密
  }
}
```

**为什么移除斜率比和跳变检测？**

| 函数 | 旧规则反应 | 新规则反应 | 结论 |
|-----|-----------|-----------|------|
| `tan(x)` | 斜率比 + 跳变 双触发 | 异号跳变触发 ✅ | 正确 |
| `1/x` | NaN + 跳变 双触发 | NaN 触发 ✅ | 正确 |
| `ln(x)` | NaN 触发 | NaN 触发 ✅ | 正确 |
| `exp(x)` | 跳变疯狂触发 | **不触发** ✅ | 正确 |
| `sin(x)` | 无触发 | 无触发 ✅ | 正确 |
| `x^2` | 无触发 | 无触发 ✅ | 正确 |

代码从 ~100 行降至 ~50 行，更简洁、更精确、不再有误报。

### 修改文件
| 文件 | 变更 |
|-----|------|
| `src/lib/sampler.ts` | 移除斜率比检测和跳变检测，保留 NaN + 大值异号跳变检测 |

---

*最后更新: 2026-05-02*


---

## 第 15 次更新 - 2026-05-02

### 修复：`tan(x)` 等函数渐近线画出贯穿线

**问题**：`tan(x)`、`1/x` 的渐近线处出现贯穿画布的垂直/斜线。

**根本原因**：`CurveRenderer.ts` 检测到渐近线后，将当前点（极大/极小值）设为新路径起点：

```typescript
// 旧代码
if (slope > 50000) {
  ctx.stroke();      // 结束旧路径
  ctx.beginPath();   // 开始新路径
  isDrawing = false;
  // 然后当前点通过 moveTo 成为新起点...
}
```

下一个有效点通过 `lineTo` 连接到这个**画布外的极大值点**，产生一条从无穷远画进来的贯穿线。

**修复**：检测到渐近线后，**跳过当前点**，不把它作为新路径起点：

```typescript
if (slope > 50000) {
  ctx.stroke();
  ctx.beginPath();
  isDrawing = false;
  continue; // ← 跳过渐近线上的点
}
```

现在渐近线两侧完全断开，不再有任何连线。

### 修改文件
| 文件 | 变更 |
|-----|------|
| `src/components/Canvas/CurveRenderer.ts` | 渐近线检测后添加 `continue` 跳过当前点 |

---

*最后更新: 2026-05-02*


---

## 第 16 次更新 - 2026-05-02

### 修复：`tan(x)`/`1/x` 渐近线贯穿线（彻底修复）

**问题**：第 15 次更新后，`tan(x)`、`1/x` 在大视口下仍有贯穿线。

**根本原因**：单一依赖**像素斜率**检测不够：
- 小视口（[-10, 10]）：`tan(1.56)=92` → `tan(1.58)=-108`，像素斜率 7500万 > 50000 ✅ 触发
- 大视口（[-100, 100]）：同上两点，像素斜率 7500 < 50000 ❌ **不触发**

大视口下采样 step 变大，渐近线附近像素斜率低于阈值，`lineTo` 直接连接两侧。

**彻底修复**：双机制互补检测：

```typescript
// 机制1：像素斜率（小视口/密采样）
if (slope > 50000) { ... }

// 机制2：数学坐标异号跳变（大视口/疏采样，不依赖像素）
// tan(x): +92 → -108，异号且绝对值都 > 50 → 断开
// exp(x): +22026 → +22070，同号 → 不触发
if (sign(prevY) !== sign(currY) && |prevY| > 50 && |currY| > 50) { ... }
```

两种机制互补，覆盖所有视口大小和采样密度。

### 修改文件
| 文件 | 变更 |
|-----|------|
| `src/components/Canvas/CurveRenderer.ts` | 渐近线检测增加数学坐标异号跳变机制 |

---

*最后更新: 2026-05-02*
