# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
npm run dev      # 启动开发服务器
npm run build    # TypeScript 编译 + Vite 构建
npm run lint     # ESLint 检查
npm run preview  # 预览构建结果
```

## 项目托管

**GitHub 仓库**: https://github.com/haoranp55-ui/mathviz-pro

**版本标签**: https://github.com/haoranp55-ui/mathviz-pro/tags

- v1.0 ~ v2.1 已创建，记录了每个版本的变更历史

## 架构概览

### 数据流

```
用户输入表达式
    ↓
parser.ts / paramParser.ts  →  解析为 compiled 函数
    ↓
useAppStore (Zustand)  →  存储函数状态、视口、交互
    ↓
FunctionCanvas.tsx  →  触发渲染循环
    ↓
sampler.ts (SmartRender)  →  自适应采样
    ↓
CurveRenderer.ts  →  Canvas 绘制曲线
```

### 核心模块

**状态管理 (useAppStore.ts)**
- `functions: ParsedFunction[]` - 普通函数列表
- `parametricFunctions: ParametricFunction[]` - 参数化函数列表（最多3个）
- `viewPort: ViewPort` - 视口范围
- `samplePreset: SamplePreset` - 采样精度挡位

**SmartRender 渲染引擎 (sampler.ts)**
- `PixelAdaptive` - 像素自适应采样，根据画布大小动态调整
- `SlopeAdaptive` - 斜率自适应加密，平坦稀疏、陡坡紧密
- `SmartCache` - LRU 缓存复用，最多50个采样结果

**曲线渲染 (CurveRenderer.ts)**
- `AsymptoteLine` - 渐近线检测，斜率>50000时直接画垂直线
- 不连续点自动断开路径

**表达式解析 (parser.ts)**
- 基于 mathjs 解析数学表达式
- 支持 47+ 函数（三角、指数、对数、特殊函数等）
- 参数化函数支持最多3个参数

**WebGL 隐函数渲染器 (src/lib/webgl/)**
- `implicitRendererWebGL.ts` - WebGL2 像素级隐函数渲染
- `implicitRendererManager.ts` - 多函数渲染管理
- `glslCompiler.ts` - mathjs AST → GLSL 编译器

### 类型定义 (types/index.ts)

- `ParsedFunction` - 普通函数：id, expression, compiled, color, visible, showDerivative, showKeyPoints
- `ParametricFunction` - 参数化函数：额外包含 parameters 数组
- `ImplicitFunction` - 隐函数：包含 `requiresCPU` 字段用于自动降级
- `SamplePreset` - 采样挡位：'fast' | 'normal' | 'fine' | 'ultra'
- `KeyPoint` - 关键点：zero, maximum, minimum, inflection, discontinuity

### 组件结构

```
src/components/
├── Canvas/
│   ├── FunctionCanvas.tsx   # 主画布，处理交互和渲染调度
│   ├── CurveRenderer.ts     # 曲线绘制（含渐近线优化）
│   ├── GridRenderer.ts      # 网格和坐标轴
│   └── KeyPointRenderer.ts  # 关键点标注
├── Controls/
│   ├── FunctionInput.tsx    # 普通函数输入
│   ├── FunctionList.tsx     # 普通函数列表
│   ├── ParametricInput.tsx  # 参数化函数输入
│   ├── ParametricList.tsx   # 参数化函数列表（含参数滑钮）
│   ├── GlobalSettings.tsx   # 全局设置（视口、采样精度）
│   └── SidebarTabs.tsx      # 侧边栏 Tab 切换
└── Layout/
    └── MainLayout.tsx       # 主布局
