// src/components/UI/EmptyState.tsx
import type { FC, ReactNode } from 'react';
import { Plus, Lightbulb, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  showQuickActions?: boolean;
  onQuickAdd?: () => void;
  onQuickExample?: () => void;
}

export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  showQuickActions = true,
  onQuickAdd,
  onQuickExample,
}) => {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
      <div className="panel-subtle p-6 flex flex-col items-center max-w-[260px] w-full animate-fade-in">
        {/* 图标容器 - 渐变背景 + 脉冲动画 */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 blur-sm animate-pulse-slow" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/15 flex items-center justify-center">
            {icon || (
              <Sparkles className="w-7 h-7 text-cyan-400/70" />
            )}
          </div>
        </div>

        {/* 标题 */}
        <div className="text-gray-200 text-sm mb-1.5 font-semibold text-center">
          {title}
        </div>

        {/* 副标题 */}
        {subtitle && (
          <div className="text-gray-500 text-xs text-center leading-relaxed mb-4">
            {subtitle}
          </div>
        )}

        {/* 快捷操作按钮 */}
        {showQuickActions && (
          <div className="flex flex-col gap-2 w-full">
            {onQuickAdd && (
              <button
                onClick={onQuickAdd}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/15 hover:border-cyan-500/30 transition-all duration-200 group"
              >
                <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-200" />
                添加函数
              </button>
            )}
            {onQuickExample && (
              <button
                onClick={onQuickExample}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-500/15 hover:border-violet-500/30 transition-all duration-200 group"
              >
                <Lightbulb className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-200" />
                查看示例
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 保留默认导出以兼容旧代码
export default EmptyState;
