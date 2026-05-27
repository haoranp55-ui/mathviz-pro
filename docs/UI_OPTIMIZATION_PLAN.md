# MathViz Pro UI 优化方案

> 生成日期：2026-05-27
> 基于代码审查和 UI/UX 分析结果

---

## 一、优化总览

| 优先级 | 问题数量 | 预估工时 | 影响范围 |
|--------|---------|---------|---------|
| **P0** (阻塞性) | 6 | 2-3 天 | 色彩系统、无障碍性、键盘导航 |
| **P1** (重要) | 12 | 3-4 天 | 布局响应式、组件复用、交互反馈 |
| **P2** (建议) | 8 | 2-3 天 | 动画统一、代码清理、设计系统 |

---

## 二、P0 优先级：阻塞性问题

### P0-1: 色彩对比度不达标（严重）

**问题描述**：`text-gray-500` (#6b7280) 在 `#0f172a` 背景上对比度约 4.5:1，处于 WCAG AA 临界值；`text-gray-600` 对比度仅约 3.2:1，不满足 AA 标准。色盲用户难以阅读。

**影响文件**：
- `src/components/Controls/FunctionInput.tsx`
- `src/components/Controls/GlobalSettings.tsx`
- `src/components/Controls/ParameterSlider.tsx`
- `src/components/UI/EmptyState.tsx`
- `src/components/Layout/StatusBar.tsx`
- 以及所有使用 `text-gray-500` / `text-gray-600` 的组件

**修复步骤**：

1. **统一提升文字对比度**：将所有 `text-gray-500` 替换为 `text-gray-400`（#9ca3af，对比度约 6.1:1）
2. **将 `text-gray-600` 替换为 `text-gray-500`** 或更浅的颜色
3. **建立语义化文字颜色映射**：

```css
/* src/index.css - 添加到 :root */
:root {
  /* 文字色 - WCAG AA 合规 */
  --text-primary: #E2E8F0;      /* 主文字 - 对比度 12.8:1 */
  --text-secondary: #94A3B8;    /* 次文字 - 对比度 7.2:1 */
  --text-tertiary: #64748B;       /* 辅助文字 - 对比度 4.6:1 (临界，建议提升) */
  --text-muted: #475569;          /* 禁用/占位 - 对比度 3.2:1 (不满足AA，需场景评估) */
}
```

4. **批量替换**（使用查找替换）：
   - `text-gray-500` → `text-gray-400`
   - `text-gray-600` → `text-gray-500`
   - `text-[#475569]` → `text-gray-500`

**预期效果**：所有文字对比度达到 WCAG AA 标准（4.5:1 以上），提升可读性。

**验收标准**：
- [ ] 使用浏览器 DevTools 的 Lighthouse Accessibility 检查，对比度无警告
- [ ] 所有 `text-gray-600` 被清除
- [ ] 视觉检查确认文字清晰可读

---

### P0-2: 自定义复选框缺少 ARIA 属性（严重）

**问题描述**：`.custom-checkbox` 是纯 CSS 实现，屏幕阅读器无法识别其状态。

**影响文件**：
- `src/index.css` (第 356-387 行)
- `src/components/Controls/GlobalSettings.tsx` (第 148-158 行)

**修复步骤**：

1. **修改 GlobalSettings.tsx 中的复选框**：

```tsx
// src/components/Controls/GlobalSettings.tsx
// 将现有 checkbox 替换为：

<div className="flex items-center gap-3 py-1">
  <input
    type="checkbox"
    id="showGrid"
    checked={showGrid}
    onChange={toggleGrid}
    className="custom-checkbox"
    aria-checked={showGrid}
    aria-label="显示网格"
    role="checkbox"
  />
  <label htmlFor="showGrid" className="text-xs text-gray-300 cursor-pointer flex items-center gap-1.5">
    <span className="text-cyan-400/50" aria-hidden="true">▦</span>
    显示网格
  </label>
</div>
```

2. **增强 CSS 中的键盘支持**：

```css
/* src/index.css - 在 .custom-checkbox 样式后添加 */
.custom-checkbox:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.custom-checkbox:checked {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}
```

**预期效果**：屏幕阅读器可正确播报复选框状态，键盘可聚焦和操作。

**验收标准**：
- [ ] 使用 NVDA/VoiceOver 测试，可听到 "显示网格，复选框，已选中/未选中"
- [ ] Tab 键可聚焦复选框，Space 键可切换状态

---

### P0-3: 函数选择器无键盘导航（严重）

**问题描述**：`FunctionInput` 中的函数选择器下拉无法通过键盘（↑↓ Enter Escape）操作。

**影响文件**：
- `src/components/Controls/FunctionInput.tsx`

**修复步骤**：

1. **添加键盘导航逻辑**：

```tsx
// src/components/Controls/FunctionInput.tsx
// 在现有 state 下方添加：

const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

// 计算所有可选项的扁平列表
const flatItems = useMemo(() => {
  const items: { fn: string; category: string }[] = [];
  filteredFunctions.forEach(group => {
    group.items.forEach(fn => items.push({ fn, category: group.category }));
  });
  return items;
}, [filteredFunctions]);

// 键盘事件处理
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  if (!showPicker) return;
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev < flatItems.length - 1 ? prev + 1 : 0;
        return next;
      });
      break;
    case 'ArrowUp':
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev > 0 ? prev - 1 : flatItems.length - 1;
        return next;
      });
      break;
    case 'Enter':
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < flatItems.length) {
        handleSelectFunction(flatItems[highlightedIndex].fn);
      }
      break;
    case 'Escape':
      e.preventDefault();
      setShowPicker(false);
      setSearchQuery('');
      break;
  }
}, [showPicker, flatItems, highlightedIndex]);

// 将 onKeyDown 绑定到输入框
<input
  // ... existing props
  onKeyDown={handleKeyDown}
/>
```

2. **为选项添加高亮样式**：

```tsx
// 在函数列表渲染中，为 button 添加高亮状态：
<button
  key={fn}
  type="button"
  onClick={() => handleSelectFunction(fn)}
  className={`text-xs text-gray-300 hover:text-white hover:bg-cyan-500/10 px-2 py-1.5 rounded-lg text-left font-mono transition-all ${
    itemIndex === highlightedIndex ? 'bg-cyan-500/20 text-white' : ''
  }`}
>
  {fn}
</button>
```

**预期效果**：用户可通过键盘完全操作函数选择器。

**验收标准**：
- [ ] 打开选择器后，按 ↓ 可高亮第一个选项
- [ ] 按 ↑↓ 可在选项间移动
- [ ] 按 Enter 可选中当前高亮项
- [ ] 按 Escape 可关闭选择器

---

### P0-4: Help 模态框无 ESC 关闭（严重）

**问题描述**：`FunctionHelp`、`ParametricHelp`、`ImplicitHelp`、`PolarHelp`、`ThreeDHelp`、`EquationHelp` 等模态框均未监听 Escape 键。

**影响文件**：
- `src/components/Controls/FunctionHelp.tsx`
- `src/components/Controls/ParametricHelp.tsx`
- `src/components/Controls/ImplicitHelp.tsx`
- `src/components/Controls/PolarHelp.tsx`
- `src/components/Controls/ThreeDHelp.tsx`
- `src/components/Equation/EquationHelp.tsx`

**修复步骤**：

1. **创建通用 Modal 组件**：

```tsx
// src/components/UI/Modal.tsx
import { useEffect, useRef, type FC, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export const Modal: FC<ModalProps> = ({ isOpen, onClose, children, className = '' }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={contentRef}
        className={className}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
```

2. **在 FunctionHelp 中使用**：

```tsx
// src/components/Controls/FunctionHelp.tsx
import { Modal } from '../UI/Modal';

export const FunctionHelp: FC<FunctionHelpProps> = ({ isOpen, onClose }) => {
  // ... existing code

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="bg-canvas-panel rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-gray-700">
      {/* existing content */}
    </Modal>
  );
};
```

3. **其他 Help 组件同理替换**。

**预期效果**：所有模态框支持 ESC 关闭。

**验收标准**：
- [ ] 打开任意 Help 模态框，按 ESC 可关闭
- [ ] 点击遮罩层可关闭
- [ ] 焦点被限制在模态框内（可选，P1 实现）

---

### P0-5: 导出图片无反馈（严重）

**问题描述**：`exportImage()` 调用后无任何 UI 反馈，用户不确定是否成功。

**影响文件**：
- `src/components/Controls/GlobalSettings.tsx` (第 172-178 行)
- `src/store/slices/functionSlice.ts` (exportImage 实现)

**修复步骤**：

1. **添加 Toast 通知系统**：

```tsx
// src/components/UI/Toast.tsx
import { useState, useEffect, type FC } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}

export const Toast: FC<ToastProps> = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-green-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
    info: <AlertCircle className="w-4 h-4 text-cyan-400" />,
  };

  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
    }`}>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e293b] border border-white/[0.08] shadow-xl">
        {icons[type]}
        <span className="text-sm text-gray-200">{message}</span>
      </div>
    </div>
  );
};
```

2. **在 GlobalSettings 中使用**：

```tsx
// src/components/Controls/GlobalSettings.tsx
import { useState } from 'react';
import { Toast } from '../UI/Toast';

