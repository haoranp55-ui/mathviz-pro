// src/components/Controls/FunctionList.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const FunctionList: React.FC = () => {
  const { functions, removeFunction, toggleFunctionVisibility } = useAppStore();

  if (functions.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm text-center">
        暂无函数，请添加
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="text-xs text-gray-500 px-2 mb-2">函数列表</div>
      <ul className="space-y-1">
        {functions.map((fn) => (
          <li
            key={fn.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 group"
          >
            {/* 颜色标识 */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: fn.color }}
            />

            {/* 可见性切换 */}
            <button
              onClick={() => toggleFunctionVisibility(fn.id)}
              className={`text-sm flex-1 text-left truncate ${
                fn.visible ? 'text-white' : 'text-gray-500 line-through'
              }`}
            >
              y = {fn.expression}
            </button>

            {/* 错误提示 */}
            {fn.error && (
              <span className="text-xs text-red-400" title={fn.error}>
                ⚠
              </span>
            )}

            {/* 删除按钮 */}
            <button
              onClick={() => removeFunction(fn.id)}
              className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
