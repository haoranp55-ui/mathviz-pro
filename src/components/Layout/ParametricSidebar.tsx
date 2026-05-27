// src/components/Layout/ParametricSidebar.tsx
// 参数化函数侧边栏内容（用于 React.lazy 懒加载）
import type { FC } from 'react';
import { ParametricInput } from '../Controls/ParametricInput';
import { ParametricList } from '../Controls/ParametricList';
import { AnimationPlayer } from '../Controls/AnimationPlayer';

export const ParametricSidebar: FC = () => (
  <>
    <ParametricInput />
    <ParametricList />
    <AnimationPlayer />
  </>
);