export const GlobalSettings: FC = () => {
  // ... existing code
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleExport = useCallback(() => {
    try {
      exportImage();
      setToast({ message: '图片已保存至下载文件夹', type: 'success' });
    } catch (err) {
      setToast({ message: '导出失败，请重试', type: 'error' });
    }
  }, [exportImage]);

  return (
    <>
      {/* existing content */}
      <button onClick={handleExport}>
        导出图片
      </button>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </>
  );
};
```

**预期效果**：导出图片后显示 Toast 提示，告知用户结果。

**验收标准**：
- [ ] 点击"导出图片"后，底部出现 Toast "图片已保存至下载文件夹"
- [ ] Toast 3 秒后自动消失
- [ ] 导出失败时显示错误提示

---

### P0-6: 硬编码颜色值泛滥（严重）

**问题描述**：`#0ea5e9`、`#0f172a`、`#1e293b` 等颜色值在代码中硬编码 86 处，未使用 CSS 变量，维护困难，无法支持主题切换。

**影响文件**：12 个组件文件

**修复步骤**：

1. **扩展 CSS 变量系统**（`src/index.css` 已部分定义，需补充）：

```css
/* src/index.css - 在 :root 中补充 */
:root {
  /* 背景色 */
  --bg-primary: #0f172a;
  --bg-panel: #1e293b;
  --bg-panel-light: #273549;
  --bg-input: rgba(255, 255, 255, 0.04);

  /* 文字色 */
  --text-primary: #E2E8F0;
  --text-secondary: #94A3B8;
  --text-tertiary: #64748B;
  --text-muted: #475569;

  /* 强调色 */
  --accent-primary: #0ea5e9;
  --accent-primary-hover: #38bdf8;
  --accent-secondary: #64748B;

  /* 边框 */
  --border-default: rgba(255, 255, 255, 0.06);
  --border-hover: rgba(255, 255, 255, 0.1);
  --border-focus: #0ea5e9;
}
```

