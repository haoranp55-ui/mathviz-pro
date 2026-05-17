// src/components/Layout/ImplicitSidebar.tsx
// 隐函数侧边栏内容（用于 React.lazy 懒加载）
import React from 'react';
import { ImplicitInput } from '../Controls/ImplicitInput';
import { ImplicitList } from '../Controls/ImplicitList';

export const ImplicitSidebar: React.FC = () => (
  <>
    <ImplicitInput />
    <ImplicitList />
  </>
);
