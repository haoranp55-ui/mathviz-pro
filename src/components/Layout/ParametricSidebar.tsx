// src/components/Layout/ParametricSidebar.tsx
// 参数化函数侧边栏内容（用于 React.lazy 懒加载）
import React from 'react';
import { ParametricInput } from '../Controls/ParametricInput';
import { ParametricList } from '../Controls/ParametricList';

export const ParametricSidebar: React.FC = () => (
  <>
    <ParametricInput />
    <ParametricList />
  </>
);