2. **创建 Tailwind 插件或自定义类映射**（由于使用 Tailwind v4，推荐在 CSS 中定义）：

```css
/* src/index.css - 添加语义化类 */
.bg-theme-primary { background-color: var(--bg-primary); }
.bg-theme-panel { background-color: var(--bg-panel); }
.text-theme-primary { color: var(--text-primary); }
.text-theme-secondary { color: var(--text-secondary); }
.border-theme-default { border-color: var(--border-default); }
/* ... etc */
```

3. **批量替换**（按优先级）：
   - **Phase 1**：替换背景色 `bg-[#0f172a]` → `bg-theme-primary`
   - **Phase 2**：替换面板色 `bg-[#1e293b]` → `bg-theme-panel`
   - **Phase 3**：替换文字色 `text-[#E2E8F0]` → `text-theme-primary`
   - **Phase 4**：替换强调色 `text-[#0ea5e9]` → `text-accent-primary`

**预期效果**：颜色集中管理，便于维护和主题切换。

**验收标准**：
- [ ] `grep -r "bg-\[#" src/` 返回 0 个结果
- [ ] `grep -r "text-\[#" src/` 返回 0 个结果（图标颜色除外）
- [ ] 所有颜色通过 CSS 变量管理

---

## 三、P1 优先级：重要问题

### P1-1: Header 系统切换器硬编码宽度

