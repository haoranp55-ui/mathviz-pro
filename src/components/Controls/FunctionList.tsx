// src/components/Controls/FunctionList.tsx
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const FunctionList: React.FC = () => {
  const { functions, removeFunction, toggleFunctionVisibility } = useAppStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, expression: string) => {
    navigator.clipboard.writeText(expression);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (functions.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 text-sm mb-2">暂无函数</div>
        <div className="text-gray-600 text-xs">输入表达式开始绘图</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="text-xs text-gray-500 px-2 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-curve-2"></span>
        函数列表
        <span className="ml-auto bg-canvas-panelLight px-2 py-0.5 rounded text-xs">
          {functions.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {functions.map((fn) => (
          <li
            key={fn.id}
            className="function-item flex items-center gap-2 px-3 py-2.5 rounded-lg list-item group cursor-pointer"
          >
            {/* 颜色指示条 */}
            <div
              className="w-1 h-6 rounded-full flex-shrink-0"
              style={{ backgroundColor: fn.color }}
            />

            {/* 函数表达式 */}
            <button
              onClick={() => toggleFunctionVisibility(fn.id)}
              className={`text-sm flex-1 text-left font-mono truncate ${
                fn.visible ? 'text-white' : 'text-gray-500 line-through'
              }`}
            >
              <span className="text-gray-500">y = </span>
              {fn.expression}
            </button>

            {/* 操作按钮组 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* 错误提示 */}
              {fn.error && (
                <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded" title={fn.error}>
                  错误
                </span>
              )}

              {/* 复制按钮 */}
              <button
                onClick={() => handleCopy(fn.id, fn.expression)}
                className={`text-gray-500 hover:text-accent-primary w-6 h-6 rounded flex items-center justify-center transition-all ${
                  copiedId === fn.id ? 'text-green-400' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="复制表达式"
              >
                {copiedId === fn.id ? '✓' : '⎘'}
              </button>

              {/* 删除按钮 */}
              <button
                onClick={() => removeFunction(fn.id)}
                className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                title="删除"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
