# MathViz Pro

一个现代化的数学函数可视化工具，支持实时渲染、关键点标注和交互式探索。

## 功能特性

### 核心功能
- **函数绘图**：支持复杂数学表达式的实时渲染
- **多函数叠加**：同时绘制多个函数曲线，自动分配颜色
- **关键点标注**：自动检测并标注零点、极值点、拐点、不连续点
- **函数计算**：选择函数后输入 x 值，显示对应的点和坐标

### 交互功能
- **拖拽平移**：鼠标拖动移动视图
- **滚轮缩放**：以鼠标位置为中心缩放
- **悬停提示**：鼠标悬停显示曲线坐标和关键点详情
- **双击重置**：快速恢复默认视图

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

## 项目结构

```
src/
├── components/
│   ├── Canvas/           # 画布相关组件
│   │   ├── FunctionCanvas.tsx    # 主画布
│   │   ├── CurveRenderer.ts      # 曲线渲染
│   │   ├── GridRenderer.ts       # 网格渲染
│   │   ├── KeyPointRenderer.ts   # 关键点渲染
│   │   └── ...
│   ├── Controls/         # 控制面板组件
│   │   ├── FunctionInput.tsx     # 函数输入
│   │   ├── FunctionList.tsx      # 函数列表
│   │   ├── FunctionHelp.tsx      # 帮助文档
│   │   └── ParameterPanel.tsx    # 参数面板
│   └── Layout/           # 布局组件
├── lib/                  # 核心算法
│   ├── parser.ts         # 表达式解析
│   ├── sampler.ts        # 采样算法
│   ├── transformer.ts    # 坐标变换
│   └── keyPointDetector.ts  # 关键点检测
├── store/                # 状态管理
│   └── useAppStore.ts
├── types/                # 类型定义
│   └── index.ts
└── hooks/                # 自定义 Hooks
    └── useCanvas.ts
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

### 输入函数
1. 在输入框中输入数学表达式，如 `sin(x)`, `x^2`, `ln(x)`
2. 点击 `ƒ` 按钮快速选择函数
3. 点击 `?` 查看完整帮助文档

### 函数列表操作
- **选中函数**：点击函数表达式，下方显示计算面板
- **复制表达式**：悬停后点击复制按钮
- **删除函数**：悬停后点击删除按钮
- **切换显示**：点击颜色指示条

### 计算点
1. 点击函数列表中的函数选中
2. 在下方输入 x 值
3. 查看对应的 y 值和画布上的标记点

### 参数调整
- **X/Y 范围**：手动输入调整视图范围
- **采样精度**：滑块调整曲线平滑度
- **显示网格**：开关网格显示
- **显示关键点**：开关关键点标注

## 开发日志

详见 [CHANGELOG.md](./CHANGELOG.md)

## 许可证

MIT