**问题描述**：`w-[260px]` 写死，在窄屏或高 DPI 下可能溢出或留白不均。

**影响文件**：
- `src/components/Layout/Header.tsx` (第 28 行)

**修复步骤**：

```tsx
// src/components/Layout/Header.tsx
// 将第 28 行：
// <div className="relative flex items-center p-1 rounded-xl bg-[#0f172a] border border-white/[0.08] w-[260px] h-9">
// 替换为：
<div className="relative flex items-center p-1 rounded-xl bg-theme-primary border border-white/[0.08] min-w-[200px] max-w-[320px] h-9">
```

**验收标准**：
- [ ] 在 1280x720 分辨率下切换器显示正常
- [ ] 在 4K 分辨率下切换器不显得过窄

---

### P1-2: GlobalSettings 数值输入无防抖

**问题描述**：`onChange` 直接触发 `setViewPort`，快速输入时产生大量重渲染。

**影响文件**：
- `src/components/Controls/GlobalSettings.tsx` (第 64-107 行)

**修复步骤**：

```tsx
// src/components/Controls/GlobalSettings.tsx
import { useDebounce } from '../../hooks/useDebounce'; // 或 lodash.debounce

// 添加自定义 hook
function useDebounceCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  
  return useCallback((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
}

// 在组件中使用：
const debouncedValidateAndSet = useDebounceCallback(validateAndSet, 300);

// 输入框 onChange：
<input
  type="number"
  value={viewPort.xMin}
  onChange={(e) => {
    const val = parseFloat(e.target.value);
    if (!Number.isNaN(val)) debouncedValidateAndSet({ xMin: val });
  }}
  // ...
/>
```

**验收标准**：
- [ ] 快速输入时，Canvas 重绘次数减少 80% 以上
- [ ] 输入完成后 300ms 内触发更新

---

### P1-3: 采样精度切换无过渡反馈

**问题描述**：点击精度按钮后无 loading 状态，用户不确定是否生效。

**影响文件**：
- `src/components/Controls/GlobalSettings.tsx` (第 112-143 行)

**修复步骤**：

```tsx
// src/components/Controls/GlobalSettings.tsx
const [isSwitchingPreset, setIsSwitchingPreset] = useState(false);

const handlePresetChange = useCallback((preset: SamplePreset) => {
  setIsSwitchingPreset(true);
  setSamplePreset(preset);
  // 模拟切换完成（实际渲染完成后）
  requestAnimationFrame(() => {
    setIsSwitchingPreset(false);
  });
}, [setSamplePreset]);

// 按钮渲染：
<button
  key={preset}
  onClick={() => handlePresetChange(preset)}
  disabled={isSwitchingPreset}
  className={`flex-1 py-2 text-xs rounded-lg transition-all duration-200 flex items-center justify-center gap-1 ${
    isActive
      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
      : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
  } ${isSwitchingPreset ? 'opacity-50 cursor-wait' : ''}`}
>
  {isSwitchingPreset && isActive ? (
    <div className="w-3.5 h-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
  ) : (
    <IconComponent className="w-3.5 h-3.5" />
  )}
  <span>{SAMPLE_PRESETS[preset].label}</span>
</button>
```

**验收标准**：
- [ ] 切换精度时按钮显示 loading 状态
- [ ] 切换完成后 loading 消失

---

### P1-4: ParameterSlider 未显示当前精确值

**问题描述**：仅有滑块无数值输入，精确调整困难。

**影响文件**：
- `src/components/Controls/ParameterSlider.tsx` (第 257-265 行已有数值输入，但需增强)

**修复步骤**：

```tsx
// src/components/Controls/ParameterSlider.tsx
// 增强数值输入框：
<div className="flex items-center gap-1">
  <input
    type="number"
    value={parameter.currentValue.toFixed(4)}
    onChange={handleInputChange}
    className="w-20 px-1.5 py-0.5 input-base text-center text-xs font-mono"
    step={parameter.step}
    min={parameter.min}
    max={parameter.max}
    title="直接输入精确值"
  />
  <span className="text-[10px] text-gray-500">{parameter.name}</span>
</div>
```

**验收标准**：
- [ ] 滑块旁显示精确数值输入框
- [ ] 可直接输入数值精确调整

