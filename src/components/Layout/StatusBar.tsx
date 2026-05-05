// src/components/Layout/StatusBar.tsx
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ZoomIn, MapPin, Layers } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const viewPort = useAppStore(state => state.viewPort);
  const functions = useAppStore(state => state.functions);
  const implicitFunctions = useAppStore(state => state.implicitFunctions);
  const parametricFunctions = useAppStore(state => state.parametricFunctions);
  const hoverPoint = useAppStore(state => state.interaction.hoverPoint);

  const defaultWidth = 20;
  const currentWidth = viewPort.xMax - viewPort.xMin;
  const zoomPercent = Math.round((defaultWidth / currentWidth) * 100);

  const visibleFunctions = functions.filter(f => f.visible).length;
  const visibleImplicit = implicitFunctions.filter(f => f.visible).length;
  const visibleParametric = parametricFunctions.filter(f => f.visible).length;
  const totalVisible = visibleFunctions + visibleImplicit + visibleParametric;
  const totalFunctions = functions.length + implicitFunctions.length + parametricFunctions.length;

  return (
    <footer className="h-7 bg-[#1e293b] border-t border-white/[0.08] flex items-center px-4 text-xs gap-5 select-none relative z-50">
      <span className="flex items-center gap-1.5 text-[#475569]">
        <ZoomIn className="w-3 h-3" />
        <span>缩放</span>
        <span className="text-[#94A3B8] font-mono font-medium">{zoomPercent}%</span>
      </span>

      <span className="flex items-center gap-1.5 text-[#475569]">
        <MapPin className="w-3 h-3" />
        <span>坐标</span>
        <span className="text-[#94A3B8] font-mono font-medium">
          ({hoverPoint?.x.toFixed(3) ?? '—'}, {hoverPoint?.y.toFixed(3) ?? '—'})
        </span>
      </span>

      <span className="flex items-center gap-1.5 text-[#475569]">
        <Layers className="w-3 h-3" />
        <span>函数</span>
        <span className="text-[#94A3B8] font-mono font-medium">{totalVisible}/{totalFunctions}</span>
      </span>

      <div className="ml-auto text-[11px] text-[#334155] font-mono tracking-wider">
        MathViz Pro
      </div>
    </footer>
  );
};
