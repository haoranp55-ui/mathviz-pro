// src/components/Controls/ImplicitList.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ParameterSlider } from './ParameterSlider';

export const ImplicitList: React.FC = () => {
  const implicitFunctions = useAppStore(state => state.implicitFunctions);
  const removeImplicitFunction = useAppStore(state => state.removeImplicitFunction);
  const toggleImplicitVisibility = useAppStore(state => state.toggleImplicitVisibility);
  const toggleImplicitKeyPoints = useAppStore(state => state.toggleImplicitKeyPoints);
  const updateImplicitParameter = useAppStore(state => state.updateImplicitParameter);

  if (implicitFunctions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        暂无隐函数，请添加
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {implicitFunctions.map(fn => (
        <div
          key={fn.id}
          className="p-3 border-b border-gray-700/50 hover:bg-canvas-panelLight/30 transition-colors group"
        >
          {/* 表达式和操作按钮 */}
          <div className="flex items-center gap-2 mb-2">
            {/* 颜色标记 */}
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: fn.color }}
            />

            {/* 表达式 */}
            <span className="text-sm text-white font-mono truncate flex-1">
              {fn.expression}
            </span>

            {/* 操作按钮 - 统一样式 */}
            <div className="flex items-center gap-1">
              {/* 显示/隐藏 */}
              <button
                onClick={() => toggleImplicitVisibility(fn.id)}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                  fn.visible
                    ? 'text-green-400 hover:text-green-300'
                    : 'text-gray-500 bg-gray-500/20 hover:bg-gray-500/30'
                } opacity-0 group-hover:opacity-100`}
                title={fn.visible ? '隐藏函数' : '显示函数'}
              >
                {fn.visible ? '◉' : '○'}
              </button>

              {/* 关键点按钮 */}
              {!fn.error && (
                <button
                  onClick={() => toggleImplicitKeyPoints(fn.id)}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                    fn.showKeyPoints
                      ? 'text-blue-400 bg-blue-400/20 hover:bg-blue-400/30'
                      : 'text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 opacity-0 group-hover:opacity-100'
                  }`}
                  title={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注（极值点、边界点）'}
                >
                  ◆
                </button>
              )}

              {/* 删除 */}
              <button
                onClick={() => removeImplicitFunction(fn.id)}
                className="text-gray-500 hover:text-red-400 hover:bg-red-400/20 w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                title="删除函数"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {fn.error && (
            <div className="text-xs text-red-400 mb-2 p-2 bg-red-900/20 rounded">
              {fn.error}
            </div>
          )}

          {/* 参数滑钮 */}
          {fn.parameters.length > 0 && !fn.error && (
            <div className="space-y-2 mt-2">
              {fn.parameters.map(param => (
                <ParameterSlider
                  key={param.name}
                  parameter={param}
                  onChange={(value) => updateImplicitParameter(fn.id, param.name, value)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
