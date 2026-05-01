# MathViz Pro

一个现代化的数学函数可视化工具，支持普通函数、参数化函数、隐函数的实时渲染。

## 功能特性

### 三种函数类型

| 类型 | 形式 | 示例 |
|------|------|------|
| **普通函数** | y = f(x) | `sin(x)`, `x^2`, `ln(x)` |
| **参数化函数** | y = f(x, a, b, ...) | `a*sin(b*x)` (可调参数) |
| **隐函数** | F(x,y) = 0 | `x^2 + y^2 = 1` (圆) |

### 核心功能
- **多函数叠加**：同时绘制多个函数曲线，自动分配颜色
- **参数滑钮**：参数化函数支持实时调参，平滑变化
- **参数关联**：同名参数自动同步，滑动一个滑钮，其他函数的同名参数也会变化
- **关键点标注**：自动检测零点、极值点、拐点、不连续点（支持所有三种函数类型）
- **导数曲线**：每个函数可独立显示导数曲线
- **悬停坐标**：鼠标悬停显示曲线上点的坐标
- **导出图片**：一键导出 PNG 图片
- **GPU 渲染**：WebGL2 着色器实现像素级精确的隐函数渲染

### 隐函数智能转换
当输入包含奇点函数时，自动转换为稳定的无奇点形式：
- `y = tan(x)` → 自动转换为 `cos(x)*y - sin(x) = 0`
- `y = cot(x)` → 自动转换为 `sin(x)*y - cos(x) = 0`
- 支持带参数的表达式：`a*y + b = tan(k*x)` 自动转换

### 交互功能
- **拖拽平移**：鼠标拖动移动视图
- **滚轮缩放**：以鼠标位置为中心缩放
- **双击重置**：快速恢复默认视图
- **采样精度挡位**：快速 / 标准 / 精细 / 极致

### 支持的函数

| 类别 | 函数 |
|------|------|
| 三角函数 | sin, cos, tan, cot, sec, csc, asin, acos, atan, acot |
| 双曲函数 | sinh, cosh, tanh |
| 指数对数 | exp, ln, log10, log2, expm1, log1p |
| 方根 | sqrt, cbrt, nthRoot, square, cube |
| 阶乘组合 | factorial, combinations, permutations |
| 特殊函数 | gamma, erf |
| 取整函数 | abs, floor, ceil, round, fix, sign |
| 其他 | pow, hypot, gcd, lcm, mod |

### 支持的常量
`pi`, `e`, `tau` (2π), `phi` (黄金比例), `LN2`, `LN10`, `LOG2E`, `LOG10E`, `SQRT2`, `SQRT1_2`

## 技术栈

- **框架**：React 19 + TypeScript
- **构建工具**：Vite 8
- **样式**：Tailwind CSS v4
- **状态管理**：Zustand
- **数学解析**：mathjs 15
- **坐标变换**：d3-scale
- **GPU 渲染**：WebGL2 (GLSL 着色器)

## 项目结构

```
src/
├── components/
│   ├── Canvas/           # 画布渲染
│   │   ├── FunctionCanvas.tsx      # 主画布
│   │   ├── CurveRenderer.ts        # 普通曲线渲染
│   │   ├── ImplicitCurveRenderer.ts # 隐函数渲染
│   │   ├── GridRenderer.ts         # 网格渲染
│   │   └── KeyPointRenderer.ts     # 关键点渲染
│   ├── Controls/         # 控制面板
│   │   ├── FunctionInput.tsx       # 普通函数输入
│   │   ├── ParametricInput.tsx     # 参数化函数输入
│   │   ├── ImplicitInput.tsx       # 隐函数输入
│   │   ├── ImplicitList.tsx        # 隐函数列表（含转换提示）
│   │   ├── ParameterSlider.tsx     # 参数滑钮
│   │   └── GlobalSettings.tsx      # 全局设置（含 GPU 开关）
│   └── Layout/           # 布局组件
├── lib/                  # 核心算法
│   ├── parser.ts         # 表达式解析
│   ├── paramParser.ts    # 参数化函数解析
│   ├── implicitParser.ts # 隐函数解析（含奇点转换）
│   ├── sampler.ts        # 自适应采样
│   ├── implicitSamplerInterval.ts # 隐函数区间采样
│   ├── implicitKeyPointDetector.ts # 隐函数关键点检测
│   ├── transformer.ts    # 坐标变换
│   ├── keyPointDetector.ts # 关键点检测
│   └── webgl/            # WebGL 渲染
│       ├── implicitRendererWebGL.ts # WebGL 隐函数渲染器
│       ├── implicitRendererManager.ts # 渲染管理器
│       └── glslCompiler.ts # mathjs → GLSL 编译器
├── store/                # 状态管理
└── types/                # 类型定义
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 使用说明

### 普通函数
输入 `y = f(x)` 形式的表达式，如 `sin(x)`, `x^2 - 3*x + 1`

### 参数化函数
输入带参数的表达式，如 `a*sin(b*x)`，然后通过滑钮调整参数值。

**参数关联**：当多个函数有相同参数名时，调整任一滑钮会同步更新所有同名参数。

### 隐函数
输入 `F(x,y) = G(x,y)` 形式的表达式：
- `x^2 + y^2 = 1` → 圆
- `x^2/4 + y^2/9 = 1` → 椭圆
- `sin(x)*cos(y) = 0.5` → 复杂曲线
- `y = tan(x)` → 自动转换为无奇点形式

### GPU 渲染模式
在全局设置中开启"GPU 着色器渲染"可获得：
- 像素级精确的隐函数曲线
- 更高的渲染性能
- 自动处理渐近线

### 图标说明

| 图标 | 功能 |
|------|------|
| ◉/○ | 显示/隐藏函数 |
| ◆ | 显示/隐藏关键点 |
| d | 显示/隐藏导数曲线 |
| ✕ | 删除函数 |

## 许可证

MIT
