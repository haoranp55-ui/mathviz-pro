// src/components/Layout/PolarSidebar.tsx
// 极坐标函数侧边栏内容（用于 React.lazy 懒加载）
import type { FC } from 'react';
import { PolarInput } from '../Controls/PolarInput';
import { PolarList } from '../Controls/PolarList';

export const PolarSidebar: FC = () => (
  <>
    <PolarInput />
    <PolarList />
  </>
);