---

### P1-5: 函数选择器搜索框 autofocus 使用 setTimeout（反模式）

**问题描述**：`setTimeout(() => searchInputRef.current?.focus(), 50)` 是反模式。

**影响文件**：
- `src/components/Controls/FunctionInput.tsx` (第 62 行)
- `src/components/Controls/ParametricInput.tsx`
- `src/components/Controls/ImplicitInput.tsx`
- `src/components/Controls/PolarInput.tsx`
- `src/components/Controls/ThreeDInput.tsx`

**修复步骤**：

```tsx
// src/components/Controls/FunctionInput.tsx
// 将 useEffect 中的 setTimeout 替换为：

useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
      setShowPicker(false);
      setSearchQuery('');
    }
  };
  if (showPicker) {
    document.addEventListener('mousedown', handleClickOutside);
    // 使用 requestAnimationFrame 替代 setTimeout
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showPicker]);
```

**验收标准**：
- [ ] 打开选择器后搜索框自动聚焦
- [ ] 无 setTimeout 使用

---

### P1-6: 提取 IconButton 复用组件

**问题描述**：`Header.tsx` 中帮助按钮和 GitHub 按钮样式几乎完全相同，但未提取复用。

**影响文件**：
- `src/components/Layout/Header.tsx` (第 68-86 行)

**修复步骤**：

```tsx
// src/components/UI/IconButton.tsx
import type { FC, ReactNode, ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  title?: string;
}

export const IconButton: FC<IconButtonProps> = ({ children, className = '', ...props }) => {
  return (
    <button
      className={`w-9 h-9 rounded-xl bg-theme-primary border border-white/[0.08] flex items-center justify-center text-text-tertiary hover:text-text-primary hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all duration-200 hover:shadow-[0_0_12px_rgba(14,165,233,0.15)] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// src/components/Layout/Header.tsx
import { IconButton } from '../UI/IconButton';

// 使用：
<IconButton onClick={() => setShowHelp(true)} title="函数帮助" aria-label="帮助">
  <HelpCircle className="w-5 h-5" />
</IconButton>

<IconButton as="a" href="https://github.com/..." target="_blank" title="GitHub 仓库" aria-label="GitHub">
  <ExternalLink className="w-5 h-5" />
</IconButton>
```

**验收标准**：
- [ ] IconButton 组件被创建并在 Header 中使用
- [ ] 样式与原有完全一致

---

### P1-7: MainLayout 侧边栏无响应式适配

**问题描述**：`w-80` 固定宽度，`min-w-[480px]` 硬编码，移动端布局崩溃。

**影响文件**：
- `src/components/Layout/MainLayout.tsx` (第 65、76 行)

**修复步骤**：

```tsx
// src/components/Layout/MainLayout.tsx
// 将第 76 行：
// <aside className="w-80 bg-[#1e293b] border-l border-white/[0.06] flex flex-col overflow-hidden">
// 替换为：
<aside className="w-80 lg:w-80 md:w-72 sm:w-64 bg-theme-panel border-l border-white/[0.06] flex flex-col overflow-hidden shrink-0">

// 将第 65 行：
// <div className="flex-1 min-w-[480px] relative">
// 替换为：
<div className="flex-1 min-w-0 md:min-w-[360px] lg:min-w-[480px] relative">
```

**验收标准**：
- [ ] 在 768px 宽度下侧边栏自动缩小
- [ ] 在 1024px 宽度下保持原宽度

---

### P1-8: SidebarTabs 指示器动画错位

**问题描述**：底部指示器使用 `left-3 right-3`，如果 Tab 文字长度差异大，指示器宽度不一致。

**影响文件**：
- `src/components/Controls/SidebarTabs.tsx` (第 43-45 行)

**修复步骤**：

```tsx
// src/components/Controls/SidebarTabs.tsx
// 将指示器改为等宽：
<div
  className={`absolute bottom-0 h-[2px] bg-cyan-500/80 rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] mx-3 ${
    isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
  }`}
  style={{ left: 0, right: 0 }}
