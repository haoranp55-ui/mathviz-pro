# MathViz Pro 项目开发日志

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
| 开发天数 | 3 天 |
| 更新次数 | 5 次 |
| 源码文件 | 30+ 个 |
| 支持函数 | 47+ 个 |
| 经验总结 | 9 条 |

---

*最后更新: 2026-05-01*