```

## 开发规范

### Obsidian 笔记管理

**笔记仓库路径**：`E:\claude_test\ali-teacher\ali-note\mathviz-pro\`

**笔记类型与目录**：
| 类型 | 目录 | 触发条件 |
|------|------|----------|
| 更新记录 | `Updates/` | 功能新增、Bug修复、性能优化 |
| 经验教训 | `Lessons/` | 踩坑、Bug定位、意外行为 |
| 功能设计 | `Features/` | 新功能设计文档 |
| 技术决策 | `Decisions/` | 架构选择、技术选型 |

**命名规范**：
- 更新记录：`YYYY-MM-DD-简短标题.md`
- 经验教训：`NNN-一句话标题.md`（编号递增）
- 功能设计：`feature-名称.md`
- 技术决策：`NNN-决策标题.md`

**两种记录模式**：

1. **阿狸自动判断**：根据工作内容自动识别并记录
   - 完成 Bug 修复 → 记录到 `Lessons/`
   - 完成新功能 → 记录到 `Updates/` + `Features/`
   - 做出技术选择 → 记录到 `Decisions/`

2. **主人手动指定**：主人明确说"记录XX"
   - 「记录更新」「记笔记」→ `Updates/`
   - 「记录经验」「踩坑了」→ `Lessons/`
   - 「设计功能」→ `Features/`
   - 「技术决策」→ `Decisions/`

**模板位置**：`E:\claude_test\ali-teacher\ali-note\mathviz-pro\Templates\`

---

- **更新 README.md**：功能变更时同步更新 README.md 的功能特性、项目结构等章节
- **函数级属性**：`showDerivative`、`showKeyPoints` 等放在函数对象内，使用 `toggleFunctionXxx(id)` 模式操作

### 版本发布规范

每次向 GitHub 推送功能变更或 Bug 修复后，**必须创建对应的版本标签（tag）**：

```bash
git tag -a v2.3 -m "v2.3: 功能描述或修复摘要"
git push origin v2.3
```

**Tag 命名规则**：`v{主版本}.{次版本}`（如 v2.2、v2.3）
- **主版本**：重大架构变更或破坏性改动
- **次版本**：功能新增、Bug 修复、性能优化

**为什么必须打 tag**：
- Tag 是 GitHub 上查找历史版本的唯一便捷入口
- 没有 tag 时，只能通过 commit hash 或时间线在大量提交中翻找
- 每个 tag 对应一个可独立访问的代码快照，便于回溯和对比

**已有标签**：v1.0 ~ v2.2，记录了每个版本的变更历史

### WebGL/CPU 自动降级机制

**背景**：GLSL 着色器不支持所有 mathjs 函数（如 factorial、gamma、erf 等）。

**解决方案**：自动检测 + 无缝降级

```
用户输入: "gamma(x) = y"
    ↓
glslCompiler.ts 检测到 gamma 不支持
    ↓
标记 fn.requiresCPU = true
    ↓
WebGL 渲染其他函数，CPU 渲染该函数
    ↓
UI 显示提示: "已自动切换到 CPU 渲染"
```

**涉及文件**：
- `src/lib/webgl/glslCompiler.ts` - `detectUnsupportedFunctions()` 检测不支持的函数
- `src/lib/webgl/implicitRendererManager.ts` - 返回 `requiresCPU` 标志
- `src/components/Canvas/FunctionCanvas.tsx` - 混合渲染逻辑
- `src/components/Controls/ImplicitList.tsx` - UI 降级提示

**添加新 GLSL 函数**：
1. 在 `glslCompiler.ts` 的 `FUNCTION_MAP` 或 switch-case 中添加
2. 对于复杂函数，考虑精度和性能影响
3. 更新 `detectUnsupportedFunctions()` 中的 `UNSUPPORTED_IN_GLSL` 列表

### 采样算法参数

- 斜率突变检测阈值：相邻斜率比 > 3倍
- 函数值跳变阈值：|Δy| > 100
- 渐近线斜率阈值：50000
- 递归加密最大深度：4层
- 缓存容量：50个

### 渲染优化

- 使用 `requestAnimationFrame` 节流
- 采样范围比视口大 10%（`ViewportPadding`）
- 参数滑钮使用 RAF 节流