/>
```

或使用 CSS Grid 实现等宽 Tab：

```tsx
// 将外层 div 改为 grid：
<div className="grid grid-cols-4 border-b border-white/[0.06] bg-white/[0.02] relative" role="tablist">
  {TABS.map(tab => (
    <button
      key={tab.key}
      // ...
      className="relative py-3 text-xs font-medium transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/40"
    >
      {/* 指示器 - 使用 inset-x-3 实现等宽 */}
      <div
        className={`absolute bottom-0 left-3 right-3 h-[2px] bg-cyan-500/80 rounded-full transition-all duration-300 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </button>
  ))}
</div>
```

**验收标准**：
- [ ] 四个 Tab 的指示器宽度一致
- [ ] 切换时动画流畅

---

### P1-9: FunctionList 颜色作为唯一信息载体

**问题描述**：函数列表仅靠颜色区分，色盲用户无法辨别。

**影响文件**：
- `src/components/Controls/FunctionList.tsx`

**修复步骤**：

```tsx
// src/components/Controls/FunctionList.tsx
// 在函数项中添加文字标签或图案：

<div className="function-item panel flex items-center gap-2.5 px-3 py-2.5 group cursor-pointer">
  {/* 颜色指示条 + 文字标签 */}
  <div
    className="w-1 h-6 rounded-full flex-shrink-0 cursor-pointer transition-opacity flex items-center justify-center"
    style={{ backgroundColor: fn.color, opacity: fn.visible ? 1 : 0.3 }}
    onClick={onToggleVisibility}
  >
    {/* 添加图案标识 */}
    <span className="text-[8px] text-white/80 font-bold" aria-hidden="true">
      {fn.expression.charAt(0).toUpperCase()}
    </span>
  </div>
  
  {/* 函数表达式 */}
  <button className={`text-[13px] flex-1 text-left font-mono truncate ...`}>
    <span className="text-gray-500">y = </span>
    {fn.expression}
  </button>
  
  {/* ... */}
</div>
```

**验收标准**：
- [ ] 每个函数项有除颜色外的唯一标识
- [ ] 使用色盲模拟器测试可区分

---

### P1-10: FunctionCanvas 性能优化

**问题描述**：`render` 回调依赖 15+ 个 state，每次任何 state 变化都会触发重渲染。

**影响文件**：
- `src/components/Canvas/FunctionCanvas.tsx` (第 103-157 行)

**修复步骤**：

```tsx
// src/components/Canvas/FunctionCanvas.tsx
// 使用 useMemo 缓存渲染结果，使用 useRef 避免不必要的依赖：

// 将依赖分组，避免不必要的重渲染：
const renderDeps = useMemo(() => ({
  functions,
  parametricFunctions,
  implicitFunctions,
  polarFunctions,
  integrals,
  viewPort,
  canvasSize,
  showGrid,
  samplePreset,
  aspectRatioMode,
  keyPoints,
  hoverKeyPoint,
  selectedFunctionId,
  evaluateX,
  systemType,
  isSliderActive,
}), [
  functions, parametricFunctions, implicitFunctions, polarFunctions,
  integrals, viewPort, canvasSize, showGrid, samplePreset,
  aspectRatioMode, keyPoints, hoverKeyPoint, selectedFunctionId,
  evaluateX, systemType, isSliderActive,
]);

// 使用 useRef 存储 interaction 避免重渲染：
const interactionRef = useRef(interaction);
useEffect(() => {
  interactionRef.current = interaction;
}, [interaction]);
```

**验收标准**：
- [ ] 使用 React DevTools Profiler 确认重渲染次数减少
- [ ] Canvas 帧率保持稳定

---

### P1-11: 建立 z-index 常量枚举

**问题描述**：`z-20`、`z-50` 等层级分散，未使用全局 z-index 管理。

**影响文件**：14 个文件

**修复步骤**：

```ts
// src/lib/constants.ts
export const Z_INDEX = {
  base: 0,
  canvas: 1,
  sidebar: 10,
  dropdown: 20,
  tooltip: 30,
  modal: 40,
  toast: 50,
  overlay: 100,
} as const;

// 在组件中使用：
import { Z_INDEX } from '../../lib/constants';

// 例如 FunctionInput.tsx：
<div className={`absolute ... z-[${Z_INDEX.dropdown}]`}>
```

**验收标准**：
- [ ] 所有 z-index 使用常量
- [ ] 无硬编码 z-index 值

---

### P1-12: Help 模态框无焦点陷阱

**问题描述**：打开模态框后，Tab 键仍可聚焦到背景元素。

**影响文件**：所有 Help 组件

**修复步骤**：

```tsx
// src/components/UI/FocusTrap.tsx
import { useEffect, useRef, type FC, type ReactNode } from 'react';

interface FocusTrapProps {
  children: ReactNode;
  isActive: boolean;
}

export const FocusTrap: FC<FocusTrapProps> = ({ children, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // 保存之前聚焦的元素
    const previousFocus = document.activeElement as HTMLElement;

    // 聚焦到第一个可聚焦元素
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = Array.from(container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )) as HTMLElement[];

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isActive]);

  return <div ref={containerRef}>{children}</div>;
};
```

**验收标准**：
- [ ] 打开模态框后 Tab 键仅在模态框内循环
- [ ] 关闭模态框后焦点回到触发元素

---

## 四、P2 优先级：建议性优化

### P2-1: 动画过渡效果统一

**问题描述**：`duration-200`、`duration-300`、`ease-[cubic-bezier(0.4,0,0.2,1)]` 等多种定义分散。

**影响文件**：10 个文件，23 处

**修复步骤**：

```css
/* src/index.css - 添加统一过渡类 */
.transition-fast {
  transition: all 0.15s ease;
}

.transition-normal {
  transition: all 0.2s ease;
}

.transition-slow {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**验收标准**：
- [ ] 所有过渡使用统一类名
- [ ] 无分散的 duration/ease 值

---

### P2-2: 圆角值不一致

**问题描述**：`rounded-lg` (8px)、`rounded-xl` (12px)、`rounded-md` (6px) 混用。

**修复步骤**：

```css
/* src/index.css - 统一圆角 */
:root {
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

**验收标准**：
- [ ] 组件圆角值统一

---

### P2-3: 字体大小跳跃

**问题描述**：`text-[11px]`、`text-xs`、`text-sm`、`text-[15px]` 缺乏梯度规范。

**修复步骤**：

```css
/* src/index.css - 定义字体大小规范 */
:root {
  --font-size-xs: 11px;    /* 辅助文字、标签 */
  --font-size-sm: 13px;    /* 正文、按钮 */
  --font-size-base: 14px;  /* 默认 */
  --font-size-md: 15px;    /* 标题 */
  --font-size-lg: 16px;    /* 大标题 */
}
```

**验收标准**：
- [ ] 字体大小使用规范值

---

### P2-4: 图标尺寸统一

**问题描述**：`w-4 h-4`、`w-5 h-5`、`w-3.5 h-3.5` 混用。

**修复步骤**：

```css
/* 定义图标尺寸 */
.icon-xs { width: 12px; height: 12px; }
.icon-sm { width: 14px; height: 14px; }
.icon-md { width: 16px; height: 16px; }
.icon-lg { width: 20px; height: 20px; }
```

**验收标准**：
- [ ] 图标尺寸统一

---

### P2-5: 提取 design-tokens.ts

**问题描述**：颜色、间距、圆角等设计 token 分散。

**修复步骤**：

```ts
// src/lib/designTokens.ts
export const COLORS = {
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  accentSecondary: '#64748B',
  bgPrimary: '#0f172a',
  bgPanel: '#1e293b',
  textPrimary: '#E2E8F0',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
} as const;

export const RADII = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
} as const;

export const Z_INDEX = {
  dropdown: 20,
  tooltip: 30,
  modal: 40,
  toast: 50,
} as const;
```

**验收标准**：
- [ ] designTokens.ts 被创建
- [ ] 组件中引用 design tokens

---

### P2-6: index.css 重复 keyframes 清理

**问题描述**：`float` 和 `skeletonPulse` 各定义了两次。

**影响文件**：
- `src/index.css` (第 86-89 行和第 499-502 行重复 `float`)
- `src/index.css` (第 91-94 行和第 517-519 行重复 `skeletonPulse`)

**修复步骤**：

删除重复的 keyframes 定义，只保留一组。

**验收标准**：
- [ ] 无重复 keyframes

---

### P2-7: FunctionInput filteredFunctions 使用 useMemo

**问题描述**：`filteredFunctions` 在每次渲染时重新计算。

**修复步骤**：

```tsx
// src/components/Controls/FunctionInput.tsx
const filteredFunctions = useMemo(() => {
  if (!searchQuery.trim()) return FUNCTION_LIST;
  return FUNCTION_LIST.map(group => ({
    ...group,
    items: group.items.filter(fn =>
      fn.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(group => group.items.length > 0);
}, [searchQuery]);
```

**验收标准**：
- [ ] 使用 useMemo 缓存

---

### P2-8: 玻璃拟态面板增强

**问题描述**：`.glass` (rgba 255,255,255,0.02) 与背景区分度极低。

**修复步骤**：

```css
/* src/index.css - 增强玻璃效果 */
.glass {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.glass-strong {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(12px);
}
```

**验收标准**：
- [ ] 玻璃面板视觉层次清晰

---

## 五、实施计划

### 第一阶段（P0，预计 2-3 天）

| 天数 | 任务 | 负责人 |
|------|------|--------|
| Day 1 | P0-6 硬编码颜色值替换（批量） | 开发 |
| Day 1 | P0-1 色彩对比度提升 | 开发 |
| Day 2 | P0-2 复选框 ARIA 属性 | 开发 |
| Day 2 | P0-3 函数选择器键盘导航 | 开发 |
| Day 3 | P0-4 Help 模态框 ESC 关闭 | 开发 |
| Day 3 | P0-5 导出图片 Toast 反馈 | 开发 |

### 第二阶段（P1，预计 3-4 天）

| 天数 | 任务 | 负责人 |
|------|------|--------|
| Day 4 | P1-1 Header 响应式 + P1-7 侧边栏响应式 | 开发 |
| Day 5 | P1-2 GlobalSettings 防抖 + P1-3 采样精度反馈 | 开发 |
| Day 6 | P1-6 IconButton 提取 + P1-8 SidebarTabs 指示器 | 开发 |
| Day 7 | P1-9 色盲友好 + P1-10 FunctionCanvas 性能 | 开发 |
| Day 7 | P1-11 z-index 常量 + P1-12 焦点陷阱 | 开发 |

### 第三阶段（P2，预计 2-3 天）

| 天数 | 任务 | 负责人 |
|------|------|--------|
| Day 8 | P2-1 动画统一 + P2-2 圆角统一 + P2-3 字体统一 | 开发 |
| Day 9 | P2-4 图标统一 + P2-5 design-tokens.ts | 开发 |
| Day 10 | P2-6 清理重复 keyframes + P2-7 useMemo + P2-8 玻璃增强 | 开发 |

---

## 六、验收检查清单

### P0 验收

- [ ] 所有 `text-gray-600` 被清除
- [ ] Lighthouse Accessibility 对比度无警告
- [ ] 复选框可通过键盘操作
- [ ] 函数选择器支持 ↑↓ Enter Escape
- [ ] 所有 Help 模态框支持 ESC 关闭
- [ ] 导出图片显示 Toast 反馈
- [ ] 无硬编码颜色值（图标颜色除外）

### P1 验收

- [ ] Header 切换器响应式正常
- [ ] GlobalSettings 输入有防抖
- [ ] 采样精度切换有 loading 反馈
- [ ] IconButton 组件被提取
- [ ] 侧边栏响应式适配
- [ ] z-index 使用常量
- [ ] 焦点陷阱在模态框中生效

### P2 验收

- [ ] 动画过渡统一
- [ ] 圆角、字体、图标尺寸统一
- [ ] design-tokens.ts 被创建
- [ ] 无重复 keyframes
- [ ] FunctionInput 使用 useMemo

---

## 七、风险与注意事项

1. **Tailwind v4 兼容性**：项目使用 Tailwind v4 (`@import "tailwindcss"`)，自定义配置方式与 v3 不同。如需扩展主题，请查阅 Tailwind v4 文档。

2. **Canvas 渲染性能**：修改 `FunctionCanvas.tsx` 时需谨慎，避免引入性能回归。

3. **无障碍性测试**：建议使用 NVDA (Windows) 或 VoiceOver (macOS) 进行实际测试。

4. **向后兼容**：所有修改应保持向后兼容，不影响现有功能。

---

> 方案完毕，可根据实际优先级和资源安排实施。
