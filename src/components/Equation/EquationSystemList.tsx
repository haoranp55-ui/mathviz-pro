// src/components/Equation/EquationSystemList.tsx
import { useState, type FC } from 'react';
import { Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { EquationSystemCard } from './EquationSystemCard';
import { EquationEmptyState } from './EquationEmptyState';

export const EquationSystemList: FC = () => {
  const equationSystems = useAppStore((state) => state.equationSystems);
  const clearAllEquationSystems = useAppStore((state) => state.clearAllEquationSystems);
  const [showConfirm, setShowConfirm] = useState(false);

  if (equationSystems.length === 0) {
    return <EquationEmptyState type="equation" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>方程组列表</span>
        <div className="flex-1 h-px bg-white/[0.04]" />
        <span className="text-[11px] bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05]">
          {equationSystems.length} 个
        </span>
        {showConfirm ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                clearAllEquationSystems();
                setShowConfirm(false);
              }}
              className="text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-0.5 rounded transition-all"
            >
              确认清空
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="text-[11px] text-gray-500 hover:text-gray-300 px-2 py-0.5 rounded transition-all"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="清空全部"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-3">
        {equationSystems.map((system) => (
          <EquationSystemCard key={system.id} system={system} />
        ))}
      </div>
    </div>
  );
};
